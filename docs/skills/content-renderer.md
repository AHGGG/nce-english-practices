# Content Renderer System

统一的内容渲染系统，支持不同内容类型（epub、podcast、audiobook）的渲染。

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  ContentRendererRegistry (singleton)                        │
│  - register(sourceType, renderer)                           │
│  - getRendererForBundle(bundle) → ContentRenderer           │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ TextContent   │   │ AudioContent  │   │ (Future)      │
│ Renderer      │   │ Renderer      │   │ ComicRenderer │
│ epub/rss/text │   │ audiobook     │   │               │
└───────────────┘   └───────────────┘   └───────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  SentenceBlock (shared component)                           │
│  - Vocabulary highlights (COCA/CET) - green                 │
│  - Study word highlights - amber underline                  │
│  - Study phrase highlights - amber background               │
│  - Collocation highlights - gold dashed border              │
└─────────────────────────────────────────────────────────────┘
```

## Key Files

| File                                                                 | Description                       |
| -------------------------------------------------------------------- | --------------------------------- |
| `apps/web/src/components/content/registry.ts`                        | Renderer registry singleton       |
| `apps/web/src/components/content/types.ts`                           | Type definitions                  |
| `apps/web/src/components/content/renderers/TextContentRenderer.tsx`  | Text content (epub/rss)           |
| `apps/web/src/components/content/renderers/AudioContentRenderer.tsx` | Audio content (podcast/audiobook) |
| `apps/web/src/components/content/shared/SentenceBlock.tsx`           | Unified sentence rendering        |
| `apps/web/src/components/reading/MemoizedSentence.jsx`               | Re-exports SentenceBlock (legacy) |

## Props Interface

```typescript
interface ContentRendererProps {
  bundle: ContentBundle;
  highlightSet?: Set<string>; // Vocabulary (COCA/CET) - green
  studyWordSet?: Set<string>; // Single words looked up - amber underline
  studyPhraseSet?: Set<string>; // Phrases looked up - amber background
  knownWords?: Set<string>; // Words to exclude from highlighting
  showHighlights?: boolean;
  getCollocations?: (sentence: string) => Collocation[]; // Dynamic collocation loading
  onWordClick?: (word: string, sentence: string) => void;
  onSentenceClick?: (sentence: string, meta?: any) => void;
  onImageClick?: (src: string, alt?: string, caption?: string) => void;
  tracker?: ReadingTrackerRef;
  visibleCount?: number;
  metadata?: Record<string, any>;
}
```

## Collocation Detection System

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  useCollocationLoader (packages/shared)                     │
│  - loadCollocations(sentences[]) → triggers API call        │
│  - getCollocations(sentence) → Collocation[]                │
│  - Frontend cache (Map<hash, Collocation[]>)                │
└───────────────────────────┬─────────────────────────────────┘
                            │ POST /api/sentence-study/detect-collocations-batch
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend 3-Layer Cache                                      │
│  1. Memory cache (LRU)                                      │
│  2. Database cache (collocation_cache table)                │
│  3. LLM generation (fallback)                               │
└─────────────────────────────────────────────────────────────┘
```

### Usage Pattern

```jsx
// In a view component
const { getCollocations, loadCollocations } = useCollocationLoader();

// Load collocations when content is ready
useEffect(() => {
  if (sentences.length > 0) {
    loadCollocations(sentences.slice(0, 20)); // Load first batch
  }
}, [sentences]);

// Pass to renderer
<TextContentRenderer
  getCollocations={getCollocations}
  studyWordSet={studyWordSet}
  studyPhraseSet={studyPhraseSet}
  // ... other props
/>;
```

### Key Files

- `packages/shared/src/hooks/useCollocationLoader.ts` - Frontend hook
- `app/api/routers/sentence_study.py` - `/detect-collocations-batch` endpoint
- `app/services/learning/sentence_study_service.py` - Collocation detection logic

## Common Pitfalls

### 1. Renderer Bypassing Custom Logic

**Problem**: When using `rendererRegistry.getRendererForBundle()`, the renderer handles all rendering internally. Custom logic in the parent component won't be executed.

**Solution**: Pass custom logic via props to the renderer.

```jsx
// BAD - renderContent() won't be called when renderer is active
const renderer = rendererRegistry.getRendererForBundle(article);
return renderer ? renderer.render({...}) : renderContent();

// GOOD - pass getCollocations to renderer
return renderer.render({
  bundle: article,
  getCollocations,  // Pass the callback
  // ... other props
});
```

### 2. Props Interface Mismatch (studyHighlightSet)

**Problem**: Old code used `studyHighlightSet` for both words and phrases. This doesn't support different rendering styles.

**Solution**: Use `studyWordSet` + `studyPhraseSet` separately.

| Prop             | Content            | Rendering Style           |
| ---------------- | ------------------ | ------------------------- |
| `studyWordSet`   | Single words       | Amber underline           |
| `studyPhraseSet` | Multi-word phrases | Amber background + border |

```jsx
// BAD
data.studyHighlightSet = new Set(study_highlights);

// GOOD
data.studyWordSet = new Set();
data.studyPhraseSet = new Set();
study_highlights.forEach((item) => {
  if (item.includes(" ")) {
    data.studyPhraseSet.add(item.toLowerCase());
  } else {
    data.studyWordSet.add(item.toLowerCase());
  }
});
```

### 3. Static Collocations Array

**Problem**: Passing collocations as a static array doesn't work because each sentence needs its own collocations.

**Solution**: Use `getCollocations` callback pattern.

```jsx
// BAD - same collocations for all sentences
<SentenceBlock collocations={allCollocations} />

// GOOD - per-sentence collocations via callback
<SentenceBlock collocations={getCollocations(sentence)} />
```

### 4. MemoizedSentence vs SentenceBlock

**Problem**: Two similar components existed causing code duplication.

**Solution**: `MemoizedSentence.jsx` now re-exports `SentenceBlock`. Always use `SentenceBlock` for new code.

```jsx
// MemoizedSentence.jsx (current implementation)
import { SentenceBlock } from "../content/shared";
export default SentenceBlock;
```

### 5. Audio Content Collocation Support

When adding collocation support to audio content (podcast/audiobook):

1. Add `getCollocations` prop to `AudioSegmentBlockProps`
2. Pass it through: `AudioPlayerUI` → `AudioSegmentBlock` → `SentenceBlock`
3. Load collocations in the view component using `useCollocationLoader`

```jsx
// UnifiedPlayerView.jsx
const { getCollocations, loadCollocations } = useCollocationLoader();

useEffect(() => {
  if (bundle?.blocks) {
    const sentences = bundle.blocks
      .filter((b) => b.type === "audio_segment")
      .flatMap((b) => b.sentences || [b.text]);
    loadCollocations(sentences.slice(0, 20));
  }
}, [bundle]);

<AudioPlayerUI getCollocations={getCollocations} {...props} />;
```

## Highlight Styling Reference

| Type             | Data Source                            | Style                     |
| ---------------- | -------------------------------------- | ------------------------- |
| Vocabulary words | `highlightSet`                         | Green underline           |
| Studied words    | `studyWordSet`                         | Amber underline           |
| Studied phrases  | `studyPhraseSet` + collocation match   | Amber background + border |
| Detected phrases | `collocations` (not in studyPhraseSet) | Gold dashed underline     |
