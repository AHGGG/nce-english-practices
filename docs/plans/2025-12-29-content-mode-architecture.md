# Design Decision: Content Mode Architecture

## Date: 2025-12-29

## Context
After implementing the Content Provider abstraction, we discussed how the frontend should handle different content types (Vocabulary, Reading, Podcast).

## Decision

### Frontend: Specialized Views (NOT Unified)
Each content type gets its own optimized UI:
- **Podcast Mode**: Audio player, waveform, timestamped captions
- **Reading Mode**: Article reader, paragraph highlights
- **Vocabulary Mode**: Flashcards, spaced repetition

### Backend: Unified Provider Layer (KEEP)
The `ContentService` and `BaseContentProvider` abstraction remains.
Benefits:
- Global history/learning records across all content types
- Consistent ingestion pipeline for new sources
- Single metadata schema for cross-referencing

### Linking Strategy: Source-Aware Drill-down
When user inspects a word from any context:
```
GET /api/inspect?word=pivot&source_id=podcast:123&timestamp=45.6
```
Backend:
1. Returns dictionary definition (universal)
2. **Records association** in `VocabLog`:
   ```json
   { "word": "pivot", "source_id": "podcast:123", "context": "Let's pivot...", "timestamp": 45.6 }
   ```

This enables:
- "Where did I learn this word?" during review
- "Play original context" button in Vocabulary Mode
- Cross-content learning analytics

## Implications
- `ContentBundle.id` and `ContentSentence.start_time` are critical fields
- Future `VocabLog` table needs `source_id` and `context_sentence` columns
- Frontend needs to pass source context when calling inspect APIs
