
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

