from fastapi import APIRouter, HTTPException, Response, Depends
from typing import Optional, Dict, Any
from bs4 import BeautifulSoup
from sqlalchemy import select, func

from app.api.routers.auth import get_current_user_id
from app.services.content_service import content_service
from app.models.content_schemas import SourceType
from app.models.orm import ReadingSession, SentenceLearningRecord, ReviewItem

router = APIRouter()


# ============================================================
# Reading Mode API Endpoints (Phase 2)
# ============================================================


def _get_block_sentence_count(article: Dict[str, Any], provider) -> int:
    """
    Get sentence count from structured blocks (paragraphs only).
    Uses cached value from EPUB loading for performance.
    Falls back to computation if cache is missing (for backwards compatibility).
    """
    # Use cached value if available (set during EPUB loading)
    if "block_sentence_count" in article:
        return article["block_sentence_count"]

    # Fallback: compute from raw_html
    raw_html = article.get("raw_html", "")
    if not raw_html:
        # Final fallback to lenient splitting if no HTML available
        return len(provider._split_sentences_lenient(article.get("full_text", "")))

    soup = BeautifulSoup(raw_html, "lxml-xml")
    blocks = provider._extract_structured_blocks(soup)

    sentence_count = 0
    for block in blocks:
        if block.type.value == "paragraph" and block.sentences:
            sentence_count += len(block.sentences)

    return sentence_count


@router.get("/api/reading/epub/books")
def list_epub_books():
    """
    List all available EPUB books in the resources directory.
    """
    try:
        from app.services.content_providers.epub_provider import EpubProvider

        books = []
        epub_dir = EpubProvider.EPUB_DIR

        if epub_dir.exists():
            for f in epub_dir.glob("*.epub"):
                books.append(
                    {
                        "filename": f.name,
                        "title": f.stem.replace(".", " ")
                        .replace("_", " ")
                        .replace("-", " ")
                        .title(),
                        "size_bytes": f.stat().st_size,
                    }
                )

        return {"books": books}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/reading/epub/list")
