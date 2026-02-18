import re
import ebooklib
import time
import hashlib
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


# ============================================================
# Module-level EPUB Cache (Singleton Pattern)
# ============================================================
# This prevents re-parsing EPUB files on each API request.
# Cache entry: {filename: {"data": parsed_data, "mtime": file_mtime, "accessed": timestamp}}

_epub_cache: Dict[str, Dict[str, Any]] = {}
_CACHE_MAX_ENTRIES = 5
_CACHE_TTL_SECONDS = 300  # 5 minutes
_book_id_cache: Dict[str, Dict[str, Any]] = {}


def _get_cached_epub(filename: str, epub_dir: Path) -> Optional[Dict[str, Any]]:
    """Get cached EPUB data if valid (not expired, file not modified)."""
    if filename not in _epub_cache:
        return None

    entry = _epub_cache[filename]
    filepath = (epub_dir / filename).resolve()

    # Check if file still exists and hasn't been modified
    if not filepath.exists():
        del _epub_cache[filename]
        return None

    current_mtime = filepath.stat().st_mtime
    if entry["mtime"] != current_mtime:
        del _epub_cache[filename]
        return None

    # Check TTL
    if time.time() - entry["accessed"] > _CACHE_TTL_SECONDS:
        del _epub_cache[filename]
        return None

    # Update access time
    entry["accessed"] = time.time()
    return entry["data"]


def _set_cached_epub(filename: str, data: Dict[str, Any], mtime: float) -> None:
    """Store parsed EPUB in module-level cache with LRU eviction."""
    # LRU eviction if at capacity
    if len(_epub_cache) >= _CACHE_MAX_ENTRIES and filename not in _epub_cache:
        oldest = min(_epub_cache.items(), key=lambda x: x[1]["accessed"])
        del _epub_cache[oldest[0]]

    _epub_cache[filename] = {
        "data": data,
        "mtime": mtime,
        "accessed": time.time(),
    }


