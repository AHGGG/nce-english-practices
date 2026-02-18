import asyncio
import re
import feedparser
import httpx
from typing import Any, List
from app.config import settings
from app.models.content_schemas import ContentBundle, ContentSentence, SourceType
from app.services.content_providers.base import BaseContentProvider


class RssProvider(BaseContentProvider):
    """
    Provider for RSS Articles.
    """

    def __init__(self):
        self._feed_cache: dict = {}

    @property
    def source_type(self) -> SourceType:
        return SourceType.RSS

    def get_capabilities(self) -> dict[str, bool]:
        return {
            "has_catalog": False,
            "has_units": True,
            "has_text": True,
            "has_segments": True,
            "has_audio": False,
            "has_images": False,
            "has_timeline": False,
            "has_region_alignment": False,
            "supports_tts_fallback": True,
            "supports_highlight": True,
            "supports_sentence_study": True,
        }

    def _extract_sentences(self, text: str) -> List[str]:
        """Simple text segmentation."""
        text = re.sub(r"<[^>]+>", "", text)  # Remove HTML
        text = re.sub(r"\s+", " ", text)
        raw_sentences = re.split(r"(?<=[.!?])\s+", text)

        clean = []
        for s in raw_sentences:
            s = s.strip()
            if s and 20 <= len(s) <= 400 and s[0].isupper():
                clean.append(s)
        return clean

    async def _get_feed(self, url: str) -> Any:
        """
        Fetch feed using robust HTTP client to mimic browser.
        Fixes issues with 403 Forbidden (Cloudflare) and Timeouts.
        """
        if url in self._feed_cache:
            return self._feed_cache[url]

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "Accept": "application/rss+xml, application/xml, application/atom+xml, text/xml;q=0.9, */*;q=0.8",
        }

        try:
            proxies = settings.PROXY_URL if settings.PROXY_URL else None
            content = None

            # Attempt 1: Standard compliant request
            try:
                # Use 45s timeout (safe margin below Nginx default 60s)
                async with httpx.AsyncClient(
                    timeout=45.0,
                    follow_redirects=True,
                    proxy=proxies,
                    verify=settings.OUTBOUND_SSL_VERIFY,
                ) as client:
                    response = await client.get(url, headers=headers)
                    response.raise_for_status()
                    content = response.content
            except Exception as e:
                # Check if retryable (SSL, Timeout)
                is_ssl_error = (
                    "ssl" in str(e).lower() or "certificate" in str(e).lower()
                )
                is_conn_error = isinstance(
                    e,
                    (
                        httpx.ConnectError,
                        httpx.ReadTimeout,
                        httpx.ConnectTimeout,
                        httpx.NetworkError,
                    ),
                )

                if is_ssl_error or is_conn_error:
                    # Attempt 2: Relaxed Security
                    try:
                        async with httpx.AsyncClient(
                            timeout=45.0,
                            follow_redirects=True,
                            verify=settings.OUTBOUND_SSL_VERIFY,
                            proxy=proxies,
                        ) as client:
                            response = await client.get(url, headers=headers)
                            response.raise_for_status()
                            content = response.content
                    except Exception as e2:
                        raise ValueError(
                            f"Failed to fetch RSS feed {url} (after retry): {str(e2)}"
                        )
                else:
                    raise e

            # Parse content (run in executor to avoid blocking event loop)
            loop = asyncio.get_event_loop()
            feed = await loop.run_in_executor(None, feedparser.parse, content)

            # Save to cache
            self._feed_cache[url] = feed
            return feed

        except Exception as e:
            # Fallback to simple parse if network fails (might work for local files or lucky cases)
            # But mostly we want to raise the error to know what happened
            raise ValueError(f"Failed to fetch RSS feed {url}: {str(e)}")

    async def fetch(self, **kwargs: Any) -> ContentBundle:
        url = kwargs.get("url")
        article_index = kwargs.get("article_index", 0)
        if not url:
            raise ValueError("url is required")

        feed = await self._get_feed(url)

        if not feed.entries:
            raise ValueError(f"No entries found in RSS feed: {url}")

        if article_index < 0 or article_index >= len(feed.entries):
            raise IndexError(
                f"Article index {article_index} out of range (Total: {len(feed.entries)})"
            )

        entry = feed.entries[article_index]

        # Combine title, summary, and content
        content_text = entry.title + ". " + entry.get("summary", "")
        if "content" in entry:
            for content_block in entry.content:
                content_text += " " + content_block.value

        clean_sentences = self._extract_sentences(content_text)
        content_sentences = [ContentSentence(text=s) for s in clean_sentences]

        # Simple hash ID
        import hashlib

        entry_hash = hashlib.md5(entry.link.encode("utf-8")).hexdigest()

        return ContentBundle(
            id=f"rss:{entry_hash}",
            source_type=SourceType.RSS,
            title=entry.title,
            sentences=content_sentences,
            published_at=None,  # TBD: Parse date if needed
            source_url=entry.link,
            metadata={
                "feed_title": feed.feed.get("title", ""),
                "article_index": article_index,
                "total_articles": len(feed.entries),
                "capabilities": self.get_capabilities(),
            },
        )
