import asyncio
import re
import feedparser
import httpx
from typing import Any, List
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
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                content = response.content

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

    async def fetch(
        self, url: str, article_index: int = 0, **kwargs: Any
    ) -> ContentBundle:
        """
        Fetch a specific article from an RSS Feed.

        Args:
            url: RSS Feed URL
            article_index: Index of the article to load (0-based)
        """
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
            },
        )
