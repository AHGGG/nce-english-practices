# EPUB Parsing Refactor Design

> **Date**: 2026-01-04  
> **Status**: Approved  
> **Goal**: Fix content extraction issues (missing first sentence, incorrect image positions)

## Problem Statement

Two issues were identified in the current EPUB parsing implementation:

1. **Missing Content**: The first sentence "THE BIG noise in 2025 has been President Donald Trump." is not extracted
2. **Wrong Image Position**: Images that appear at the start of articles are placed in the middle of extracted content

### Root Causes

1. `_extract_sentences()` has overly strict filtering (20-400 char length, must start uppercase)
2. `get_text()` flattens HTML structure, losing positional information
3. `_map_images_to_sentences()` distributes images evenly instead of preserving DOM order

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Structured Refactor | Fix root cause, not just patch symptoms |
| Data Model | Unified ContentBlock | Naturally represents mixed content |
| Sentence Filtering | Lenient Mode | Preserve all meaningful sentences |
| Backward Compatibility | One-time Migration | Clean break, update all consumers |
| Sentence Indexing | 2D Index (block, sentence) | Preserves structural awareness |

---

## New Data Model

### BlockType Enum

```python
class BlockType(str, Enum):
    PARAGRAPH = "paragraph"    # Text paragraphs (contains sentences)
    IMAGE = "image"            # Images/figures
    HEADING = "heading"        # h1-h6 headings
    SUBTITLE = "subtitle"      # Subheadings/lead text
```

### ContentBlock Model

```python
class ContentBlock(BaseModel):
    type: BlockType
    
    # For PARAGRAPH/HEADING/SUBTITLE
    text: Optional[str] = None
    sentences: List[str] = []  # Split sentences for paragraphs
    
    # For IMAGE
    image_path: Optional[str] = None
    alt: Optional[str] = None
    caption: Optional[str] = None
    
    # For HEADING (1=h1, 2=h2, etc.)
    level: Optional[int] = None
```

### Updated ContentBundle

```python
class ContentBundle(BaseModel):
    id: str
    source_type: SourceType
    title: str
    
    # NEW: Ordered content blocks (replaces sentences + images)
    blocks: List[ContentBlock] = []
    
    # Keep for compatibility/convenience
    full_text: Optional[str] = None
    
    # REMOVED:
    # sentences: List[ContentSentence]  # Replaced by blocks
    # images: List[ContentImage] = []   # Replaced by blocks
```

---

## Backend Implementation

### DOM Traversal Extraction

Replace `get_text()` with ordered DOM traversal:

```python
def _extract_structured_content(self, soup: BeautifulSoup) -> List[ContentBlock]:
    """Traverse DOM in order, preserving content structure."""
    blocks = []
    body = soup.find('body') or soup
    
    for element in body.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'img', 'figure'], recursive=False):
        if element.name in ['h1', 'h2', 'h3', 'h4']:
            blocks.append(ContentBlock(
                type=BlockType.HEADING,
                text=element.get_text(strip=True),
                level=int(element.name[1])
            ))
        elif element.name == 'p':
            text = element.get_text(strip=True)
            if text:
                sentences = self._split_sentences(text)
                blocks.append(ContentBlock(
                    type=BlockType.PARAGRAPH,
                    text=text,
                    sentences=sentences
                ))
        elif element.name in ['img', 'figure']:
            src = element.get('src') or element.find('img', src=True)
            if src:
                blocks.append(ContentBlock(
                    type=BlockType.IMAGE,
                    image_path=self._normalize_image_path(src),
                    alt=element.get('alt', ''),
                    caption=self._find_caption(element)
                ))
    
    return blocks
```

### Lenient Sentence Splitting

```python
def _split_sentences(self, text: str) -> List[str]:
    """Split text into sentences with minimal filtering."""
    text = re.sub(r'\s+', ' ', text).strip()
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    # Only filter obviously invalid content
    return [
        s.strip() for s in sentences 
        if len(s.strip()) >= 5 and not s.strip().startswith('•')
    ]
```

---

## Frontend Adaptation

### Reading Mode (ReaderView.jsx)

Render blocks in order:

```jsx
{article.blocks.map((block, blockIdx) => {
  switch (block.type) {
    case 'heading':
      const HeadingTag = `h${block.level || 2}`;
      return <HeadingTag key={blockIdx}>{block.text}</HeadingTag>;
      
    case 'image':
      return (
        <ArticleImage 
          key={blockIdx} 
          src={`/api/reading/epub/image?filename=${filename}&path=${block.image_path}`}
          alt={block.alt}
          caption={block.caption}
        />
      );
      
    case 'paragraph':
      return (
        <p key={blockIdx}>
          {block.sentences.map((sentence, sentIdx) => (
            <MemoizedSentence 
              key={`${blockIdx}-${sentIdx}`}
              text={sentence}
              sentenceIndex={[blockIdx, sentIdx]}
            />
          ))}
        </p>
      );
      
    default:
      return null;
  }
})}
```

### Sentence Study (SentenceStudy.jsx)

Use 2D indexing for navigation:

```jsx
// State: [blockIndex, sentenceIndex]
const [currentPosition, setCurrentPosition] = useState([0, 0]);

// Get only paragraph blocks for studying
const paragraphBlocks = useMemo(() => 
  article.blocks
    .map((block, idx) => ({ ...block, blockIndex: idx }))
    .filter(b => b.type === 'paragraph'),
  [article.blocks]
);

// Navigation
const nextSentence = () => {
  const [blockIdx, sentIdx] = currentPosition;
  const currentBlock = article.blocks[blockIdx];
  
  if (sentIdx < currentBlock.sentences.length - 1) {
    // Next sentence in same paragraph
    setCurrentPosition([blockIdx, sentIdx + 1]);
  } else {
    // Find next paragraph block
    const nextParagraphIdx = article.blocks.findIndex(
      (b, i) => i > blockIdx && b.type === 'paragraph'
    );
    if (nextParagraphIdx !== -1) {
      setCurrentPosition([nextParagraphIdx, 0]);
    }
  }
};
```

---

## Files to Modify

### Backend
- `app/models/content_schemas.py` - Add `BlockType`, `ContentBlock`; update `ContentBundle`
- `app/services/content_providers/epub_provider.py` - Implement DOM traversal extraction
- `app/api/routers/content.py` - Update API responses to use new structure

### Frontend
- `frontend/src/components/reading/ReaderView.jsx` - Render by block type
- `frontend/src/components/sentence-study/SentenceStudy.jsx` - 2D index navigation

---

## Verification Plan

### Backend Tests

1. **Unit Test**: `_extract_structured_content()`
   - First paragraph block contains "THE BIG noise in 2025..."
   - Image blocks appear before first paragraph (if present in source)
   - All sentences preserved (no over-filtering)

2. **Integration Test**: Parse `TheEconomist.2025.12.27.epub`
   - Verify block order matches source document
   - Verify image positions are correct

### Frontend Verification

1. **Reading Mode**:
   - Image displays at article start
   - Content order matches original article

2. **Sentence Study**:
   - First sentence is "THE BIG noise in 2025 has been President Donald Trump."
   - Navigation works: next sentence → next paragraph transitions
