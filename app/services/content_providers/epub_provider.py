import re
import ebooklib
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
from bs4 import BeautifulSoup
from ebooklib import epub
import mimetypes

from app.models.content_schemas import ContentBundle, ContentSentence, ContentImage, SourceType
from app.services.content_providers.base import BaseContentProvider


class EpubProvider(BaseContentProvider):
    """
    Provider for local EPUB files.
    Supports image extraction and serving.
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
        self._cached_images: Dict[str, bytes] = {}  # {image_path: bytes}
    
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
            
            # Extract and cache images
            self._cached_images = self._extract_images(book)
            
            # Extract articles with image position tracking
            self._cached_articles = self._extract_articles(book)
            return True
        except Exception as e:
            print(f"Error loading EPUB {filename}: {e}")
            return False
    
    def _extract_images(self, book: epub.EpubBook) -> Dict[str, bytes]:
        """Extract all images from the EPUB and cache them."""
        images = {}
        for item in book.get_items():
            if item.get_type() == ebooklib.ITEM_IMAGE:
                # Store with the item's file name as key
                images[item.get_name()] = item.get_content()
        return images
    
    def get_image(self, filename: str, image_path: str) -> Optional[Tuple[bytes, str]]:
        """
        Get image binary data and content type.
        
        Args:
            filename: EPUB filename
            image_path: Path to image within EPUB
            
        Returns:
            Tuple of (bytes, content_type) or None if not found
        """
        if not self._load_epub(filename):
            return None
        
        # Normalize path - images might be referenced with or without directory prefix
        # Try exact match first
        if image_path in self._cached_images:
            content_type = mimetypes.guess_type(image_path)[0] or 'image/jpeg'
            return (self._cached_images[image_path], content_type)
        
        # Try matching by basename
        target_basename = Path(image_path).name
        for cached_path, data in self._cached_images.items():
            if Path(cached_path).name == target_basename:
                content_type = mimetypes.guess_type(cached_path)[0] or 'image/jpeg'
                return (data, content_type)
        
        return None
            
    def _extract_articles(self, book: epub.EpubBook) -> List[Dict]:
        """Extract all articles/chapters from the book with image positions."""
        articles = []
        for item in book.get_items():
            if item.get_type() == ebooklib.ITEM_DOCUMENT:
                try:
                    content = item.get_content().decode('utf-8')
                    soup = BeautifulSoup(content, 'xml')
                    
                    # Get title
                    title_elem = soup.find(['h1', 'h2', 'h3', 'title'])
                    title = title_elem.get_text(strip=True) if title_elem else item.get_name()
                    
                    # Cleanup scripts/styles
                    for script in soup(["script", "style"]):
                        script.decompose()
                    
                    # Extract images with their context (before removing them for text extraction)
                    images = []
                    for img in soup.find_all(['img', 'image']):
                        src = img.get('src') or img.get('xlink:href') or img.get('href')
                        if src:
                            # Resolve relative path
                            if src.startswith('../'):
                                src = src[3:]  # Remove leading ../
                            elif src.startswith('./'):
                                src = src[2:]
                            
                            images.append({
                                'path': src,
                                'alt': img.get('alt', ''),
                                'caption': self._find_caption(img)
                            })
                    
                    # Get text content
                    text = soup.get_text(separator=' ', strip=True)
                    
                    # Skip short/empty
                    if len(text) < 100:
                        continue
                        
                    articles.append({
                        'title': title,
                        'full_text': text,
                        'source_id': item.get_name(),
                        'raw_images': images  # Store for later position mapping
                    })
                except Exception:
                    continue
        return articles
    
    def _find_caption(self, img_tag) -> Optional[str]:
        """Try to find a caption near the image."""
        # Look for figcaption in parent figure
        parent = img_tag.find_parent('figure')
        if parent:
            figcaption = parent.find('figcaption')
            if figcaption:
                return figcaption.get_text(strip=True)
        
        # Look for next sibling that might be a caption
        next_sib = img_tag.find_next_sibling()
        if next_sib and next_sib.name in ['p', 'span', 'div']:
            text = next_sib.get_text(strip=True)
            # Only use short text as caption
            if len(text) < 200:
                return text
        
        return None

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
    
    def _map_images_to_sentences(
        self, 
        sentences: List[str], 
        raw_images: List[Dict]
    ) -> List[ContentImage]:
        """
        Map images to sentence indices.
        Since we lose exact positions when extracting text, we distribute images
        evenly across the content. For better accuracy, EPUB HTML parsing could
        be enhanced to track character offsets.
        """
        if not raw_images or not sentences:
            return []
        
        content_images = []
        total_sentences = len(sentences)
        
        for i, img in enumerate(raw_images):
            # Distribute images evenly across sentences
            # Each image appears after a proportionally distributed sentence
            if total_sentences > 1:
                # Place images at roughly even intervals
                sentence_idx = min(
                    int((i + 1) * total_sentences / (len(raw_images) + 1)),
                    total_sentences - 1
                )
            else:
                sentence_idx = 0
            
            content_images.append(ContentImage(
                path=img['path'],
                sentence_index=sentence_idx,
                alt=img.get('alt'),
                caption=img.get('caption')
            ))
        
        return content_images

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
        
        # Map images to sentences
        content_images = self._map_images_to_sentences(
            clean_sentences,
            article.get('raw_images', [])
        )
        
        # Construct ID: filename:chapter_index
        bundle_id = f"epub:{filename}:{chapter_index}"
        
        return ContentBundle(
            id=bundle_id,
            source_type=SourceType.EPUB,
            title=article['title'],
            sentences=content_sentences,
            full_text=article['full_text'],
            images=content_images,
            metadata={
                "filename": filename,
                "chapter_index": chapter_index,
                "total_chapters": len(self._cached_articles)
            }
        )
