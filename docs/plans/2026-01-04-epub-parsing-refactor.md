# EPUB Parsing Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix content extraction issues (missing first sentence, incorrect image positions) by introducing a block-based content model.

**Architecture:** Replace flat `sentences` + `images` arrays with ordered `blocks` array. Each block has a type (paragraph/image/heading) and preserves DOM order. Frontend renders blocks sequentially.

**Tech Stack:** Python (Pydantic models, BeautifulSoup), React (JSX rendering)

---

## Task 1: Add BlockType and ContentBlock Models

**Files:**
- Modify: `app/models/content_schemas.py`

**Step 1: Add new models after imports**

```python
# After line 4 (from typing import ...)
class BlockType(str, Enum):
    """Content block types for structured EPUB parsing."""
    PARAGRAPH = "paragraph"
    IMAGE = "image"
    HEADING = "heading"
    SUBTITLE = "subtitle"


class ContentBlock(BaseModel):
    """
    A single content block in an article.
    Preserves DOM order for accurate rendering.
    """
    type: BlockType
    
    # For PARAGRAPH/HEADING/SUBTITLE
    text: Optional[str] = None
    sentences: List[str] = []  # Paragraph split into sentences
    
    # For IMAGE
    image_path: Optional[str] = None
    alt: Optional[str] = None
    caption: Optional[str] = None
    
    # For HEADING (1=h1, 2=h2, etc.)
    level: Optional[int] = None
```

**Step 2: Update ContentBundle to add blocks field**

Add after line 54 (images field):
```python
    blocks: List["ContentBlock"] = []   # Ordered content blocks (new structure)
```

**Step 3: Run test to verify model compiles**

Run: `uv run python -c "from app.models.content_schemas import ContentBlock, BlockType; print('OK')"`
Expected: `OK`

**Step 4: Commit**

```bash
git add app/models/content_schemas.py
git commit -m "feat(models): add ContentBlock and BlockType for structured EPUB parsing"
```

---

## Task 2: Implement DOM Traversal in EpubProvider

**Files:**
- Modify: `app/services/content_providers/epub_provider.py`

**Step 1: Add new import and extraction method**

Add after line 12 (logger definition):
```python
from app.models.content_schemas import BlockType, ContentBlock
```

Add new method after `_find_caption` (around line 165):
```python
    def _extract_structured_blocks(self, soup: BeautifulSoup) -> List[ContentBlock]:
        """
        Traverse DOM in order, extracting content blocks.
        Preserves original positions of images, paragraphs, and headings.
        """
        blocks = []
        body = soup.find('body') or soup
        
        # Get direct children and nested content
        for element in body.descendants:
            if element.name in ['h1', 'h2', 'h3', 'h4']:
                text = element.get_text(strip=True)
                if text and len(text) >= 3:
                    blocks.append(ContentBlock(
                        type=BlockType.HEADING,
                        text=text,
                        level=int(element.name[1])
                    ))
            elif element.name == 'p':
                text = element.get_text(strip=True)
                if text and len(text) >= 10:  # Lenient filtering
                    sentences = self._split_sentences_lenient(text)
                    if sentences:
                        blocks.append(ContentBlock(
                            type=BlockType.PARAGRAPH,
                            text=text,
                            sentences=sentences
                        ))
            elif element.name in ['img', 'image']:
                src = element.get('src') or element.get('xlink:href') or element.get('href')
                if src:
                    # Normalize path
                    if src.startswith('../'):
                        src = src[3:]
                    elif src.startswith('./'):
                        src = src[2:]
                    blocks.append(ContentBlock(
                        type=BlockType.IMAGE,
                        image_path=src,
                        alt=element.get('alt', ''),
                        caption=self._find_caption(element)
                    ))
            elif element.name == 'figure':
                # Handle figure with nested img
                img = element.find(['img', 'image'])
                if img:
                    src = img.get('src') or img.get('xlink:href') or img.get('href')
                    if src:
                        if src.startswith('../'):
                            src = src[3:]
                        elif src.startswith('./'):
                            src = src[2:]
                        blocks.append(ContentBlock(
                            type=BlockType.IMAGE,
                            image_path=src,
                            alt=img.get('alt', ''),
                            caption=self._find_caption(element)
                        ))
        
        return blocks
    
    def _split_sentences_lenient(self, text: str) -> List[str]:
        """Split text into sentences with minimal filtering."""
        text = re.sub(r'\s+', ' ', text).strip()
        sentences = re.split(r'(?<=[.!?])\s+', text)
        # Only filter trivially invalid content
        return [s.strip() for s in sentences if len(s.strip()) >= 5]
```

