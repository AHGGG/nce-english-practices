import feedparser
import random
import re
import asyncio
from typing import Optional, List, Dict
from functools import lru_cache

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
             print(f"RSS Parse Warning/Error for {url}: {feed.bozo_exception}")
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
                    "published": entry.get('published', '')
                }
                
        return None

# Singleton instance
rss_service = RSSService()
