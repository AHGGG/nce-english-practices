import feedparser
import random
import re
import asyncio
from typing import Optional, List, Dict
from functools import lru_cache
import logging

logger = logging.getLogger(__name__)

class RSSService:
    """
    Service to fetch and parse RSS feeds, extracting learnable content.
    """
    
    def __init__(self):
        self._feed_cache: Dict[str, object] = {}
    
    async def fetch_feed(self, url: str) -> Optional[object]:
        """
        Fetch and parse an RSS feed.
        This is a blocking operation, so run in thread pool if needed.
        For now, feedparser is synchronous.
        """
        # Run feedparser in a thread since it does network I/O
        loop = asyncio.get_event_loop()
        feed = await loop.run_in_executor(None, feedparser.parse, url)
        
        if feed.bozo:
             # feedparser sets bozo=1 if there's an error, but often still returns data.
             # We log but continue if entries exist.
             logger.warning("RSS Parse Warning/Error for %s: %s", url, feed.bozo_exception)
             if not feed.entries:
                 return None
                 
        return feed

    def extract_sentences(self, text: str) -> List[str]:
        """
        Extract sentences from text using simple regex.
        Filters out short/garbage sentences.
        """
        # Remove HTML tags if any (basic cleaning)
        text = re.sub(r'<[^>]+>', '', text)
        
        # Split by sentence terminators
        raw_sentences = re.split(r'(?<=[.!?])\s+', text)
        
        # Filter sentences
        clean_sentences = []
        for s in raw_sentences:
            s = s.strip()
            # Must start with uppercase letter (heuristic for real sentence)
            # Must have reasonable length (e.g. 20-300 chars)
            if s and len(s) > 20 and len(s) < 300 and s[0].isupper():
                clean_sentences.append(s)
                
        return clean_sentences

    async def get_random_content(self, url: str) -> Optional[Dict]:
        """
        Get a random sentence from a random article in the feed.
        Returns:
            {
                "text": "The sentence...",
                "title": "Article Title",
                "link": "Article URL",
                "published": "Date"
            }
        """
        feed = await self.fetch_feed(url)
        if not feed or not feed.entries:
            return None
            
        # Pick a random entry (article)
        # Try up to 5 times to find an article with valid sentences
        for _ in range(5):
            entry = random.choice(feed.entries)
            
            # Combine title, summary, and content (if available) for better coverage
            content_text = entry.title + ". " + entry.get('summary', '')
            if 'content' in entry:
                for content_block in entry.content:
                    content_text += " " + content_block.value
            
            sentences = self.extract_sentences(content_text)
            
            if sentences:
                selected_sentence = random.choice(sentences)
                return {
                    "text": selected_sentence,
                    "title": entry.title,
                    "link": entry.link,
                    "published": entry.get('published', ''),
                    "raw_content": content_text  # Debug: full article text
                }
                
        return None

    async def get_sequential_content(
        self, 
        url: str, 
        article_idx: int = 0, 
        sentence_idx: int = 0
    ) -> Optional[Dict]:
        """
        Get a specific sentence from a specific article in the feed.
        Enables sequential reading: Article 0, Sentence 0 -> 1 -> ... -> Article 1
        
        Returns:
            {
                "text": "The sentence...",
                "title": "Article Title",
                "link": "Article URL",
                "published": "Date",
                "article_idx": 0,
                "sentence_idx": 0,
                "total_articles": 5,
                "total_sentences": 10,
                "has_next_sentence": True,
                "has_next_article": True
            }
        """
        feed = await self.fetch_feed(url)
        if not feed or not feed.entries:
            return None
        
        total_articles = len(feed.entries)
        
        # Validate article index
        if article_idx < 0 or article_idx >= total_articles:
            return None
        
        entry = feed.entries[article_idx]
        
        # Extract sentences from this article
        content_text = entry.title + ". " + entry.get('summary', '')
        if 'content' in entry:
            for content_block in entry.content:
                content_text += " " + content_block.value
        
        sentences = self.extract_sentences(content_text)
        total_sentences = len(sentences)
        
        if not sentences:
            # This article has no valid sentences, try next article
            if article_idx + 1 < total_articles:
                return await self.get_sequential_content(url, article_idx + 1, 0)
            return None
        
        # Validate sentence index
        if sentence_idx < 0 or sentence_idx >= total_sentences:
            # Move to next article
            if article_idx + 1 < total_articles:
                return await self.get_sequential_content(url, article_idx + 1, 0)
            return None
        
        return {
            "text": sentences[sentence_idx],
            "title": entry.title,
            "link": entry.link,
            "published": entry.get('published', ''),
            "article_idx": article_idx,
            "sentence_idx": sentence_idx,
            "total_articles": total_articles,
            "total_sentences": total_sentences,
            "has_next_sentence": sentence_idx + 1 < total_sentences,
            "has_next_article": article_idx + 1 < total_articles,
            "raw_content": content_text,  # Full article text for debugging
            "all_sentences": sentences  # All extracted sentences for debugging
        }

    async def get_feed_info(self, url: str) -> Optional[Dict]:
        """
        Get basic info about a feed (title, article count).
        """
        feed = await self.fetch_feed(url)
        if not feed:
            return None
        
        return {
            "title": feed.feed.get('title', 'Unknown Feed'),
            "total_articles": len(feed.entries) if feed.entries else 0
        }

# Singleton instance
rss_service = RSSService()
