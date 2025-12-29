import re
import ebooklib
from pathlib import Path
from typing import Optional, List, Dict, Any
from bs4 import BeautifulSoup
from ebooklib import epub

from app.models.content_schemas import ContentBundle, ContentSentence, SourceType
from app.services.content_providers.base import BaseContentProvider


class EpubProvider(BaseContentProvider):
    """
    Provider for local EPUB files.
    """
    
    # Default EPUB directory (same as legacy service)
    EPUB_DIR = Path("resources/epub")
    
    @property
    def source_type(self) -> SourceType:
        return SourceType.EPUB

    def __init__(self):
        self._current_book: Optional[epub.EpubBook] = None
        self._current_filename: Optional[str] = None
        self._cached_articles: List[Dict] = []
    
    def _load_epub(self, filename: str) -> bool:
        """Load EPUB file if not already loaded."""
        if self._current_filename == filename and self._current_book:
            return True
        
        filepath = self.EPUB_DIR / filename
        if not filepath.exists():
            return False
        
        try:
            book = epub.read_epub(str(filepath))
            self._current_book = book
            self._current_filename = filename
            self._cached_articles = self._extract_articles(book)
            return True
        except Exception as e:
            print(f"Error loading EPUB {filename}: {e}")
            return False
            
    def _extract_articles(self, book: epub.EpubBook) -> List[Dict]:
        """Extract all articles/chapters from the book."""
        articles = []
        for item in book.get_items():
            if item.get_type() == ebooklib.ITEM_DOCUMENT:
                try:
                    content = item.get_content().decode('utf-8')
                    soup = BeautifulSoup(content, 'lxml')
                    
                    # Get title
                    title_elem = soup.find(['h1', 'h2', 'h3', 'title'])
                    title = title_elem.get_text(strip=True) if title_elem else item.get_name()
                    
                    # Cleanup
                    for script in soup(["script", "style"]):
                        script.decompose()
                    
                    text = soup.get_text(separator=' ', strip=True)
                    
                    # Skip short/empty
                    if len(text) < 100:
                        continue
                        
                    articles.append({
                        'title': title,
                        'full_text': text,
                        'source_id': item.get_name()
                    })
                except Exception:
                    continue
        return articles

    def _extract_sentences(self, text: str) -> List[str]:
        """Text cleanup and segmentation."""
        # Simple regex segmentation (ported from legacy service)
        text = re.sub(r'\s+', ' ', text)
        raw_sentences = re.split(r'(?<=[.!?])\s+', text)
        
        clean = []
        for s in raw_sentences:
            s = s.strip()
            if s and 20 <= len(s) <= 400 and s[0].isupper():
                if not re.match(r'^(Chapter|Section|Part|\d+\.|•|\*)', s):
                    clean.append(s)
        return clean

    async def fetch(self, filename: str, chapter_index: int = 0, **kwargs: Any) -> ContentBundle:
        """
        Fetch a specific chapter from an EPUB.
        
        Args:
            filename: EPUB filename in resources/epub/
            chapter_index: Index of the chapter to load (0-based)
        """
        if not self._load_epub(filename):
            raise FileNotFoundError(f"EPUB file not found: {filename}")
            
        if not self._cached_articles:
            raise ValueError(f"No valid articles found in {filename}")
            
        if chapter_index < 0 or chapter_index >= len(self._cached_articles):
            raise IndexError(f"Chapter index {chapter_index} out of range (Total: {len(self._cached_articles)})")
            
        article = self._cached_articles[chapter_index]
        clean_sentences = self._extract_sentences(article['full_text'])
        
        # Convert to ContentSentence objects
        content_sentences = [
            ContentSentence(text=s) for s in clean_sentences
        ]
        
        # Construct ID: filename:chapter_index
        bundle_id = f"epub:{filename}:{chapter_index}"
        
        return ContentBundle(
            id=bundle_id,
            source_type=SourceType.EPUB,
            title=article['title'],
            sentences=content_sentences,
            full_text=article['full_text'],
            metadata={
                "filename": filename,
                "chapter_index": chapter_index,
                "total_chapters": len(self._cached_articles)
            }
        )
