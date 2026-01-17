import re
import ebooklib
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
from bs4 import BeautifulSoup
from ebooklib import epub
import mimetypes

from app.models.content_schemas import (
    ContentBundle,
    ContentBlock,
    BlockType,
    SourceType,
)
from app.services.content_providers.base import BaseContentProvider
import logging

logger = logging.getLogger(__name__)


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

        try:
            filepath = (self.EPUB_DIR / filename).resolve()

            # Security check: Ensure filepath is within EPUB_DIR
            if not filepath.is_relative_to(self.EPUB_DIR.resolve()):
                logger.warning("Path traversal attempt detected: %s", filename)
                return False
        except (ValueError, RuntimeError):
            # Handle cases where paths are on different drives or resolution fails
            return False

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
        except Exception:
            logger.exception("Error loading EPUB %s", filename)
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
            content_type = mimetypes.guess_type(image_path)[0] or "image/jpeg"
            return (self._cached_images[image_path], content_type)

        # Try matching by basename
        target_basename = Path(image_path).name
        for cached_path, data in self._cached_images.items():
            if Path(cached_path).name == target_basename:
                content_type = mimetypes.guess_type(cached_path)[0] or "image/jpeg"
                return (data, content_type)

        return None

    def _extract_articles(self, book: epub.EpubBook) -> List[Dict]:
        """Extract all articles/chapters from the book with image positions."""
        articles = []
        for item in book.get_items():
            if item.get_type() == ebooklib.ITEM_DOCUMENT:
                try:
                    content = item.get_content().decode("utf-8")
                    soup = BeautifulSoup(content, "xml")

                    # Get title
                    title_elem = soup.find(["h1", "h2", "h3", "title"])
                    title = (
                        title_elem.get_text(strip=True)
                        if title_elem
                        else item.get_name()
                    )

                    # Cleanup scripts/styles
                    for script in soup(["script", "style"]):
                        script.decompose()

                    # Extract images with their context (before removing them for text extraction)
                    images = []
                    for img in soup.find_all(["img", "image"]):
                        src = img.get("src") or img.get("xlink:href") or img.get("href")
                        if src:
                            # Resolve relative path
                            if src.startswith("../"):
                                src = src[3:]  # Remove leading ../
                            elif src.startswith("./"):
                                src = src[2:]

                            images.append(
                                {
                                    "path": src,
                                    "alt": img.get("alt", ""),
                                    "caption": self._find_caption(img),
                                }
                            )

                    # Get text content
                    text = soup.get_text(separator=" ", strip=True)

                    # Skip short/empty
                    if len(text) < 100:
                        continue

                    articles.append(
                        {
                            "title": title,
                            "full_text": text,
                            "source_id": item.get_name(),
                            "raw_images": images,
                            "raw_html": str(soup),  # Store for structured parsing
                            "is_toc": bool(soup.find(class_="calibre_feed_list")),
                        }
                    )
                except Exception:
                    continue
        return articles

    def _find_caption(self, img_tag) -> Optional[str]:
        """Try to find a caption near the image."""
        # Look for figcaption in parent figure
        parent = img_tag.find_parent("figure")
        if parent:
            figcaption = parent.find("figcaption")
            if figcaption:
                return figcaption.get_text(strip=True)

        # Look for next sibling that might be a caption
        next_sib = img_tag.find_next_sibling()
        if next_sib and next_sib.name in ["p", "span", "div"]:
            text = next_sib.get_text(strip=True)
            # Only use short text as caption
            if len(text) < 200:
                return text

        return None

    def _is_metadata_text(self, text: str) -> bool:
        """
        Check if text is metadata (date, author, etc.) rather than content.
        """
        # Date patterns: "Dec 19, 2025 12:54 AM", "January 1, 2025", etc.
        date_patterns = [
            r"^[A-Z][a-z]{2,8}\s+\d{1,2},?\s+\d{4}",  # "Dec 19, 2025" or "December 19, 2025"
            r"^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}",  # "12/19/2025"
            r"^\d{1,2}:\d{2}\s*(AM|PM)",  # "12:54 AM"
        ]
        for pattern in date_patterns:
            if re.match(pattern, text, re.IGNORECASE):
                return True

        # Very short text that looks like metadata
        if len(text) < 30:
            # Check if it's mostly a date/time string
            if re.search(r"\d{4}.*\d{1,2}:\d{2}", text):  # Contains year and time
                return True

        return False

    def _extract_structured_blocks(self, soup: BeautifulSoup) -> List[ContentBlock]:
        """
        Traverse DOM in order, extracting content blocks.
        Preserves original positions of images, paragraphs, and headings.
        """
        blocks = []
        body = soup.find("body") or soup
        seen_texts = set()  # Deduplicate repeated content

        for element in body.descendants:
            # Skip NavigableString and other non-tag elements
            if not hasattr(element, "name") or element.name is None:
                continue

            if element.name in ["h1", "h2", "h3", "h4"]:
                text = element.get_text(strip=True)
                if text and len(text) >= 3 and text not in seen_texts:
                    seen_texts.add(text)
                    blocks.append(
                        ContentBlock(
                            type=BlockType.HEADING,
                            text=text,
                            level=int(element.name[1]),
                        )
                    )
            elif element.name == "p":
                # Use separator to preserve whitespace between spans
                text = " ".join(element.get_text(separator=" ").split())
                if text and len(text) >= 10 and text not in seen_texts:
                    # Filter out date/metadata paragraphs
                    if self._is_metadata_text(text):
                        continue
                    seen_texts.add(text)
                    sentences = self._split_sentences_lenient(text)
                    if sentences:
                        # Check if this looks like a subtitle (short, no period, before main content)
                        if (
                            len(blocks) < 3
                            and len(text) < 100
                            and not text.endswith(".")
                        ):
                            blocks.append(
                                ContentBlock(type=BlockType.SUBTITLE, text=text)
                            )
                        else:
                            blocks.append(
                                ContentBlock(
                                    type=BlockType.PARAGRAPH,
                                    text=text,
                                    sentences=sentences,
                                )
                            )
            elif element.name in ["img", "image"]:
                src = (
                    element.get("src")
                    or element.get("xlink:href")
                    or element.get("href")
                )
                if src:
                    # Normalize path
                    if src.startswith("../"):
                        src = src[3:]
                    elif src.startswith("./"):
                        src = src[2:]
                    if src not in seen_texts:  # Dedupe images too
                        seen_texts.add(src)
                        blocks.append(
                            ContentBlock(
                                type=BlockType.IMAGE,
                                image_path=src,
                                alt=element.get("alt", ""),
                                caption=self._find_caption(element),
                            )
                        )
            elif element.name == "figure":
                # Handle figure with nested img
                img = element.find(["img", "image"])
                if img:
                    src = img.get("src") or img.get("xlink:href") or img.get("href")
                    if src:
                        if src.startswith("../"):
                            src = src[3:]
                        elif src.startswith("./"):
                            src = src[2:]
                        if src not in seen_texts:
                            seen_texts.add(src)
                            blocks.append(
                                ContentBlock(
                                    type=BlockType.IMAGE,
                                    image_path=src,
                                    alt=img.get("alt", ""),
                                    caption=self._find_caption(element),
                                )
                            )

        return blocks

    def _split_sentences_lenient(self, text: str) -> List[str]:
        """Split text into sentences with minimal filtering."""
        # Normalize whitespace
        text = re.sub(r"\s+", " ", text).strip()

        # Fix drop-cap issue: single letter + space + uppercase letters at start
        # Pattern: "T HE BIG" -> "THE BIG", "A NOTHER" -> "ANOTHER"
        text = re.sub(r"^([A-Z])\s+([A-Z]+)", r"\1\2", text)

        sentences = re.split(r"(?<=[.!?])\s+", text)
        # Only filter trivially invalid content
        return [s.strip() for s in sentences if len(s.strip()) >= 5]

    async def fetch(
        self, filename: str, chapter_index: int = 0, **kwargs: Any
    ) -> ContentBundle:
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
            raise IndexError(
                f"Chapter index {chapter_index} out of range (Total: {len(self._cached_articles)})"
            )

        article = self._cached_articles[chapter_index]

        # Parse HTML to extract structured blocks
        raw_html = article.get("raw_html", "")
        if raw_html:
            soup = BeautifulSoup(raw_html, "lxml-xml")
            blocks = self._extract_structured_blocks(soup)
        else:
            blocks = []

        # Construct ID: filename:chapter_index
        bundle_id = f"epub:{filename}:{chapter_index}"

        return ContentBundle(
            id=bundle_id,
            source_type=SourceType.EPUB,
            title=article["title"],
            full_text=article["full_text"],
            blocks=blocks,
            metadata={
                "filename": filename,
                "chapter_index": chapter_index,
                "total_chapters": len(self._cached_articles),
            },
        )
