
# Global Progress Tracker

## 📜 Historical Phases (Completed before 2025-12-24)

<details>
<summary><strong>Phase 1-9: Foundation & Architecture</strong> (Click to expand)</summary>

| Phase | Summary |
|-------|---------|
| **1. MVP** | Migrated from CLI/TUI to FastAPI + React SPA. Core LLM features. |
| **2. Active Gym** | Story Generator, Drill Matrix, Scenario Roleplay, Chat Agent. |
| **3. Retention** | Data Dashboard, PWA, Hybrid Dictionary (MDX). |
| **4. Refinement** | Async refactor, Grammar Coach, SRS (SuperMemo-2). |
| **5. Infrastructure** | SQLite → PostgreSQL, Alembic migrations, Unified LLM Service. |
| **6. Mobile** | Bottom Nav, Responsive UI, Network access config. |
| **7. Stability** | Dictionary Iframe Sandbox, LLM timeout handling. |
| **8. Deployment** | Dockerfile, Static file serving, Legacy cleanup. |
| **9. Visual** | "Cyber-Noir" design system, Tailwind tokens, Component library. |

</details>

<details>
<summary><strong>Phase 10-17: Voice & Streaming</strong> (Click to expand)</summary>

| Phase | Summary |
|-------|---------|
| **10. Coach** | CoachService, Tool-Use Agent, Edge TTS, DSML Parser. |
| **11. Voice Vendors** | ElevenLabs, Deepgram, Gemini, Dashscope (Qwen) integrations. |
| **13. SDK Removal** | Removed deepgram-sdk and elevenlabs SDK; raw httpx calls. |
| **14. Testing** | Automated tests for voice vendors, WebSocket, PCM simulation. |
| **15. Function Calling** | Agent functions (lookup_word, get_examples, filler, end_call). |
| **16. AUI Streaming** | AG-UI compatible events, TEXT_DELTA, STATE_DELTA, JSON Patch. |
| **17. AUI Transport** | Removed SSE, unified WebSocket transport, HITL demos. |

</details>

---

## 📆 Recent Updates (December 2025)

### ✅ Dictionary Parsers (2025-12-24 ~ 2025-12-25)
- **Collins Parser**: Structured extraction (senses, examples, synonyms, audio).
- **LDOCE Parser**: Extended features (Etymology, Verb Table, Thesaurus, Collocations).
- **Context Resources**: Grouped by sense, click-to-reveal translations.

### ✅ AUI Mobile & Transport (2025-12-25 ~ 2025-12-26)
- **Mobile Compatibility**: Auto-reconnect, responsive layouts, touch optimization.
- **Transport Consolidation**: Removed SSE, WebSocket-only architecture.
- **Log Bridge Fix**: RLock + sendBeacon for non-blocking logs.

### ✅ Voice CI Architecture (Phase 18-27) (2025-12-27)
- **Strategic Pivot**: Unified Voice Interface driven by Comprehensible Input theory.
- **Negotiation Loop**: HUH?/Got It flow with L1/L2 explanations.
- **Multi-Example Navigation**: Sense tabs, example arrows, step history.
- **Context Enhancement**: Rich definition injection, session sync, TTS optimization.
- **Micro-Scenarios**: Real-time context generation for dictionary examples.

### ✅ Word List System (Phase 28-30) (2025-12-27)
- **Word Books**: CET4, CET6, COCA20000 seeded from trusted sources.
- **SKIP Function**: Exclude current word, random selection via `func.random()`.
- **Range Filtering**: COCA frequency levels (Beginner → Expert).

### ✅ Content Sources (Phase 31-32) (2025-12-28)
- **RSS Service**: Feed parsing with sentence extraction (limited by source quality).
- **EPUB Service**: Local EPUB parsing (Economist weekly issues).
- **Word Sense Disambiguation**: LLM-powered sense selection.

### ✅ Content Provider Architecture (Phase 33) (2025-12-29)
**Unified Provider Architecture for multi-source content ingestion.**

#### Implementation
- **Data Models** (`app/models/content_schemas.py`):
  - `SourceType`: epub, rss, podcast, plain_text
  - `ContentBundle`, `ContentSentence`: Unified transfer objects
- **Provider Interface** (`app/services/content_providers/base.py`):
  - `BaseContentProvider` abstract class
- **Providers**: EpubProvider, RssProvider, PodcastProvider, PlainTextProvider
- **ContentFeeder Migration**: Now uses `ContentService` for all content types

#### Design Decision
- **Backend**: Unified (Provider Pattern)
- **Frontend**: Specialized Views (Podcast/Reading/Vocabulary modes - planned)
- **Linking**: Source-Aware Drill-down (record context when learning words)

#### Verification
- `scripts/test_provider_arch.py` - Provider unit tests
- `scripts/test_feeder_integration.py` - Integration tests

### ✅ Source-Aware Drill-down (Phase 34) (2025-12-29)
**Vocabulary tracking with source context ("Where did I learn this word?").**

#### Implementation
- **ORM Model** (`app/models/orm.py`):
  - `VocabLearningLog`: word, source_type, source_id, context_sentence
- **API Endpoints** (`app/api/routers/inspect.py`):
  - `GET /api/inspect`: Lookup word + record learning context
  - `GET /api/inspect/history`: Query learning history
- **Frontend** (`NegotiationInterface.jsx`):
  - `logWordInspection()`: Called on HUH? click
  - Source detection: EPUB/RSS/Dictionary modes

#### Database
- Migration `0d3c2471aaff_add_vocab_learning_log_table.py`
- Table `vocab_learning_logs` with indexes on (user_id, word) and (source_type, source_id)

### ✅ Reading Mode (Phase 35) (2025-12-29)
**Specialized frontend view for EPUB article reading.**

#### Implementation
- **Backend Endpoints** (`app/api/routers/content.py`):
  - `GET /api/reading/epub/list`: List EPUB articles
  - `GET /api/reading/article`: Get article content
- **Frontend View** (`frontend/src/views/ReadingMode.jsx`):
  - Article list with titles and previews
  - Reader with click-to-inspect words
  - Mobile-responsive word inspector panel
  - Integrated with `/api/inspect` for source tracking
- **Routing** (`App.jsx`): Added `/reading` route
- **Visual Refactor** (2025-12-29):
  - Deep integration of "Cyber-Noir" design system.
  - Replaced ad-hoc CSS with standard `components/ui` primitives.
  - Enforced sharp edges, hard shadows, and token-based coloring.

### ✅ Reading Mode Performance (2025-12-29)
**Optimized click latency from ~200ms to <50ms.**
- **Problem**: React re-rendering all visible sentences on every click.
- **Solution**:
  - `MemoizedSentence`: `<p>` wrapper with `React.memo` to isolate updates.
  - **CSS Selection**: Replaced state-driven styling with `data-selected-word` attribute selectors.
  - **Containment**: Added `contain: content` to article container.
  - **GPU Acceleration**: Optimized Inspector panel transitions.

### ✅ LDOCE Dictionary Performance (2025-12-29)
**Optimized high-frequency word queries from ~15s to <3s (first), <100ms (cached).**
- **Root Cause**: Words like "on" have 2MB+ HTML, parsing twice with BeautifulSoup.
- **Solutions**:
  - **Truncation**: MAX_SENSES=10, MAX_EXAMPLES=3, MAX_COLLOCATIONS=10.
  - **API Cache**: 500-entry result cache, repeated queries <100ms.
  - **lxml Parser**: Replaced `html.parser` with `lxml` (~5-10x faster).