def _compute_book_id(filepath: Path) -> str:
    """Compute stable ID for an EPUB file based on its bytes."""
    cache_key = str(filepath.resolve())
    mtime = filepath.stat().st_mtime
    cached = _book_id_cache.get(cache_key)
    if cached and cached.get("mtime") == mtime:
        return cached["id"]

    hasher = hashlib.sha1()
    with filepath.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            hasher.update(chunk)

    book_id = hasher.hexdigest()[:16]
    _book_id_cache[cache_key] = {"mtime": mtime, "id": book_id}
    return book_id


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

    def get_capabilities(self) -> dict[str, bool]:
        return {
            "has_catalog": True,
            "has_units": True,
            "has_text": True,
            "has_segments": True,
            "has_audio": False,
            "has_images": True,
            "has_timeline": False,
            "has_region_alignment": False,
            "supports_tts_fallback": True,
            "supports_highlight": True,
            "supports_sentence_study": True,
        }

    def __init__(self):
        self._current_book: Optional[epub.EpubBook] = None
        self._current_filename: Optional[str] = None
        self._cached_articles: List[Dict] = []
        self._cached_images: Dict[str, bytes] = {}  # {image_path: bytes}

    def list_books(self) -> List[Dict[str, Any]]:
        """List available EPUB files in the resources directory."""
        books: List[Dict[str, Any]] = []
        epub_dir = self.EPUB_DIR

        if not epub_dir.exists():
            return books

        for f in epub_dir.glob("*.epub"):
            book_id = _compute_book_id(f)
            books.append(
                {
                    "id": book_id,
                    "filename": f.name,
                    "title": f.stem.replace(".", " ")
                    .replace("_", " ")
                    .replace("-", " ")
                    .title(),
                    "size_bytes": f.stat().st_size,
                }
            )

        return books

    def resolve_filename(self, filename_or_id: str) -> Optional[str]:
        """Resolve file reference (filename or stable id) to filename."""
        if not filename_or_id:
            return None

        filepath = (self.EPUB_DIR / filename_or_id).resolve()
        try:
            if filepath.is_relative_to(self.EPUB_DIR.resolve()) and filepath.exists():
                return filename_or_id
        except (ValueError, RuntimeError):
            pass

        for book in self.list_books():
            if book.get("id") == filename_or_id:
                return book.get("filename")

        return None

    def get_book_id(self, filename_or_id: str) -> Optional[str]:
        """Resolve file reference to stable EPUB item id."""
        filename = self.resolve_filename(filename_or_id)
        if not filename:
            return None

        filepath = self.EPUB_DIR / filename
        if not filepath.exists():
            return None
        return _compute_book_id(filepath)

    def get_articles(self, filename_or_id: str) -> List[Dict[str, Any]]:
        """
        Get extracted article payloads for a specific EPUB.

        Returns empty list if the EPUB cannot be loaded.
        """
        if not self._load_epub(filename_or_id):
            return []

        return list(self._cached_articles)

    def get_block_sentence_count(self, article: Dict[str, Any]) -> int:
        """
        Get sentence count from structured blocks (paragraphs only).

        Uses cached value from EPUB loading for performance and falls back
        to on-demand parsing for backward compatibility.
        """
        if "block_sentence_count" in article:
            return article["block_sentence_count"]

        raw_html = article.get("raw_html", "")
        if not raw_html:
            return len(self._split_sentences_lenient(article.get("full_text", "")))

        soup = BeautifulSoup(raw_html, "lxml-xml")
        blocks = self._extract_structured_blocks(soup)

        sentence_count = 0
        for block in blocks:
            if block.type.value == "paragraph" and block.sentences:
                sentence_count += len(block.sentences)

        return sentence_count

    def split_sentences(self, text: str) -> List[str]:
        """Public sentence splitter used by routers/services."""
        return self._split_sentences_lenient(text)

    def _load_epub(self, filename_or_id: str) -> bool:
        """Load EPUB file, using module-level cache if available."""
        filename = self.resolve_filename(filename_or_id)
        if not filename:
            return False

        # Check if already loaded in this instance
        if self._current_filename == filename and self._current_book:
            return True

        try:
            filepath = (self.EPUB_DIR / filename).resolve()

            # Security check: Ensure filepath is within EPUB_DIR
            if not filepath.is_relative_to(self.EPUB_DIR.resolve()):
                logger.warning("Path traversal attempt detected: %s", filename)
                return False
        except (ValueError, RuntimeError):
            return False

        if not filepath.exists():
            return False

        # Try module-level cache first
        cached = _get_cached_epub(filename, self.EPUB_DIR)
        if cached:
            self._current_filename = filename
            self._cached_articles = cached["articles"]
            self._cached_images = cached["images"]
            # Note: _current_book is not cached (large object, rarely needed after parsing)
            return True

        # Cache miss - parse EPUB
        try:
            book = epub.read_epub(str(filepath))
            self._current_book = book
            self._current_filename = filename

            # Extract and cache images
            self._cached_images = self._extract_images(book)

            # Extract articles with image position tracking
            self._cached_articles = self._extract_articles(book)

            # Store in module-level cache
            _set_cached_epub(
                filename,
                {"articles": self._cached_articles, "images": self._cached_images},
                filepath.stat().st_mtime,
            )

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

    def get_image(
        self, filename_or_id: str, image_path: str
    ) -> Optional[Tuple[bytes, str]]:
        """
        Get image binary data and content type.

        Args:
            filename: EPUB filename
            image_path: Path to image within EPUB

        Returns:
            Tuple of (bytes, content_type) or None if not found
        """
        if not self._load_epub(filename_or_id):
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
            if item.get_type() == ebooklib.ITEM_DOCUMENT or (
                item.get_type() == ebooklib.ITEM_UNKNOWN
                and item.get_name().lower().endswith((".html", ".xhtml", ".htm"))
            ):
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

                    # Determine if it's a TOC page (before cleanup)
                    is_toc = bool(soup.find(class_="calibre_feed_list"))

                    # Cleanup scripts/styles
                    for script in soup(["script", "style"]):
                        script.decompose()

                    # Cleanup Calibre generated navigation
                    for nav in soup.find_all(
                        class_=["calibre_navbar", "calibre_nav", "calibre_feed_list"]
                    ):
                        nav.decompose()

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

                    # Precompute block-based sentence count for consistency with article content
                    blocks = self._extract_structured_blocks(soup)
                    block_sentence_count = sum(
                        len(block.sentences)
                        for block in blocks
                        if block.type.value == "paragraph" and block.sentences
                    )

                    articles.append(
                        {
                            "title": title,
                            "full_text": text,
                            "source_id": item.get_name(),
                            "raw_images": images,
                            "raw_html": str(soup),  # Store for structured parsing
                            "is_toc": is_toc,
                            "block_sentence_count": block_sentence_count,  # Cached for performance
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

    async def fetch(self, **kwargs: Any) -> ContentBundle:
        """
        Fetch a specific chapter from an EPUB.

        Args:
            filename: EPUB filename in resources/epub/
            chapter_index: Index of the chapter to load (0-based)
        """
        filename = kwargs.get("filename")
        chapter_index = kwargs.get("chapter_index", 0)
        source_item_id = kwargs.get("source_item_id")
        file_ref = source_item_id or filename
        if not file_ref:
            raise ValueError("filename or source_item_id is required")

        if not self._load_epub(file_ref):
            raise FileNotFoundError(f"EPUB file not found: {file_ref}")

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
        stable_id = self.get_book_id(file_ref)
        if not stable_id:
            raise FileNotFoundError(f"Unable to resolve EPUB id: {file_ref}")
        bundle_id = f"epub:{stable_id}:{chapter_index}"

        return ContentBundle(
            id=bundle_id,
            source_type=SourceType.EPUB,
            title=article["title"],
            full_text=article["full_text"],
            blocks=blocks,
            metadata={
                "filename": self._current_filename,
                "source_item_id": stable_id,
                "chapter_index": chapter_index,
                "total_chapters": len(self._cached_articles),
                "capabilities": self.get_capabilities(),
            },
        )