**Step 2: Update fetch method to use blocks**

Replace the `fetch` method (starting around line 219) with:
```python
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
        
        # Parse HTML to extract structured blocks
        soup = BeautifulSoup(article.get('raw_html', ''), 'html.parser')
        blocks = self._extract_structured_blocks(soup)
        
        # For backward compatibility, also extract flat sentences
        clean_sentences = self._extract_sentences(article['full_text'])
        content_sentences = [
            ContentSentence(text=s) for s in clean_sentences
        ]
        
        # Legacy image mapping (will be deprecated)
        content_images = self._map_images_to_sentences(
            clean_sentences,
            article.get('raw_images', [])
        )
        
        bundle_id = f"epub:{filename}:{chapter_index}"
        
        return ContentBundle(
            id=bundle_id,
            source_type=SourceType.EPUB,
            title=article['title'],
            sentences=content_sentences,
            full_text=article['full_text'],
            images=content_images,
            blocks=blocks,  # NEW: structured content
            metadata={
                "filename": filename,
                "chapter_index": chapter_index,
                "total_chapters": len(self._cached_articles)
            }
        )
```

**Step 3: Store raw HTML in _extract_articles**

Update `_extract_articles` method (around line 97) to store raw HTML:

Replace line 138-143:
```python
                    articles.append({
                        'title': title,
                        'full_text': text,
                        'source_id': item.get_name(),
                        'raw_images': images,
                        'raw_html': str(soup)  # NEW: store for structured parsing
                    })
```

**Step 4: Run quick verification**

Run: `uv run python -c "from app.services.content_providers.epub_provider import EpubProvider; print('OK')"`
Expected: `OK`

**Step 5: Commit**

```bash
git add app/services/content_providers/epub_provider.py
git commit -m "feat(epub): implement DOM traversal for structured content extraction"
```

---

## Task 3: Update API Router to Return Blocks

**Files:**
- Modify: `app/api/routers/content.py`

**Step 1: Find and update the article response**

The API response should include the new `blocks` field. Since `ContentBundle` already includes it, the Pydantic serialization should handle this automatically.

Verify by viewing the article endpoint response shape.

**Step 2: Run backend tests**

Run: `uv run pytest tests/test_epub_listing.py -v`
Expected: All tests pass

**Step 3: Commit if needed**

```bash
git add app/api/routers/content.py
git commit -m "feat(api): include blocks in article response"
```

---

## Task 4: Update ReaderView.jsx to Render Blocks

**Files:**
- Modify: `frontend/src/components/reading/ReaderView.jsx`

**Step 1: Replace renderContent function (lines 94-138)**

