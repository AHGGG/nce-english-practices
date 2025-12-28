"""
EPUB Content Service - Extracts articles and sentences from EPUB files.
Designed for Economist weekly issues.
"""

import os
import re
from typing import Optional, List, Dict
from functools import lru_cache
from pathlib import Path

import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup


class EpubService:
    """Service to parse EPUB files and extract learnable content."""
    
    # Default EPUB directory
    EPUB_DIR = Path("resources/epub")
    
    def __init__(self):
        self._current_book: Optional[epub.EpubBook] = None
        self._current_articles: List[Dict] = []
        self._current_file: Optional[str] = None
    
    def list_available_epubs(self) -> List[str]:
        """List all EPUB files in the resources directory."""
        if not self.EPUB_DIR.exists():
            return []
        return [f.name for f in self.EPUB_DIR.glob("*.epub")]
    
    def load_epub(self, filename: str) -> bool:
        """
        Load an EPUB file and extract articles.
        
        Args:
            filename: EPUB filename (relative to resources/epub/)
            
        Returns:
            True if loaded successfully
        """
        filepath = self.EPUB_DIR / filename
        if not filepath.exists():
            print(f"EPUB file not found: {filepath}")
            return False
        
        # Skip if already loaded
        if self._current_file == filename and self._current_book:
            return True
        
        try:
            self._current_book = epub.read_epub(str(filepath))
            self._current_file = filename
            self._extract_articles()
            print(f"Loaded EPUB: {filename}, found {len(self._current_articles)} articles")
            return True
        except Exception as e:
            print(f"Error loading EPUB: {e}")
            return False
    
    def _extract_articles(self):
        """Extract articles from the loaded EPUB."""
        self._current_articles = []
        
        if not self._current_book:
            return
        
        for item in self._current_book.get_items():
            if item.get_type() == ebooklib.ITEM_DOCUMENT:
                try:
                    content = item.get_content().decode('utf-8')
                    soup = BeautifulSoup(content, 'lxml')
                    
                    # Get title from the document
                    title_elem = soup.find(['h1', 'h2', 'h3', 'title'])
                    title = title_elem.get_text(strip=True) if title_elem else item.get_name()
                    
                    # Get text content
                    # Remove script and style elements
                    for script in soup(["script", "style"]):
                        script.decompose()
                    
                    text = soup.get_text(separator=' ', strip=True)
                    
                    # Skip empty or very short documents
                    if len(text) < 100:
                        continue
                    
                    # Extract sentences
                    sentences = self._extract_sentences(text)
                    
                    if sentences:
                        self._current_articles.append({
                            'title': title,
                            'full_text': text,
                            'sentences': sentences,
                            'source_file': item.get_name()
                        })
                except Exception as e:
                    print(f"Error parsing item {item.get_name()}: {e}")
    
    def _extract_sentences(self, text: str) -> List[str]:
        """Extract clean sentences from text."""
        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Split by sentence terminators
        raw_sentences = re.split(r'(?<=[.!?])\s+', text)
        
        clean_sentences = []
        for s in raw_sentences:
            s = s.strip()
            # Filter: reasonable length, starts with uppercase
            if s and len(s) >= 30 and len(s) <= 400 and s[0].isupper():
                # Skip sentences that look like headers or metadata
                if not re.match(r'^(Chapter|Section|Part|\d+\.|•|\*)', s):
                    clean_sentences.append(s)
        
        return clean_sentences
    
    def get_article_count(self) -> int:
        """Get the number of articles in the loaded EPUB."""
        return len(self._current_articles)
    
    def get_article_titles(self) -> List[str]:
        """Get list of article titles."""
        return [a['title'] for a in self._current_articles]
    
    def get_sequential_content(
        self, 
        article_idx: int = 0, 
        sentence_idx: int = 0
    ) -> Optional[Dict]:
        """
        Get a specific sentence from a specific article.
        For sequential reading.
        
        Returns:
            {
                "text": "The sentence...",
                "title": "Article Title",
                "article_idx": 0,
                "sentence_idx": 0,
                "total_articles": 10,
                "total_sentences": 25,
                "has_next_sentence": True,
                "has_next_article": True,
                "raw_content": "Full article text..."
            }
        """
        if not self._current_articles:
            return None
        
        total_articles = len(self._current_articles)
        
        # Validate article index
        if article_idx < 0 or article_idx >= total_articles:
            return None
        
        article = self._current_articles[article_idx]
        sentences = article['sentences']
        total_sentences = len(sentences)
        
        if not sentences:
            # Skip to next article
            if article_idx + 1 < total_articles:
                return self.get_sequential_content(article_idx + 1, 0)
            return None
        
        # Validate sentence index
        if sentence_idx < 0 or sentence_idx >= total_sentences:
            # Move to next article
            if article_idx + 1 < total_articles:
                return self.get_sequential_content(article_idx + 1, 0)
            return None
        
        return {
            "text": sentences[sentence_idx],
            "title": article['title'],
            "article_idx": article_idx,
            "sentence_idx": sentence_idx,
            "total_articles": total_articles,
            "total_sentences": total_sentences,
            "has_next_sentence": sentence_idx + 1 < total_sentences,
            "has_next_article": article_idx + 1 < total_articles,
            "raw_content": article['full_text']
        }
    
    def get_random_content(self) -> Optional[Dict]:
        """Get a random sentence from a random article."""
        import random
        
        if not self._current_articles:
            return None
        
        article = random.choice(self._current_articles)
        if not article['sentences']:
            return None
        
        sentence = random.choice(article['sentences'])
        
        return {
            "text": sentence,
            "title": article['title'],
            "raw_content": article['full_text']
        }


# Singleton instance
epub_service = EpubService()
