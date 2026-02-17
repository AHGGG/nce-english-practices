"""
Content Analysis Service - Background Article Overview Generation

Analyzes EPUB articles using LLM and caches results in article_overview_cache table.
Runs automatically on server startup.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
from typing import Optional, List, Dict, Any
from pathlib import Path

from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.db import AsyncSessionLocal
from app.models.orm import ArticleOverviewCache, ArticleAnalysisFailure
from app.services.llm import llm_service
from app.services.content_providers.epub_provider import EpubProvider

logger = logging.getLogger(__name__)


# ============================================================
# Configuration
# ============================================================

MAX_CONCURRENCY = 5  # Semaphore limit for parallel LLM calls
MAX_RETRIES = 3  # Per-article retry count within a single run
CIRCUIT_BREAKER_THRESHOLD = 3  # Stop after N consecutive failures
MAX_PERSISTENT_FAILURES = (
    1  # Stop retrying after 1 failure event (which includes MAX_RETRIES attempts)
)
FIRST_WORDS_LIMIT = 3000  # First N words for context
LAST_WORDS_LIMIT = 1000  # Last N words for context

# Predefined topic labels - LLM must choose from this list
ALLOWED_TOPICS = [
    "Tech",
    "Business",
    "Politics",
    "Science",
    "Culture",
    "Health",
    "World",
    "Sports",
]


# ============================================================
# Content Analysis Service
# ============================================================


class ContentAnalysisService:
    """
    Background service for analyzing EPUB content and generating article overviews.
    Uses semaphore for concurrency control and circuit breaker for fault tolerance.
    """

    def __init__(self):
        self._semaphore: Optional[asyncio.Semaphore] = None
        self._consecutive_failures = 0
        self._is_running = False

    def _compute_hash(self, title: str) -> str:
        """Compute MD5 hash of article title for caching."""
        return hashlib.md5(title.encode("utf-8")).hexdigest()

    def _truncate_content(self, full_text: str) -> str:
        """
        Truncate content for LLM analysis.
        Strategy: First 300 words + Last 200 words (captures intro & conclusion).
        """
        words = full_text.split()
        total_words = len(words)

        if total_words <= FIRST_WORDS_LIMIT + LAST_WORDS_LIMIT:
            return full_text  # Short enough, use full text

        first_part = " ".join(words[:FIRST_WORDS_LIMIT])
        last_part = " ".join(words[-LAST_WORDS_LIMIT:])

        return f"{first_part}\n\n[...]\n\n{last_part}"

    async def _get_existing_hashes(self, title_hashes: List[str]) -> set:
        """Batch query to get already-cached article hashes."""
        if not title_hashes:
            return set()

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(ArticleOverviewCache.title_hash).where(
                    ArticleOverviewCache.title_hash.in_(title_hashes)
                )
            )
            return {row[0] for row in result.fetchall()}

    async def _get_persistent_failures(self, title_hashes: List[str]) -> Dict[str, int]:
        """
        Batch query to get failure counts for articles.
        Returns {title_hash: failure_count}.
        """
        if not title_hashes:
            return {}

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(
                    ArticleAnalysisFailure.title_hash,
                    ArticleAnalysisFailure.failure_count,
                ).where(ArticleAnalysisFailure.title_hash.in_(title_hashes))
            )
            return {row[0]: row[1] for row in result.fetchall()}

    async def _record_persistent_failure(self, title_hash: str, title: str, error: str):
        """
        Increment failure count for an article or create a new record.
        """
        async with AsyncSessionLocal() as db:
            # Upsert logic: Update failure_count = failure_count + 1 on conflict
            stmt = pg_insert(ArticleAnalysisFailure).values(
                title_hash=title_hash,
                title=title,
                failure_count=1,
                last_error=str(error),
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["title_hash"],
                set_={
                    "failure_count": ArticleAnalysisFailure.failure_count + 1,
                    "last_error": str(error),
                    "updated_at": func.now(),
                },
            )
            await db.execute(stmt)
            await db.commit()

    async def _clear_persistent_failure(self, title_hash: str):
        """
        Remove failure record on success.
        """
        from sqlalchemy import delete

        async with AsyncSessionLocal() as db:
            await db.execute(
                delete(ArticleAnalysisFailure).where(
                    ArticleAnalysisFailure.title_hash == title_hash
                )
            )
            await db.commit()

    async def _analyze_article(
        self, title: str, full_text: str
    ) -> Optional[Dict[str, Any]]:
        """
        Call LLM to generate article overview.
        Returns dict with summary_en, summary_zh, key_topics, difficulty_hint.
        """
        truncated = self._truncate_content(full_text)

        # Build the allowed topics list for the prompt
        topics_list = ", ".join(f'"{t}"' for t in ALLOWED_TOPICS)

        prompt = f"""Analyze this article excerpt and provide:
