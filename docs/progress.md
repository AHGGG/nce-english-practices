
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
- **Visual Refactor** (2025-12-29 ✅):
  - Deep integration of "Cyber-Noir" design system.
  - Replaced ad-hoc CSS with standard component primitives with custom styling.
  - Enforced sharp edges, hard shadows, and token-based coloring (#050505 bg, #00FF94 accent).
  - Verified via browser preview.

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

### ✅ EPUB Image Support (2025-12-29)
**Inline image display with lightbox zoom for Reading Mode.**

#### Backend
- **Image Extraction** (`epub_provider.py`):
  - Scan `ITEM_IMAGE` items from EPUB, cache in memory.
  - `get_image(filename, image_path)` returns binary + content type.
  - Map images to sentence indices for positioning.
- **ContentImage Model** (`content_schemas.py`):
  - Fields: `path`, `sentence_index`, `alt`, `caption`.
- **API Endpoint** (`content.py`):
  - `GET /api/reading/epub/image`: Serves cached images with 24h cache headers.

#### Frontend
- **MemoizedImage Component**: Lazy loading via Intersection Observer.
- **Lightbox Component**: ESC-to-close, backdrop click, full-screen view.
- **Interleaving**: Images rendered after corresponding sentence index.
- **Mobile Fix**: Inspector panel changed from `absolute` to `fixed`, z-index to 60.

### ✅ Performance Report V1-V3 (Phase 36) (2025-12-29 ~ 2025-12-30)
**Comprehensive learning analytics dashboard with gamification.**

| Version | Features |
|---------|----------|
| **V1** | KPIs (vocab, mastery, comprehension, time), activity heatmap, difficult words, source distribution |
| **V2** | Due reviews count, learning streak, reading word count, milestone badges |
| **V3** | Daily goals (circular progress), memory curve (actual vs Ebbinghaus) |

#### Implementation
- **Backend** (`app/database.py`):
  - `get_performance_data()`: Core metrics aggregation.
  - `get_due_reviews_count()`, `get_milestones()`, `get_reading_stats()`: V2 functions.
  - `get_user_goals()`, `get_goals_progress()`, `get_memory_curve_data()`: V3 functions.
- **API** (`app/api/routers/stats.py`):
  - `GET /api/performance`: Returns full V3 dashboard data.
  - `GET/PUT /api/goals`: User goal CRUD.
- **Frontend** (`frontend/src/views/PerformanceReport.jsx`):
  - `DueReviewsCard`, `StreakCard`, `ReadingStatsCard`, `MilestoneBadges`: V2 components.
  - `DailyGoalsPanel`, `MemoryCurveChart`: V3 components.
- **ORM** (`app/models/orm.py`): Added `UserGoal` model.
- **Documentation**: `docs/performance-metrics.md` - detailed algorithm documentation.

### ✅ Reading Session Tracking (Phase 37) (2025-12-30)
**Mixed-signal tracking for accurate reading input measurement.**

#### Problem
Previous `total_words_read` metric was inaccurate:
- Only counted context sentences from word clicks.
- Missed reading without interaction.
- No way to distinguish quick scrolling vs careful reading.

#### Solution: Mixed-Signal Quality Assessment
| Signal | Collection | Purpose |
|--------|------------|---------|
| Time Ratio | active_seconds / expected_seconds (150 WPM) | Filter fast scrolling |
| Scroll Behavior | Detect jumps > 5 sentences | Subtract skipped content |
| Interactions | Word click count | High-confidence reading signal |
| Visibility | Page Visibility API | Exclude idle/tab-switch time |

#### Quality Levels & Word Multiplier
| Quality | Conditions | Multiplier |
|---------|------------|------------|
| **high** | time≥50% + jumps<20% + has_clicks | 100% |
| **medium** | time≥30% + jumps<30% | 70% |
| **low** | time≥10% | 30% |
| **skimmed** | time<10% or excessive jumps | 0% |

#### Implementation
- **ORM Model** (`app/models/orm.py`): `ReadingSession` with 15 tracked fields.
- **Backend** (`app/database.py`):
  - `start_reading_session()`, `update_reading_session()`, `end_reading_session()`
  - `calculate_reading_quality()`: Quality algorithm
  - `get_reading_stats_v2()`: Validated aggregation with legacy fallback
- **API** (`app/api/routers/reading.py`):
  - `POST /api/reading/start`: Create session
  - `PUT /api/reading/heartbeat`: Progress updates (10s interval)
  - `POST /api/reading/word-click`: Word interaction signal
  - `POST /api/reading/end`: Finalize with quality calculation
- **Frontend** (`frontend/src/utils/ReadingTracker.js`):
  - Class with session lifecycle, heartbeat timer, visibility change handler
  - Sentence visibility via IntersectionObserver
- **Integration** (`frontend/src/views/ReadingMode.jsx`):
  - Session start on article load
  - Session end on "Library" button click
  - Word click → `trackerRef.current.onWordClick()`

#### Verification
- Backend tests: `test_api_stats.py` (2/2 passed)
- Browser test: Session started (ID=1), word click tracked, ended with quality="medium", validated_word_count=115

### ✅ Large File Refactoring (Phase 38) (2025-12-31)
**Modular package structure for improved maintainability.**

#### Problem
Three large files exceeded maintainability thresholds:
- `app/database.py` (~1500 lines)
- `app/services/aui_streaming.py` (~1500 lines)
- `app/api/routers/deepgram_websocket.py` (~850 lines)

#### Solution: Package-Based Modularization

| Original File | New Package | Sub-modules |
|---------------|-------------|-------------|
| `app/database.py` | `app/database/` | `core`, `session_theme`, `story`, `stats`, `review`, `chat`, `coach`, `performance`, `reading`, `goals` |
| `app/services/aui_streaming.py` | `app/services/aui/` | `story`, `vocabulary`, `demos/general`, `demos/interactive`, `demos/dashboard`, `service` |
| `app/api/routers/deepgram_websocket.py` | `app/api/routers/deepgram/` | `live_stt`, `streaming_tts`, `voice_agent`, `unified_agent`, `router` |

#### Additional Migrations
- **AUI Renderer**: Moved `app/services/aui.py` → `app/services/aui/renderer.py`.
- **Exports Updated**: All `__init__.py` files export necessary symbols for backward compatibility.
- **Imports Fixed**: Updated `app/main.py`, `app/api/routers/__init__.py`, and test files.

#### Verification
- `tests/test_deepgram_websocket.py`: PASSED (import validation, semantic tests).
- Manual testing recommended for Voice Lab and Reading Mode.

### ✅ Frontend Component Modularization (Phase 39) (2025-12-31)
**Modular package structure for large React components.**

#### Problem
Two large view components exceeded maintainability thresholds:
- `views/ReadingMode.jsx` (739 lines)
- `views/PerformanceReport.jsx` (650 lines)

#### Solution: Package-Based Modularization

| Original File | New Package | Sub-modules |
|---------------|-------------|-------------|
| `ReadingMode.jsx` | `components/reading/` | `constants`, `MemoizedSentence`, `MemoizedImage`, `Lightbox`, `WordInspector`, `ArticleListView`, `ReaderView`, `ReadingMode`, `index` |
| `PerformanceReport.jsx` | `components/performance/` | `utils`, `cards/KPICard`, `cards/ActionCards`, `cards/Card`, `widgets/*` (8 widgets), `PerformanceReport`, `index` |

#### Key Changes
- **Reading Mode**: 739 lines → 9 files with clear separation (list view, reader view, inspector panel, shared components).
- **Performance Report**: 650 lines → 14 files organized into `cards/` (KPI displays) and `widgets/` (data visualizations).
- **Backward Compatibility**: Original view files now re-export from packages.

#### Verification
- `npm run build`: PASSED (2241 modules transformed, built in 6.47s).
- Manual browser testing recommended for Reading Mode and Performance Report.

### ✅ Codebase Cleanup (Phase 40) (2025-12-31)
**Removal of dead code and legacy service files.**

#### Changes
- **Dead Code Removal**: Deleted `app/services/rss_service.py`, `app/services/epub_service.py`, and `app/api/routers/elevenlabs_websocket.py`.
  - Reason: Superceded by `app/services/content_providers/` and `app/services/voice_lab.py`.
- **Quality Fixes**:
  - `unified_agent.py`: Fixed bare `except:` block to prevent swallowing `KeyboardInterrupt`.
  - `ImportError`: Fixed dangling references to `elevenlabs_websocket` in `main.py`.

#### Verification
- `tests/test_api_routers.py`: PASSED (Confirmed routing integrity).

### ✅ Local Deployment Architecture (Phase 41) (2025-12-31)
**Complete local/intranet deployment stack with Docker and Nginx.**

#### Features
- **Docker Compose**: Orchestrates Nginx, FastAPI, PostgreSQL, and Backup Cron.
- **Nginx Reverse Proxy**:
  - Auto-redirect HTTP → HTTPS.
  - WebSocket support for Voice features (`/ws/`).
  - Serving static assets and uploaded files.
- **Deployment Scripts** (`deploy/scripts/`):
  - `deploy.sh`: One-command deployment.
  - `backup.sh` / `restore.sh`: Automated database backup/recovery.
  - `logs.sh` / `health-check.sh`: Maintenance tools.

#### Verification
- Manual verification of directory structure and script generation.
- Backend tests passed.

### ✅ Navigation Dashboard (Phase 42) (2025-12-31)
**Unified navigation hub for accessing all system modules.**

#### Implementation
- **New Component**: `NavDashboard.jsx` - Grid layout with cards for each route.
- **Routing**: Added `/nav` route to `App.jsx`.
- **UX**: "Command Center" aesthetic with hover effects and descriptions.
- **Access**: Provides links to Learn, Drill, Apply, Coach, Voice, Reading, Voice Lab, Performance, and AUI Demo.

### ✅ Sentence Study UX Enhancements (Phase 43) (2026-01-02)
**Major detailed improvements to the Sentence Study mode.**

#### Features
- **Collocation Highlighting**: AI-powered phrase detection. Highlighted units are clickable for phrase-level explanations.
- **Progressive Explanations**: 3-tier explanation system (Default -> Simple -> Chinese Deep Dive) catering to different proficiency levels.
- **Rich Markdown Rendering**: Integrated `react-markdown` for beautifully formatted explanations (lists, bolding, code blocks) in the Cyber-Noir theme.
- **UX Refinement**: Removed floating buttons in favor of more stable, integrated UI controls.

#### Engineering
- **Blocking I/O Fix**: Identified and fixed synchronous blocking in async FastAPI endpoints (`list_epub_articles`, `get_epub_image`), resolving "hanging request" issues.
- **Frontend State Management**: Refactored `SentenceStudy.jsx` to cleaner state model, removing obsolete legacy code.
- **Dependencies**: Added `react-markdown` to frontend stack.

### ✅ Dashboard Simplification & Legacy Cleanup (Phase 44) (2026-01-02)
**Streamlined performance dashboard to focus on practical metrics; removed legacy practice code.**

#### Dashboard Simplification
- **Problem**: Dashboard contained many "vanity metrics" (vocab_size, mastery_rate, comprehension, etc.) that were buggy (e.g., 101% mastery) or not meaningful.
- **Solution**: Simplified to 3 core KPIs + Memory Curve.

| Retained | Removed |
|----------|---------|
| Study Time (Sentence Study + Reading) | Vocabulary Size, Mastery Rate, Comprehension Score |
| Reading Word Count | Daily Goals, Activity Heatmap, Milestone Badges |
| Articles Count | Streak, Source Distribution, Recent Words, Difficult Words, Due Reviews |
| Memory Curve | - |

#### Frontend Changes
- **Deleted Widgets**: `ActivityHeatmap`, `DailyGoalsPanel`, `DifficultWords`, `MilestoneBadges`, `RecentWords`, `SourceDistribution`, `VocabDistribution`.
- **Deleted Cards**: `KPICard`, `ActionCards`.
- **New Layout** (`PerformanceReport.jsx`): 3 KPI cards (Study Time, Reading Words, Articles) + Memory Curve chart (B-scheme).

#### Legacy Practice Code Removal
- **Deleted Files**:
  - `app/api/routers/practice.py` (log_attempt API)
  - `app/database/stats.py` (Attempt-based functions)
- **Updated Files**: Removed `Attempt`, `UserGoal` from `core.py`, `__init__.py`, `main.py`, `routers/__init__.py`.
- **Frontend**: Removed `logAttempt`, `fetchStats` from `client.js`.
- **Database Migration**: `9c5d07931690_drop_attempts_and_user_goals_tables.py` drops `attempts` and `user_goals` tables.

#### Verification
- Backend tests: `test_api_stats.py` (1/1 passed).
- Database migration: Successfully executed.
- Browser verification: Dashboard renders correctly with new layout.

### ✅ Data Tracking Enhancements (Phase 45) (2026-01-02)
**Comprehensive user behavior tracking for Sentence Study and Voice Mode.**

#### Features
- **Sentence Study Word Count**:
  - `SentenceLearningRecord` now tracks `word_count`.
  - Merged into `reading_stats.total_words` (unified Reading + Sentence Study metric).
- **Phrase Click Tracking**:
  - `phrase_clicks` distinguishes collocation clicks from single word clicks.
  - Enables granular analysis of user dictionary usage.
- **Voice Session Tracking**:
  - New `VoiceSession` model for Negotiation Interface (Voice Mode).
  - Tracks: active time, HUH? usage, Got It count, example navigation, audio plays.
  - Frontend `VoiceSessionTracker` for reliable heartbeat and event logging.

#### Implementation
- **ORM** (`app/models/orm.py`): Added `VoiceSession` class and `phrase_clicks` column.
- **Backend API**:
  - `POST /api/voice-session/start|end`
  - `PUT /api/voice-session/heartbeat`
  - Integrated into `performance.py` study time aggregation.
- **Frontend**:
  - `utils/VoiceSessionTracker.js`: Utility for session management.
  - `NegotiationInterface.jsx`: Full integration of voice tracking.

#### Verification
- `test_sentence_study_api.py`, `test_api_stats.py`: PASSED (11/11).
- Frontend Build: PASSED.

### ✅ SM-2 Review System (Phase 46) (2026-01-04)
**Proper spaced repetition with SM-2 algorithm for long-term retention.**

#### Problem
The existing SRS was basic (hardcoded intervals in `SentenceLearningRecord`). Needed a proper SM-2 implementation with:
- Quality-based interval adjustment (forgot/remembered/easy)
- Memory curve tracking for visualization
- Automatic review item creation based on study behavior

#### Solution: Dedicated Review System

| Component | Implementation |
|-----------|----------------|
| **ORM Models** | `ReviewItem` (SM-2 params: EF, interval, repetition) + `ReviewLog` |
| **Migration** | `4f0adbca8a15_add_review_system_tables.py` |
| **Backend Router** | `app/api/routers/review.py` with 5 endpoints |
| **Integration** | Auto-creation in `sentence_study.py` `record_learning` |
| **Frontend** | Updated `ReviewQueue.jsx` with card-based rating UI |

#### SM-2 Algorithm Implementation
- **Quality Scores**: 1=forgot, 3=remembered, 5=easy
- **EF Adjustment**: `EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))`
- **Interval Calculation**:
  - Failed (q<3): Reset to 1 day
  - Rep 1: 1 day → Rep 2: 6 days → Rep 3+: `interval * EF`

#### API Endpoints
| Endpoint | Purpose |
|----------|---------|
| `GET /api/review/queue` | Get items due for review |
| `POST /api/review/complete` | Submit review with quality score |
| `POST /api/review/create` | Create review item (internal) |
| `GET /api/review/memory-curve` | Retention statistics |
| `GET /api/review/stats` | Overall stats |

#### Entry Conditions (Auto-Creation)
ReviewItem created when user:
1. Marks sentence as "Unclear", OR
2. Marks "Clear" but looked up words/phrases

#### Frontend UI
- **Card Layout**: Sentence with highlighted words
- **3 Rating Buttons**: 忘了 / 想起来了 / 太简单
- **Progress Display**: Item count, repetition info
- **Empty State**: Congratulatory message when queue is empty

#### Verification
- Backend router loads with all 5 endpoints: PASSED
- Frontend build: PASSED
- Manual testing: Review flow works end-to-end

### ✅ Memory Curve & Dashboard Consolidation (Phase 47) (2026-01-04)
**Consolidated separate profile/stats views into a single unified analytics dashboard.**

#### Dashboard Consolidation
- **Problem**: `ProfileStats` and `PerformanceReport` had overlapping metrics and separate navigation entries.
- **Solution**: Merged all distinct features into `PerformanceReport`.
  - **KPIs**: Study Time, Reading Word Count, Articles Count, **Clear Rate** (New).
  - **Insights**: Added Gap Breakdown (Vocab/Grammar/Collocation) and "Words to Review" from ProfileStats.
  - **Navigation**: Removed `/profile-stats` route (redirects to `/performance`) and NavDashboard entry.

#### Memory Curve Visualization
- **Backend Update**: Updated `get_memory_curve_data()` in `performance.py` to use `ReviewLog` data (SM-2) instead of legacy `WordProficiency`.
- **Frontend**: Enabled `MemoryCurveChart` in `PerformanceReport` to display actual retention rates vs Ebbinghaus curve.
- **Data Source**: Real-time accurate retention rates based on `forgot/remembered/easy` feedback.

#### Verification
- **Frontend Build**: PASSED.
- **Manual Check**: Dashboard displays all new sections correctly; Redirect works.