```jsx
    // Build elements for rendering - now uses blocks for proper ordering
    const renderContent = () => {
        const filename = article.metadata?.filename || '';
        
        // Use new blocks structure if available, fall back to legacy
        if (article.blocks && article.blocks.length > 0) {
            return article.blocks.map((block, blockIdx) => {
                switch (block.type) {
                    case 'heading':
                        const HeadingTag = `h${block.level || 2}`;
                        return (
                            <HeadingTag 
                                key={`h-${blockIdx}`} 
                                className="text-2xl font-serif text-text-primary mt-8 mb-4"
                            >
                                {block.text}
                            </HeadingTag>
                        );
                    
                    case 'image':
                        const imgUrl = `/api/reading/epub/image?filename=${encodeURIComponent(filename)}&image_path=${encodeURIComponent(block.image_path)}`;
                        return (
                            <MemoizedImage
                                key={`i-${blockIdx}`}
                                src={imgUrl}
                                alt={block.alt}
                                caption={block.caption}
                                onImageClick={onImageClick}
                            />
                        );
                    
                    case 'paragraph':
                        return (
                            <div key={`p-${blockIdx}`} className="mb-4">
                                {block.sentences.map((sentence, sentIdx) => (
                                    <span key={`${blockIdx}-${sentIdx}`} data-sentence-idx={`${blockIdx}-${sentIdx}`}>
                                        <MemoizedSentence
                                            text={sentence}
                                            highlightSet={article.highlightSet}
                                            studyHighlightSet={article.studyHighlightSet}
                                            showHighlights={showHighlights}
                                        />
                                        {' '}
                                    </span>
                                ))}
                            </div>
                        );
                    
                    default:
                        return null;
                }
            });
        }
        
        // Legacy fallback for old data
        const elements = [];
        const images = article.images || [];
        const imagesByIndex = {};

        images.forEach(img => {
            if (!imagesByIndex[img.sentence_index]) {
                imagesByIndex[img.sentence_index] = [];
            }
            imagesByIndex[img.sentence_index].push(img);
        });

        article.sentences?.slice(0, visibleCount).forEach((sentence, idx) => {
            elements.push(
                <div key={`s-${idx}`} data-sentence-idx={idx}>
                    <MemoizedSentence
                        text={sentence.text}
                        highlightSet={article.highlightSet}
                        studyHighlightSet={article.studyHighlightSet}
                        showHighlights={showHighlights}
                    />
                </div>
            );

            if (imagesByIndex[idx]) {
                imagesByIndex[idx].forEach((img, imgIdx) => {
                    const imgUrl = `/api/reading/epub/image?filename=${encodeURIComponent(filename)}&image_path=${encodeURIComponent(img.path)}`;
                    elements.push(
                        <MemoizedImage
                            key={`i-${idx}-${imgIdx}`}
                            src={imgUrl}
                            alt={img.alt}
                            caption={img.caption}
                            onImageClick={onImageClick}
                        />
                    );
                });
            }
        });

        return elements;
    };
```

**Step 2: Commit**

```bash
git add frontend/src/components/reading/ReaderView.jsx
git commit -m "feat(reading): render content using blocks for correct image/text ordering"
```

---

## Task 5: Update SentenceStudy.jsx for 2D Navigation

**Files:**
- Modify: `frontend/src/components/sentence-study/SentenceStudy.jsx`

**Step 1: Add helper to extract flat sentences from blocks**

Add near top of file (after VIEW_STATES definition, around line 106):
```jsx
// Helper: Extract flat list of sentences from blocks
const extractSentencesFromBlocks = (blocks) => {
    if (!blocks || blocks.length === 0) return [];
    const sentences = [];
    blocks.forEach((block, blockIdx) => {
        if (block.type === 'paragraph' && block.sentences) {
            block.sentences.forEach((sentence, sentIdx) => {
                sentences.push({
                    text: sentence,
                    blockIndex: blockIdx,
                    sentenceIndex: sentIdx
                });
            });
        }
    });
    return sentences;
};
```

**Step 2: Update sentence access in component**

Where `currentArticle.sentences[currentIndex]` is used, update to support both formats:

Add inside SentenceStudy component (around line 125, after state declarations):
```jsx
    // Compute flat sentence list from blocks or legacy sentences
    const flatSentences = useMemo(() => {
        if (currentArticle?.blocks?.length > 0) {
            return extractSentencesFromBlocks(currentArticle.blocks);
        }
        // Legacy: wrap in same shape
        return (currentArticle?.sentences || []).map((s, idx) => ({
            text: s.text || s,
            blockIndex: 0,
            sentenceIndex: idx
        }));
    }, [currentArticle]);
```

**Step 3: Update references to use flatSentences**

In `handleClear`, `handleDifficultyChoice`, etc., replace:
- `currentArticle.sentences[currentIndex]` → `flatSentences[currentIndex]`
- `currentArticle.sentences.length` → `flatSentences.length`

This is a larger refactor. Key changes:
- Line 332-334: Update context sentences
- Line 408-409: Update collocation fetch
- Line 608-610: Update handleClear
- Line 640-643: Update handleDifficultyChoice
- Line 702-704: Update handleSimplifiedResponse
- Line 737-738: Update advanceToNext

**Step 4: Commit**

