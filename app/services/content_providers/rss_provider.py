import asyncio
import re
import feedparser
from typing import Any, List, Optional
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
        text = re.sub(r'<[^>]+>', '', text) # Remove HTML
        text = re.sub(r'\s+', ' ', text)
        raw_sentences = re.split(r'(?<=[.!?])\s+', text)
        
        clean = []
        for s in raw_sentences:
            s = s.strip()
            if s and 20 <= len(s) <= 400 and s[0].isupper():
                clean.append(s)
        return clean
    
    async def _get_feed(self, url: str) -> Any:
        # Simple cache wrapper
        # In a real app, check TTL or use cachetools
        if url in self._feed_cache:
            return self._feed_cache[url]
        
        loop = asyncio.get_event_loop()
        feed = await loop.run_in_executor(None, feedparser.parse, url)
        self._feed_cache[url] = feed
        return feed

    async def fetch(self, url: str, article_index: int = 0, **kwargs: Any) -> ContentBundle:
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
             raise IndexError(f"Article index {article_index} out of range (Total: {len(feed.entries)})")

        entry = feed.entries[article_index]
        
        # Combine title, summary, and content
        content_text = entry.title + ". " + entry.get('summary', '')
        if 'content' in entry:
            for content_block in entry.content:
                content_text += " " + content_block.value

        clean_sentences = self._extract_sentences(content_text)
        content_sentences = [ContentSentence(text=s) for s in clean_sentences]
        
        # Simple hash ID
        import hashlib
        entry_hash = hashlib.md5(entry.link.encode('utf-8')).hexdigest()
        
        return ContentBundle(
            id=f"rss:{entry_hash}",
            source_type=SourceType.RSS,
            title=entry.title,
            sentences=content_sentences,
            published_at=None, # TBD: Parse date if needed
            source_url=entry.link,
            metadata={
                "feed_title": feed.feed.get('title', ''),
                "article_index": article_index,
                "total_articles": len(feed.entries)
            }
        )