1. A concise English summary (2-3 sentences)
2. A Chinese translation of the summary
3. 1-3 topic labels from this EXACT list: [{topics_list}]
   - Choose ONLY from the list above, do not invent new labels
   - Select the most relevant 1-3 topics
4. A difficulty hint (one of: "Beginner", "Intermediate", "Advanced")

Title: {title}

Content:
{truncated}

Respond in this exact JSON format (no markdown, no code blocks):
{{"summary_en": "...", "summary_zh": "...", "key_topics": ["Tech", "Business"], "difficulty_hint": "Intermediate"}}"""

        messages = [
            {
                "role": "system",
                "content": "You are an expert content analyst. Respond only with valid JSON. For key_topics, you MUST only use labels from the provided list.",
            },
            {"role": "user", "content": prompt},
        ]

        try:
            response = await llm_service.chat_complete(messages, temperature=0.3)
            # Parse JSON response
            import json

            # Clean potential markdown code blocks
            cleaned = response.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1]
                if cleaned.endswith("```"):
                    cleaned = cleaned.rsplit("```", 1)[0]
            cleaned = cleaned.strip()

            data = json.loads(cleaned)

            # Validate and filter topics to only allowed ones
            raw_topics = data.get("key_topics", [])
            valid_topics = [t for t in raw_topics if t in ALLOWED_TOPICS]

            return {
                "summary_en": data.get("summary_en", ""),
                "summary_zh": data.get("summary_zh", ""),
                "key_topics": valid_topics,
                "difficulty_hint": data.get("difficulty_hint", "Intermediate"),
            }
        except Exception as e:
            logger.warning(f"LLM analysis failed for '{title[:50]}...': {e}")
            return None

    async def _process_article(
        self, title: str, full_text: str, title_hash: str
    ) -> bool:
        """
        Process a single article with retry logic.
        Returns True on success, False on failure.
        """
        last_error = None
        for attempt in range(MAX_RETRIES):
            try:
                async with self._semaphore:
                    result = await self._analyze_article(title, full_text)

                if result is None:
                    last_error = "LLM returned None"
                    await asyncio.sleep(2**attempt)  # Exponential backoff
                    continue

                # Upsert to database
                async with AsyncSessionLocal() as db:
                    stmt = pg_insert(ArticleOverviewCache).values(
                        title_hash=title_hash,
                        title=title,
                        summary_en=result["summary_en"],
                        summary_zh=result["summary_zh"],
                        key_topics=result["key_topics"],
                        difficulty_hint=result["difficulty_hint"],
                    )
                    stmt = stmt.on_conflict_do_nothing(index_elements=["title_hash"])
                    await db.execute(stmt)
                    await db.commit()

                # Success: clear any previous failure record
                await self._clear_persistent_failure(title_hash)

                logger.info(f"[Analysis] Cached: {title[:60]}...")
                return True

            except Exception as e:
                last_error = str(e)
                logger.warning(
                    f"[Analysis] Attempt {attempt + 1}/{MAX_RETRIES} failed: {e}"
                )
                await asyncio.sleep(2**attempt)

        # If we reach here, all retries failed
        logger.error(
            f"[Analysis] Persistent failure for '{title[:50]}...': {last_error}"
        )
        await self._record_persistent_failure(title_hash, title, last_error)
        return False

    async def analyze_all_epubs(self) -> Dict[str, Any]:
        """
        Main entry point: Scan all EPUBs and analyze uncached articles.
        Returns stats dict.
        """
        if self._is_running:
            logger.warning("[Analysis] Already running, skipping duplicate call")
            return {"status": "already_running"}

        self._is_running = True
        self._consecutive_failures = 0
        self._semaphore = asyncio.Semaphore(MAX_CONCURRENCY)

        stats = {
            "total_articles": 0,
            "already_cached": 0,
            "newly_analyzed": 0,
            "failed": 0,
            "circuit_broken": False,
        }

        try:
            epub_dir = EpubProvider.EPUB_DIR
            if not epub_dir.exists():
                logger.warning(f"[Analysis] EPUB directory not found: {epub_dir}")
                return stats

            # Collect all articles from all EPUBs
            articles_to_process: List[Dict[str, Any]] = []
            provider = EpubProvider()

            for epub_file in epub_dir.glob("*.epub"):
                articles_payload = provider.get_articles(epub_file.name)
                if not articles_payload:
                    continue

                for i, article in enumerate(articles_payload):
                    if article.get("is_toc"):
                        continue

                    title = article.get("title", f"Chapter {i + 1}")
                    full_text = article.get("full_text", "")

                    # Skip very short articles (likely non-content)
                    if len(full_text.split()) < 50:
                        continue

                    title_hash = self._compute_hash(title)
                    articles_to_process.append(
                        {
                            "title": title,
                            "full_text": full_text,
                            "title_hash": title_hash,
                        }
                    )

            stats["total_articles"] = len(articles_to_process)
            logger.info(f"[Analysis] Found {stats['total_articles']} articles to check")

            if not articles_to_process:
                return stats

            # Batch check which are already cached
            all_hashes = [a["title_hash"] for a in articles_to_process]
            existing = await self._get_existing_hashes(all_hashes)
            stats["already_cached"] = len(existing)

            # Filter to uncached only
            uncached = [
                a for a in articles_to_process if a["title_hash"] not in existing
            ]

            # Check for persistent failures (skip any that have failed completely once)
            if uncached:
                uncached_hashes = [a["title_hash"] for a in uncached]
                failures = await self._get_persistent_failures(uncached_hashes)

                # Filter out those with persistent failures
                valid_uncached = []
                skipped_count = 0
                for a in uncached:
                    f_count = failures.get(a["title_hash"], 0)
                    if f_count < MAX_PERSISTENT_FAILURES:
                        valid_uncached.append(a)
                    else:
                        skipped_count += 1

                if skipped_count > 0:
                    logger.warning(
                        f"[Analysis] Skipped {skipped_count} articles due to "
                        f"previous persistent failures"
                    )

                uncached = valid_uncached

            logger.info(
                f"[Analysis] {len(uncached)} articles need analysis, "
                f"{stats['already_cached']} already cached"
            )

            # Process uncached articles concurrently
            async def process_with_circuit_breaker(article: Dict[str, Any]) -> bool:
                """Wrapper that checks circuit breaker before processing."""
                if self._consecutive_failures >= CIRCUIT_BREAKER_THRESHOLD:
                    return False  # Skip if circuit breaker triggered

                success = await self._process_article(
                    article["title"],
                    article["full_text"],
                    article["title_hash"],
                )

                if success:
                    self._consecutive_failures = 0
                else:
                    self._consecutive_failures += 1

                return success

            # Run all tasks concurrently (semaphore limits actual parallelism)
            if uncached:
                results = await asyncio.gather(
                    *[process_with_circuit_breaker(article) for article in uncached],
                    return_exceptions=True,
                )

                for result in results:
                    if isinstance(result, Exception):
                        stats["failed"] += 1
                        logger.warning(f"[Analysis] Task exception: {result}")
                    elif result:
                        stats["newly_analyzed"] += 1
                    else:
                        stats["failed"] += 1

                # Check if circuit breaker was triggered
                if self._consecutive_failures >= CIRCUIT_BREAKER_THRESHOLD:
                    stats["circuit_broken"] = True
                    logger.error(
                        f"[Analysis] Circuit breaker triggered after "
                        f"{CIRCUIT_BREAKER_THRESHOLD} consecutive failures"
                    )

            logger.info(
                f"[Analysis] Complete: {stats['newly_analyzed']} new, "
                f"{stats['failed']} failed, {stats['already_cached']} cached"
            )
            return stats

        finally:
            self._is_running = False

    async def get_cached_overviews(
        self, titles: List[str]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Batch fetch cached overviews for a list of article titles.
        Returns {title_hash: {topics, difficulty_hint, summary_en, summary_zh}}.
        """
        if not titles:
            return {}

        hashes = {self._compute_hash(t): t for t in titles}

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(ArticleOverviewCache).where(
                    ArticleOverviewCache.title_hash.in_(list(hashes.keys()))
                )
            )
            rows = result.scalars().all()

        return {
            row.title_hash: {
                "key_topics": row.key_topics or [],
                "difficulty_hint": row.difficulty_hint or "",
                "summary_en": row.summary_en or "",
                "summary_zh": row.summary_zh or "",
            }
            for row in rows
        }


# Singleton instance
content_analysis_service = ContentAnalysisService()