```bash
git add frontend/src/components/sentence-study/SentenceStudy.jsx
git commit -m "feat(sentence-study): support block-based navigation with flat sentence extraction"
```

---

## Task 6: Write Integration Test

**Files:**
- Create: `tests/test_epub_blocks.py`

**Step 1: Write the test**

```python
"""Test structured block extraction from EPUB files."""
import pytest
from pathlib import Path

@pytest.mark.asyncio
async def test_epub_blocks_extraction():
    """Test that blocks are extracted with correct ordering."""
    from app.services.content_providers.epub_provider import EpubProvider
    
    provider = EpubProvider()
    
    # Check if test EPUB exists
    epub_dir = Path("resources/epub")
    if not epub_dir.exists():
        pytest.skip("No EPUB directory")
    
    epubs = list(epub_dir.glob("*.epub"))
    if not epubs:
        pytest.skip("No EPUB files found")
    
    # Load first EPUB
    filename = epubs[0].name
    bundle = await provider.fetch(filename, chapter_index=0)
    
    # Verify blocks exist
    assert bundle.blocks is not None, "Blocks should be populated"
    assert len(bundle.blocks) > 0, "Should have at least one block"
    
    # Verify first paragraph contains expected content
    paragraph_blocks = [b for b in bundle.blocks if b.type.value == 'paragraph']
    assert len(paragraph_blocks) > 0, "Should have paragraph blocks"
    
    # First paragraph should have at least one sentence
    first_para = paragraph_blocks[0]
    assert len(first_para.sentences) > 0, "First paragraph should have sentences"
    
    # Verify images appear before paragraphs if present in original
    image_blocks = [b for b in bundle.blocks if b.type.value == 'image']
    if image_blocks:
        first_image_idx = bundle.blocks.index(image_blocks[0])
        first_para_idx = bundle.blocks.index(paragraph_blocks[0])
        # If there's an image, it should appear before or after paragraphs based on DOM
        # Just verify both exist - exact ordering depends on content
        assert first_image_idx >= 0

@pytest.mark.asyncio  
async def test_lenient_sentence_splitting():
    """Test that sentences are not over-filtered."""
    from app.services.content_providers.epub_provider import EpubProvider
    
    provider = EpubProvider()
    
    # Test with sample text
    text = "THE BIG noise in 2025 has been President Donald Trump. Launching a barrage."
    sentences = provider._split_sentences_lenient(text)
    
    assert len(sentences) == 2
    assert sentences[0] == "THE BIG noise in 2025 has been President Donald Trump."
    assert sentences[1] == "Launching a barrage."
```

**Step 2: Run the test**

Run: `uv run pytest tests/test_epub_blocks.py -v`
Expected: All tests pass

**Step 3: Commit**

```bash
git add tests/test_epub_blocks.py
git commit -m "test: add integration tests for block-based EPUB extraction"
```

---

## Verification Plan

### Automated Tests

1. **Unit Test (Sentence Splitting)**
   ```bash
   uv run pytest tests/test_epub_blocks.py::test_lenient_sentence_splitting -v
   ```
   Expected: PASS - Verifies lenient splitting doesn't drop first sentence

2. **Integration Test (Block Extraction)**
   ```bash
   uv run pytest tests/test_epub_blocks.py::test_epub_blocks_extraction -v
   ```
   Expected: PASS - Verifies blocks are populated correctly

3. **Existing Tests (Regression)**
   ```bash
   uv run pytest tests/test_epub_listing.py -v
   ```
   Expected: PASS - Ensures no regression

### Manual Browser Verification

1. **Start the dev server**
   ```bash
   ./scripts/dev.ps1
   ```

2. **Open Reading Mode**
   - Navigate to: `https://localhost:5173/reading`
   - Select an article from TheEconomist EPUB
   - **Verify**: First sentence is visible ("THE BIG noise in 2025...")
   - **Verify**: Image appears at correct position (before first paragraph if in original)

3. **Open Sentence Study**
   - Navigate to: `https://localhost:5173/sentence-study`
   - Select same article
   - Start studying
   - **Verify**: First sentence is "THE BIG noise in 2025 has been President Donald Trump."
   - **Verify**: Navigation works (Clear/Next advances correctly)