def list_epub_articles(filename: Optional[str] = None):
    """
    List all articles/chapters in an EPUB file.

    Args:
        filename: EPUB filename. If not provided, uses the first available EPUB.

    Returns: List of articles with titles and metadata.
    """
    try:
        # Import epub provider directly to access metadata
        from app.services.content_providers.epub_provider import EpubProvider

        provider = EpubProvider()

        # If no filename provided, use first available EPUB
        if not filename:
            epub_dir = EpubProvider.EPUB_DIR
            if epub_dir.exists():
                epub_files = list(epub_dir.glob("*.epub"))
                if epub_files:
                    filename = epub_files[0].name
                else:
                    return {"filename": None, "total_articles": 0, "articles": []}
            else:
                return {"filename": None, "total_articles": 0, "articles": []}

        # Load the EPUB
        if not provider._load_epub(filename):
            raise HTTPException(status_code=404, detail=f"EPUB not found: {filename}")

        # Return article list with metadata
        articles = []
        for i, article in enumerate(provider._cached_articles):
            full_text = article.get("full_text", "")

            # Filter out Section TOC pages (Calibre Generated)
            if article.get("is_toc"):
                continue

            # Use block-based sentence count to match how article content works
            sentence_count = _get_block_sentence_count(article, provider)

            if sentence_count < 3:
                continue

            # Get preview from first sentences of full_text
            preview_sentences = provider._split_sentences_lenient(full_text)
            preview = (
                preview_sentences[0] if preview_sentences else full_text[:200] + "..."
            )

            articles.append(
                {
                    "index": i,
                    "title": article.get("title", f"Chapter {i + 1}"),
                    "preview": preview,
                    "source_id": f"epub:{filename}:{i}",
                    "sentence_count": sentence_count,
                }
            )

        return {
            "filename": filename,
            "total_articles": len(articles),
            "articles": articles,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/reading/epub/list-with-status")
async def list_epub_articles_with_status(
    filename: Optional[str] = None, user_id: str = Depends(get_current_user_id)
):
    """
    List all articles with their reading/study status in a SINGLE request.
    Combines /api/reading/epub/list and /api/content/article-status for better performance.
    """
    try:
        from app.services.content_providers.epub_provider import EpubProvider
        from app.core.db import AsyncSessionLocal

        provider = EpubProvider()

        # If no filename provided, use first available EPUB
        if not filename:
            epub_dir = EpubProvider.EPUB_DIR
            if epub_dir.exists():
                epub_files = list(epub_dir.glob("*.epub"))
                if epub_files:
                    filename = epub_files[0].name
                else:
                    return {"filename": None, "total_articles": 0, "articles": []}
            else:
                return {"filename": None, "total_articles": 0, "articles": []}

        # Load the EPUB
        if not provider._load_epub(filename):
            raise HTTPException(status_code=404, detail=f"EPUB not found: {filename}")

        # Build valid articles list
        valid_articles = []
        for i, article in enumerate(provider._cached_articles):
            if article.get("is_toc"):
                continue
            sentence_count = _get_block_sentence_count(article, provider)
            if sentence_count < 3:
                continue

            full_text = article.get("full_text", "")
            preview_sentences = provider._split_sentences_lenient(full_text)
            preview = (
                preview_sentences[0] if preview_sentences else full_text[:200] + "..."
            )

            valid_articles.append(
                {
                    "index": i,
                    "title": article.get("title", f"Chapter {i + 1}"),
                    "preview": preview,
                    "source_id": f"epub:{filename}:{i}",
                    "sentence_count": sentence_count,
                }
            )

        if not valid_articles:
            return {"filename": filename, "total_articles": 0, "articles": []}

        source_ids = [a["source_id"] for a in valid_articles]

        # Batch Query 0: Fetch cached overviews (topics & difficulty)
        from app.services.content_analysis import content_analysis_service

        article_titles = [a["title"] for a in valid_articles]
        overviews = await content_analysis_service.get_cached_overviews(article_titles)

        # Create a title->hash mapping for lookup
        import hashlib

        title_to_hash = {
            t: hashlib.md5(t.encode("utf-8")).hexdigest() for t in article_titles
        }

        # Fetch status data with batch queries
        async with AsyncSessionLocal() as db:
            # Batch Query 1: Reading sessions
            reading_stats_result = await db.execute(
                select(
                    ReadingSession.source_id,
                    func.count(ReadingSession.id).label("session_count"),
                    func.max(ReadingSession.ended_at).label("last_read"),
                )
                .where(ReadingSession.user_id == user_id)
                .where(ReadingSession.source_id.in_(source_ids))
                .group_by(ReadingSession.source_id)
            )
            reading_stats = {
                row.source_id: {"count": row.session_count, "last_read": row.last_read}
                for row in reading_stats_result.fetchall()
            }

            # Batch Query 2: Study progress
            study_stats_result = await db.execute(
                select(
                    SentenceLearningRecord.source_id,
                    func.count(SentenceLearningRecord.id).label("studied_count"),
                    func.count(SentenceLearningRecord.id)
                    .filter(SentenceLearningRecord.initial_response == "clear")
                    .label("clear_count"),
                    func.count(SentenceLearningRecord.id)
                    .filter(SentenceLearningRecord.initial_response == "unclear")
                    .label("unclear_count"),
                    func.max(SentenceLearningRecord.sentence_index).label("max_index"),
                    func.max(SentenceLearningRecord.updated_at).label(
                        "last_studied_at"
                    ),
                )
                .where(SentenceLearningRecord.user_id == user_id)
                .where(SentenceLearningRecord.source_id.in_(source_ids))
                .group_by(SentenceLearningRecord.source_id)
            )
            study_stats = {
                row.source_id: {
                    "studied_count": row.studied_count or 0,
                    "clear_count": row.clear_count or 0,
                    "unclear_count": row.unclear_count or 0,
                    "max_index": row.max_index,
                    "last_studied_at": row.last_studied_at,
                }
                for row in study_stats_result.fetchall()
            }

        # Merge status into articles
        for article in valid_articles:
            source_id = article["source_id"]
            total_sentences = article["sentence_count"]

            reading = reading_stats.get(source_id, {"count": 0, "last_read": None})
            study = study_stats.get(
                source_id,
                {
                    "studied_count": 0,
                    "clear_count": 0,
                    "unclear_count": 0,
                    "max_index": None,
                    "last_studied_at": None,
                },
            )

            current_index = (
                (study["max_index"] + 1) if study["max_index"] is not None else 0
            )
            studied_count = study["studied_count"]

            # Determine status
            if current_index >= total_sentences and studied_count > 0:
                status = "completed"
            elif studied_count > 0:
                status = "in_progress"
            elif reading["count"] > 0:
                status = "read"
            else:
                status = "new"

            article["reading_sessions"] = reading["count"]
            article["last_read"] = (
                reading["last_read"].isoformat() if reading["last_read"] else None
            )
            article["last_studied_at"] = (
                study["last_studied_at"].isoformat()
                if study["last_studied_at"]
                else None
            )
            article["study_progress"] = {
                "current_index": current_index,
                "total": total_sentences,
                "studied_count": studied_count,
                "clear_count": study["clear_count"],
                "unclear_count": study["unclear_count"],
            }
            article["status"] = status

            # Add cached overview data (topics & difficulty)
            title_hash = title_to_hash.get(article["title"])
            if title_hash and title_hash in overviews:
                overview = overviews[title_hash]
                article["topics"] = overview["key_topics"]
                article["difficulty_hint"] = overview["difficulty_hint"]
            else:
                article["topics"] = []
                article["difficulty_hint"] = ""

        return {
            "filename": filename,
            "total_articles": len(valid_articles),
            "articles": valid_articles,
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/reading/article")
async def get_article_content(
    source_id: str,
    include_sentences: bool = True,
    book_code: Optional[str] = None,
    min_sequence: Optional[int] = None,
    max_sequence: Optional[int] = None,
    user_id: str = Depends(get_current_user_id),
):
    """
    Get full article content by source_id.

    Args:
        source_id: Format "epub:{filename}:{chapter_index}"
        include_sentences: Whether to include sentence segmentation
        book_code: Optional word book code (e.g., 'coca20000', 'cet4')
        min_sequence: Optional min sequence for highlights
        max_sequence: Optional max sequence for highlights
        user_id: User ID for fetching study-based highlights

    Returns: Article with title, full_text, sentences, highlights, study_highlights, and images.
    """
    try:
        # Parse source_id
        parts = source_id.split(":")
        if len(parts) < 3 or parts[0] != "epub":
            raise HTTPException(
                status_code=400,
                detail="Invalid source_id format. Expected: epub:{filename}:{index}",
            )

        filename = parts[1]
        chapter_index = int(parts[2])

        # Use ContentService to fetch
        bundle = await content_service.get_content(
            SourceType.EPUB, filename=filename, chapter_index=chapter_index
        )

        result = {
            "id": bundle.id,
            "source_type": bundle.source_type.value
            if hasattr(bundle.source_type, "value")
            else str(bundle.source_type),
            "title": bundle.title,
            "full_text": bundle.full_text,
            "metadata": bundle.metadata,
            "highlights": [],
            "study_highlights": [],  # Words looked up during Sentence Study
            # Structured content blocks (preserves DOM order for correct image/text placement)
            "blocks": [
                {
                    "type": b.type.value,
                    "text": b.text,
                    "sentences": b.sentences,
                    "image_path": b.image_path,
                    "alt": b.alt,
                    "caption": b.caption,
                    "level": b.level,
                }
                for b in bundle.blocks
            ],
        }

        # Identify vocabulary highlights if book_code provided
        if book_code:
            try:
                from app.services.word_list_service import word_list_service

                highlights = await word_list_service.identify_words_in_text(
                    text=bundle.full_text or "",
                    book_code=book_code,
                    user_id=user_id,
                    min_sequence=min_sequence,
                    max_sequence=max_sequence,
                )
                result["highlights"] = highlights
            except Exception as e:
                print(f"Highlight identification failed: {e}")
                # Continue without highlights

        # Fetch study-based highlights (words/phrases looked up during Sentence Study)
        # NOTE: study_highlights are GLOBAL (across all articles), not per-article
        try:
            from app.core.db import AsyncSessionLocal
            from sqlalchemy import select
            from app.models.orm import WordProficiency

            async with AsyncSessionLocal() as db:
                # 1. Fetch GLOBAL word/phrase clicks (across ALL articles for this user)
                global_words_stmt = (
                    select(
                        SentenceLearningRecord.word_clicks,
                        SentenceLearningRecord.phrase_clicks,
                    ).where(SentenceLearningRecord.user_id == user_id)
                    # No source_id filter - we want ALL words the user has looked up
                )
                global_records = await db.execute(global_words_stmt)

                all_words = set()
                all_phrases = set()
                for row in global_records.fetchall():
                    word_clicks, phrase_clicks = row
                    if word_clicks:
                        all_words.update(word_clicks)
                    if phrase_clicks:
                        all_phrases.update(phrase_clicks)

                # 2. Fetch article-specific unclear sentences
                unclear_stmt = (
                    select(
                        SentenceLearningRecord.sentence_index,
                        SentenceLearningRecord.initial_response,
                        SentenceLearningRecord.unclear_choice,
                        SentenceLearningRecord.interaction_log,
                    )
                    .where(SentenceLearningRecord.user_id == user_id)
                    .where(SentenceLearningRecord.source_id == source_id)
                    .where(SentenceLearningRecord.initial_response == "unclear")
                )
                unclear_records = await db.execute(unclear_stmt)

                unclear_sentences = []
                for row in unclear_records.fetchall():
                    (
                        sentence_index,
                        initial_response,
                        unclear_choice,
                        interaction_log,
                    ) = row
                    # Determine max_simplify_stage from interaction_log if available
                    max_stage = 0
                    if interaction_log:
                        for event in interaction_log:
                            if event.get("action") == "simplify_stage":
                                stage = event.get("stage", 0)
                                if stage > max_stage:
                                    max_stage = stage
                    unclear_sentences.append(
                        {
                            "sentence_index": sentence_index,
                            "unclear_choice": unclear_choice,
                            "max_simplify_stage": max_stage,
                        }
                    )

                # 3. Fetch mastered words to exclude from study_highlights
                all_study_words = all_words | all_phrases
                if all_study_words:
                    mastered_stmt = (
                        select(WordProficiency.word)
                        .where(WordProficiency.user_id == user_id)
                        .where(WordProficiency.status == "mastered")
                    )
                    mastered_result = await db.execute(mastered_stmt)
                    mastered_words = {
                        row[0].lower() for row in mastered_result.fetchall()
                    }

                    # Exclude mastered words from study highlights
                    all_study_words = {
                        w for w in all_study_words if w.lower() not in mastered_words
                    }

                # Combine and return
                result["study_highlights"] = list(all_study_words)
                result["unclear_sentences"] = unclear_sentences
        except Exception as e:
            import traceback

            traceback.print_exc()
            print(f"Study highlights fetch failed: {e}")
            result["unclear_sentences"] = []  # Ensure the field exists even on error
            # Continue without study highlights

        if include_sentences:
            # For EPUB, extract sentences from blocks; for other providers, use bundle.sentences
            if bundle.blocks:
                sentences = []
                for block in bundle.blocks:
                    if block.type.value == "paragraph" and block.sentences:
                        sentences.extend(
                            [
                                {"index": len(sentences) + i, "text": s}
                                for i, s in enumerate(block.sentences)
                            ]
                        )
                result["sentences"] = sentences
                result["sentence_count"] = len(sentences)
            else:
                result["sentences"] = [
                    {"index": i, "text": s.text} for i, s in enumerate(bundle.sentences)
                ]
                result["sentence_count"] = len(bundle.sentences)

        return result

    except (IndexError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/reading/epub/image")
def get_epub_image(filename: str, image_path: str):
    """
    Serve an image from an EPUB file.

    Args:
        filename: EPUB filename (e.g., 'TheEconomist.2025.12.27.epub')
        image_path: Path to image within the EPUB

    Returns: Binary image data with appropriate Content-Type
    """
    try:
        from app.services.content_providers.epub_provider import EpubProvider

        provider = EpubProvider()

        result = provider.get_image(filename, image_path)
        if result is None:
            raise HTTPException(
                status_code=404, detail=f"Image not found: {image_path}"
            )

        image_data, content_type = result
        return Response(
            content=image_data,
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=86400"  # Cache for 24 hours
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Unified Article Status API (Cross-Mode Integration)
# ============================================================


@router.get("/api/content/article-status")
async def get_article_status(
    filename: str, user_id: str = Depends(get_current_user_id)
):
    """
    Get combined reading and study status for all articles in an EPUB.

    Optimized with batch queries (O(1) instead of O(N) per article).

    Returns unified status for each article:
    - reading_sessions: number of reading sessions
    - last_read: timestamp of last reading session
    - study_progress: { current_index, total, clear_count, unclear_count }
    - has_review_items: whether article has active review items
    - status: "new" | "read" | "in_progress" | "completed"
    """
    try:
        from app.services.content_providers.epub_provider import EpubProvider
        from app.core.db import AsyncSessionLocal

        provider = EpubProvider()

        # Load the EPUB to get articles
        if not provider._load_epub(filename):
            raise HTTPException(status_code=404, detail=f"EPUB not found: {filename}")

        # Build list of valid articles and their source_ids
        valid_articles = []
        for i, article in enumerate(provider._cached_articles):
            if article.get("is_toc"):
                continue
            sentence_count = _get_block_sentence_count(article, provider)
            if sentence_count < 3:
                continue
            source_id = f"epub:{filename}:{i}"
            valid_articles.append(
                {
                    "index": i,
                    "title": article.get("title", f"Chapter {i + 1}"),
                    "source_id": source_id,
                    "sentence_count": sentence_count,
                }
            )

        if not valid_articles:
            return {"filename": filename, "user_id": user_id, "articles": []}

        source_ids = [a["source_id"] for a in valid_articles]

        async with AsyncSessionLocal() as db:
            # Batch Query 1: Reading sessions stats (count + last_read) grouped by source_id
            reading_stats_result = await db.execute(
                select(
                    ReadingSession.source_id,
                    func.count(ReadingSession.id).label("session_count"),
                    func.max(ReadingSession.ended_at).label("last_read"),
                )
                .where(ReadingSession.user_id == user_id)
                .where(ReadingSession.source_id.in_(source_ids))
                .group_by(ReadingSession.source_id)
            )
            reading_stats = {
                row.source_id: {"count": row.session_count, "last_read": row.last_read}
                for row in reading_stats_result.fetchall()
            }

            # Batch Query 2: Study progress grouped by source_id
            study_stats_result = await db.execute(
                select(
                    SentenceLearningRecord.source_id,
                    func.count(SentenceLearningRecord.id).label("studied_count"),
                    func.count(SentenceLearningRecord.id)
                    .filter(SentenceLearningRecord.initial_response == "clear")
                    .label("clear_count"),
                    func.count(SentenceLearningRecord.id)
                    .filter(SentenceLearningRecord.initial_response == "unclear")
                    .label("unclear_count"),
                    func.max(SentenceLearningRecord.sentence_index).label("max_index"),
                    func.max(SentenceLearningRecord.updated_at).label(
                        "last_studied_at"
                    ),
                )
                .where(SentenceLearningRecord.user_id == user_id)
                .where(SentenceLearningRecord.source_id.in_(source_ids))
                .group_by(SentenceLearningRecord.source_id)
            )
            study_stats = {
                row.source_id: {
                    "studied_count": row.studied_count or 0,
                    "clear_count": row.clear_count or 0,
                    "unclear_count": row.unclear_count or 0,
                    "max_index": row.max_index,
                    "last_studied_at": row.last_studied_at,
                }
                for row in study_stats_result.fetchall()
            }

            # Batch Query 3: Review items count grouped by source_id
            review_stats_result = await db.execute(
                select(
                    ReviewItem.source_id,
                    func.count(ReviewItem.id).label("review_count"),
                )
                .where(ReviewItem.user_id == user_id)
                .where(ReviewItem.source_id.in_(source_ids))
                .group_by(ReviewItem.source_id)
            )
            review_stats = {
                row.source_id: row.review_count
                for row in review_stats_result.fetchall()
            }

        # Build response using batch query results
        articles = []
        for article in valid_articles:
            source_id = article["source_id"]
            total_sentences = article["sentence_count"]

            # Get stats from batch results (default to empty if not found)
            reading = reading_stats.get(source_id, {"count": 0, "last_read": None})
            study = study_stats.get(
                source_id,
                {
                    "studied_count": 0,
                    "clear_count": 0,
                    "unclear_count": 0,
                    "max_index": None,
                    "last_studied_at": None,
                },
            )
            review_count = review_stats.get(source_id, 0)

            current_index = (
                (study["max_index"] + 1) if study["max_index"] is not None else 0
            )
            studied_count = study["studied_count"]

            # Determine status
            if current_index >= total_sentences and studied_count > 0:
                status = "completed"
            elif studied_count > 0:
                status = "in_progress"
            elif reading["count"] > 0:
                status = "read"
            else:
                status = "new"

            articles.append(
                {
                    "index": article["index"],
                    "title": article["title"],
                    "source_id": source_id,
                    "sentence_count": total_sentences,
                    "reading_sessions": reading["count"],
                    "last_read": reading["last_read"].isoformat()
                    if reading["last_read"]
                    else None,
                    "last_studied_at": study["last_studied_at"].isoformat()
                    if study["last_studied_at"]
                    else None,
                    "study_progress": {
                        "current_index": current_index,
                        "total": total_sentences,
                        "studied_count": studied_count,
                        "clear_count": study["clear_count"],
                        "unclear_count": study["unclear_count"],
                    },
                    "has_review_items": review_count > 0,
                    "status": status,
                }
            )

        return {"filename": filename, "user_id": user_id, "articles": articles}

    except HTTPException:
        raise
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Unified Audio Player API (Podcast + Audiobook)
# ============================================================


@router.get("/api/content/player/{source_type}/{content_id}")
async def get_player_content(
    source_type: str,
    content_id: str,
    track: int = 0,
    user_id: str = Depends(get_current_user_id),
):
    """
    Get unified content bundle for audio player.

    Supports both podcast episodes (with transcription) and audiobooks.
    Returns ContentBundle format compatible with AudioContentRenderer.

    Args:
        source_type: "podcast" or "audiobook"
        content_id: Episode ID (podcast) or book ID (audiobook)
        track: Track index for audiobooks (default 0)

    Returns:
        ContentBundle with audio_url and time-aligned segments
    """
    from app.models.content_schemas import ContentBundle, ContentBlock, BlockType

    if source_type == "podcast":
        return await _get_podcast_player_content(int(content_id), user_id)
    elif source_type == "audiobook":
        return await _get_audiobook_player_content(content_id, track)
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid source_type: {source_type}. Must be 'podcast' or 'audiobook'",
        )


async def _get_podcast_player_content(episode_id: int, user_id: str):
    """Get podcast episode content for unified player."""
    from app.core.db import AsyncSessionLocal
    from app.models.podcast_orm import PodcastEpisode, PodcastFeed, UserEpisodeState
    from app.models.content_schemas import (
        ContentBundle,
        ContentBlock,
        BlockType,
        SourceType,
    )

    async with AsyncSessionLocal() as db:
        # Get episode with feed info
        stmt = (
            select(PodcastEpisode, PodcastFeed)
            .join(PodcastFeed, PodcastEpisode.feed_id == PodcastFeed.id)
            .where(PodcastEpisode.id == episode_id)
        )
        result = await db.execute(stmt)
        row = result.first()

        if not row:
            raise HTTPException(status_code=404, detail="Episode not found")

        episode, feed = row

        # Check if transcription is available
        if episode.transcript_status != "completed" or not episode.transcript_segments:
            raise HTTPException(
                status_code=400,
                detail="Transcription not available. Please generate transcription first.",
            )

        # Get user playback state
        state_stmt = select(UserEpisodeState).where(
            UserEpisodeState.user_id == user_id,
            UserEpisodeState.episode_id == episode_id,
        )
        state_result = await db.execute(state_stmt)
        user_state = state_result.scalar_one_or_none()

        # Convert transcript_segments to ContentBlocks
        blocks = []
        for seg in episode.transcript_segments:
            block = ContentBlock(
                type=BlockType.AUDIO_SEGMENT,
                text=seg.get("text", ""),
                sentences=[seg.get("text", "")],
                start_time=seg.get("start_time", 0.0),
                end_time=seg.get("end_time", 0.0),
            )
            blocks.append(block)

        # Build full text
        full_text = " ".join(seg.get("text", "") for seg in episode.transcript_segments)

        return ContentBundle(
            id=f"podcast:{episode_id}",
            source_type=SourceType.PODCAST,
            title=episode.title,
            audio_url=episode.audio_url,  # Use original URL (browser can access directly)
            blocks=blocks,
            full_text=full_text,
            metadata={
                "episode_id": episode_id,
                "feed_id": feed.id,
                "feed_title": feed.title,
                "description": episode.description,
                "duration_seconds": episode.duration_seconds,
                "published_at": episode.published_at.isoformat()
                if episode.published_at
                else None,
                "image_url": episode.image_url or feed.image_url,
                "current_position": user_state.current_position_seconds
                if user_state
                else 0.0,
                "is_finished": user_state.is_finished if user_state else False,
            },
        )


async def _get_audiobook_player_content(book_id: str, track_index: int):
    """Get audiobook content for unified player."""
    from app.services.content_providers.audiobook_provider import AudiobookProvider

    provider = AudiobookProvider()

    try:
        bundle = await provider.fetch(book_id=book_id, track_index=track_index)
        return bundle
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
