
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

## 📆 December 2025 Updates (Compressed)

| Phase | Date | Summary |
|-------|------|---------|
| **Dictionary Parsers** | 12-24~25 | Collins/LDOCE structured extraction, sense-grouped context |
| **AUI Mobile** | 12-25~26 | WebSocket-only transport, auto-reconnect, touch optimization |
| **Voice CI** (18-27) | 12-27 | Unified Voice Interface, Negotiation Loop, Multi-Example Nav |
| **Word Lists** (28-30) | 12-27 | CET4/6, COCA20000, random selection, range filtering |
| **Content Sources** (31-32) | 12-28 | RSS/EPUB parsing, Word Sense Disambiguation |
| **Provider Arch** (33) | 12-29 | ContentBundle model, 4 Providers, ContentFeeder migration |
| **Source Drill-down** (34) | 12-29 | VocabLearningLog, `/api/inspect` endpoints |
| **Reading Mode** (35) | 12-29 | EPUB reader, click-to-inspect, Cyber-Noir styling |
| **Reading Perf** | 12-29 | React.memo, CSS selection, GPU acceleration (<50ms click) |
| **LDOCE Perf** | 12-29 | Truncation, API cache, lxml parser (~15s→<3s) |
| **EPUB Images** | 12-29 | Image extraction, Lightbox, lazy loading |
| **Performance Report** (36) | 12-29~30 | KPIs, heatmap, memory curve, session tracking |
| **Reading Tracking** (37) | 12-30 | Mixed-signal quality (time/scroll/clicks), validated word count |
| **Large File Refactor** (38) | 12-31 | database/, aui/, deepgram/ package splits |
| **Frontend Modular** (39) | 12-31 | ReadingMode (9 files), PerformanceReport (14 files) |
| **Codebase Cleanup** (40) | 12-31 | Dead code removal, quality fixes |
| **Local Deploy** (41) | 12-31 | Docker Compose, Nginx, backup scripts |
| **Nav Dashboard** (42) | 12-31 | Unified `/nav` page, Command Center aesthetic |

---

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

### ✅ Sentence Study Completion & Review (Phase 48) (2026-01-04)
**Full article review with contextual highlighting upon completion.**

#### Features
- **COMPLETED View**: Replaced the "No sentence available" empty state when finishing an article.
- **Contextual Highlighting**: Shows the full article text with **highlighted words/phrases** that were looked up during the study session.
- **Interactive Review**: Clicking highlighted words opens the Word Inspector for deeper review.
- **Stats Display**: Shows studied sentence count, clear rate, and total words looked up.

#### Implementation
- **Backend API** (`app/api/routers/sentence_study.py`):
  - `GET /api/sentence-study/{source_id}/study-highlights`: Returns aggregated `word_clicks` and `phrase_clicks` for the entire article.
- **Frontend** (`SentenceStudy.jsx`):
  - Added `VIEW_STATES.COMPLETED`.
  - Added `renderCompleted()` with `HighlightedText` component.
  - Modified flow to detect `current_index >= total_sentences` and transition to completed view.

#### Verification
- **Test**: `test_get_study_highlights` in `test_sentence_study_api.py` (PASSED).
- **Manual**: Verified flow from study -> finish -> review view.

### ✅ Reading-SentenceStudy Integration (Phase 49) (2026-01-04)
**Seamless cross-mode navigation between Reading Mode and Sentence Study.**

#### Features
- **Cross-Mode Navigation**:
  - URL parameter support (`?source_id=xxx`) for direct article linking.
  - "Deep Study" button in Reading Mode toolbar (graduation cap icon).
  - "Read Full Article" button in Sentence Study COMPLETED view.
- **Unified Article Status API**:
  - `GET /api/content/article-status`: Combined reading/study progress per article.
  - Status values: "new", "read", "in_progress", "completed".
- **Study Highlights in Reading Mode**:
  - Words looked up during Sentence Study shown in amber color.
  - Backend fetches study lookups from `SentenceLearningRecord`.
  - Frontend `MemoizedSentence` renders with `studyHighlightSet`.
- **Deep Data Integration**:
  - Reading Mode word lookups (2+ times) auto-create SM-2 `ReviewItem`.
  - Shared `ArticleCard.jsx` component for unified library display.

#### Implementation
- **Backend**:
  - `app/api/routers/content.py`: Added `/api/content/article-status`, extended `/api/reading/article` with `study_highlights`.
  - `app/api/routers/inspect.py`: Added SM-2 ReviewItem creation for repeated lookups.
- **Frontend**:
  - `SentenceStudy.jsx`: URL param parsing + "Read Full Article" button.
  - `ReadingMode.jsx`: URL param parsing + `studyHighlightSet`.
  - `ReaderView.jsx`: "Deep Study" button.
  - `MemoizedSentence.jsx`: Amber highlighting for study lookups.
  - `components/shared/ArticleCard.jsx`: Unified article display component.

#### Verification
- **Backend Tests**: 8/8 passed (`test_sentence_study_api.py`).
- **Browser Test**: Cross-mode navigation verified with recording.

### ✅ Unified Library UI & Status Indicators (Phase 50) (2026-01-04)
**Visual status tracking for Reading Mode library.**

#### features
- **Status Badges**: Distinct visual indicators for "Completed" (Green), "In Progress" (Yellow), and "Read" (Grey) articles.
- **Sectioning**: Library automatically separates "To Read" and "Completed" articles.
- **Progress Stats**: Header displays completion count (e.g., "3/10 Completed").
- **Smart Actions**: Card footer action changes contextually ("Read Now" vs "Review").
- **Implementation**: Enhanced `ArticleListView.jsx` with mapped status configs and lucide icons.

#### Verification
- **Browser Test**: Verified correct rendering of all status states and badge styling.

### �?EPUB Content Refactor & Sentence Study Fixes (Phase 51) (2026-01-04 ~ 2026-01-05)
**Major structural upgrade to content extraction and rendering pipeline.**

#### EPUB Structured Extraction
- **Problem**: Previous flat text extraction lost document structure (headings, subtitles) and broke sentence ordering.
- **Solution**: Implemented `ContentBlock` model hierarchy.
  - **Backend**: `EpubProvider` now traverses DOM to create ordered blocks (`HEADING`, `PARAGRAPH`, `IMAGE`, `SUBTITLE`).
  - **Lenient Parsing**: `_split_sentences_lenient` ensures no content is lost during segmentation.
  - **API**: `/api/reading/article` returns `blocks` array preserving exact document order.

#### Sentence Study Fixes
- **Critical Bug**: First sentence of articles was consistently missing in Study Mode.
- **Root Cause**: Frontend `SentenceStudy.jsx` was falling back to a legacy `sentences` array which had overly strict filtering, while the new `blocks` data was correct but unused in the main render loop.
- **Fix**:
  - Migrated `renderStudying` to use `flatSentences` computed directly from `blocks`.
  - Implemented 2D indexing (`blockIndex`, `sentenceIndex`) for precise navigation.
  - Verified fix: "THE BIG noise..." now correctly appears as the first sentence.

#### Implementation
- **Backend**: `app/models/content_schemas.py` (Added `ContentBlock`, `BlockType`), `epub_provider.py`.
- **Frontend**: `SentenceStudy.jsx` (Deep refactor of data loading and rendering), `ReaderView.jsx`.
- **Database**: Created `scripts/reset_sentence_data.py` to clear incompatible cached records.

#### Verification
- **Manual**: Validated identifying first sentences in _The Economist_ articles.
- **Visual**: Confirmed distinct rendering of headings, subtitles, and images in Reading Mode.

### 2026-01-05: EPUB Refactor Finalization & Legacy Cleanup
- **Objective**: Complete the migration to ContentBlock based parsing and remove all legacy sentence/image array logic.
- **Changes**:
  - **Legacy Removal**: Removed _extract_sentences and _map_images_to_sentences from epub_provider.py.
  - **API Update**: Removed images array from ContentBundle response; now exclusively uses locks.
  - **Frontend**: Updated ReaderView.jsx to use global sentence indexing for correct ReadingTracker integration.
  - **Validation**: Fixed 422 errors in heartbeat by adding null-coercion validators to HeartbeatRequest.
- **Status**: All 11 tests passed (3 integration, 8 API); Browser verification successful.

### LDOCE Collocation Spacing Fix (2026-01-05)
**Fixed missing spaces in collocation example sentences.**

#### Problem
- Examples extracted using `get_text(strip=True)` merged words around HTML tags (e.g., `tosi mmer down`).

#### Solution
- Updated `ldoce_parser.py` to use `get_text(separator=' ')` and normalize whitespace.
- Applied fix to `_extract_popup_collocations` and `_parse_collocation_example`.

#### Verification
- **Tests**: Ran `tests/test_ldoce_parser.py` (All 22 passed).
- **Ad-hoc**: Verified correct spacing on `simmer` examples.

### ✅ Deployment Fixes (2026-01-06)
**Resolved issues preventing successful local deployment.**

#### Issues & Fixes
- **Alembic Migration Failure**: `alembic/` directory was excluded in `.dockerignore`.
  - **Fix**: Removed exclusion to ensure migration scripts are copied to container.
- **Frontend 404**: FastAPI was not serving the React SPA static files.
  - **Fix**: Added `StaticFiles` mount for `/app/frontend/dist` in `main.py` (after API routes).
- **Deployment Script**:
  - **Improvement**: Added cleanup step (`docker system prune`) and `--no-cache` build to `deploy.sh` to prevent stale build artifacts.

#### Verification
- **Manual**: User confirmed successful deployment locally.

| **10. Refactor** | Unified Word Explainer (Hook), Reading Mode Context Explanation.

| **11. Refactor** | **SentenceStudy Module**: Split frontend (1344 lines) into 5 views; created backend service layer for LLM/SRS logic. |

### ✅ Deployment Security & Stability (2026-01-06)
**Hardening the deployment pipeline for production.**

#### Fixes & Features
- **Migration Stability**: Updated `72f20468f2be` migration to use `DROP COLUMN IF EXISTS` to support fresh database deployments.
- **Security**: Added Nginx HTTP Basic Auth support (optional) for protecting dev deployments.
  - Script: `deploy/scripts/generate_htpasswd.sh`
  - Config: Mounted `nginx/conf.d` volume.

### ✅ Unclear Sentence Features (2026-01-06)
**Enhanced review capabilities for difficult sentences.**

#### Features
- **Visual Highlighting**: Sentences marked "Unclear" during study are highlighted in Completed View and Reading Mode.
- **Color Coding**: 
  - 🟠 Vocabulary (Orange)
  - 🔵 Grammar (Blue)
  - 🔴 Both (Red)
- **Sentence Inspector**: Clicking an unclear sentence opens a dedicated panel (similar to Word Inspector) showing the 3-stage progressive explanation.

#### Implementation
- **Backend**: Extended `get_study_highlights` and `get_article_content` to return `unclear_sentences` metadata.
- **Frontend Components**:
  - `SentenceInspector.jsx`: New component for fetching and displaying sentence explanations.
  - `MemoizedSentence.jsx`: Added colored border styling and click handlers.
  - `ReaderView/CompletedView`: Integrated click handling and Inspector rendering.

#### Verification
- **Tests**: 8/8 backend tests passed (`test_sentence_study_api.py`).
- **Manual**: Verified flow in browser (highlighting + inspector).

### ✅ Review Helper Feature (2026-01-06)
**Multi-stage explanation system for the Review Queue when users forget an item.**

#### Problem
When users clicked "忘了" (Forgot) during review, they got no help understanding the content - just moved to the next item.

#### Solution: 3-Stage Progressive Hints
| Stage | Content | Quality Score |
|-------|---------|---------------|
| **1** | Brief hint (explain-word: brief style) | — |
| **2** | Detailed explanation | — |
| **3** | Full Chinese deep dive | — |
| **Remembered after help** | — | 2 |
| **Skip or Stage 3 exhausted** | — | 1 |

#### Implementation
- **Frontend** (`ReviewQueue.jsx`):
  - Added `showHelpPanel`, `helpStage`, `helpContent`, `isLoadingHelp` state.
  - Streaming explanation via SSE reusing `/api/sentence-study/explain-word` and `/api/sentence-study/simplify`.
  - Stage indicator UI with progress bar.
  - Dynamic content: highlights → explain-word, no highlights → simplify.
- **Backend** (`review.py`):
  - Extended quality validation to accept `quality=2` (remembered after help).
  - Updated comments and docstrings.

#### Verification
- **Browser Test**: Full flow verified (Forgot → Stage 1 → Stage 2 → Remembered → Next item).
- **Design Doc**: `docs/plans/2026-01-06-review-helper-design.md`.

### ✅ Memory Curve Optimization (2026-01-07)
**Fixed semantic inconsistencies and code duplication in memory curve calculation.**

#### Issues & Fixes
- **Semantic Mismatch**: Documentation claimed X-axis was "days since learning", but code used "SM-2 interval".
  - **Resolution**: Updated doc to reflect reality (Interval is more useful for SM-2).
- **Misleading Naming**: `total_words_analyzed` actually tracked review count.
  - **Resolution**: Renamed to `total_reviews`.
- **Code Duplication**: `review.py` duplicated logic from `performance.py`.
  - **Resolution**: Refactored to share `get_memory_curve_data()`.

#### Verification
- **Test**: `tests/test_api_stats.py` passed.
- **Manual**: Verified API response format remains consistent.

### ✅ Unclear Sentence "Meaning" Option (2026-01-07)
**Enhanced "Unclear" flow with a specific option for comprehension gaps beyond vocab/grammar.**

#### Features
- **New Option**: "Meaning" (Context) added to the Unclear choice modal.
- **Updated Labels**: Renamed options for better clarity:
  - 📖 **Words** (was Vocabulary)
  - 🔧 **Structure** (was Grammar)
  - 🧩 **Context** (New, Meaning)
  - 🤯 **Everything** (was Both)
- **Targeted Explanation**: New `meaning_stage1` prompt focuses on paraphrasing, core message("the point"), and subtext, rather than just simplifying words or splitting sentences.
- **Full Integration**: 
  - Tracks `diagnosed_gap_type="meaning"` in database.
  - Updates Profile Stats with specific "句意问题" (Meaning Issues) count.
  - Visualized in Performance Report (Amber color).

#### Implementation
- **Frontend**: Updated `constants.js` labels, `CompletedView.jsx` legend/colors, `SentenceInspector.jsx` logic.
- **Backend Service**: Added `meaning_stage1` prompt in `sentence_study_service.py`.
- **API/ORM**: Updated `sentence_study.py` diagnosis logic and `orm.py` schema comments.


### ✅ Clean Code Initiative (2026-01-08)
**Refactoring monolithic files for better maintainability.**

#### Sentence Study Router Refactoring
- **Problem**: `sentence_study.py` grew to 1254 lines, mixing models, logic, and routing.
- **Solution**:
  - Extracted 14 Pydantic models to `app/models/sentence_study_schemas.py`.
  - Reduced router size by ~220 lines.
  - Improved separation of concerns.
- **Verification**: 9/9 backend tests passed.

### ✅ Article Sorting by Recent Activity (2026-01-08)
**Articles in Reading and Sentence Study pages now sorted by most recent activity.**

#### Features
- **Smart Sorting**: Articles that were recently read or studied appear at the top of the list.
- **Visual Indicator**: Orange **⚡ RECENT** badge for articles accessed within 24 hours.
- **Cross-Mode Consistency**: Same sorting logic applied to both Reading Mode and Sentence Study.

#### Implementation
- **Backend** (`content.py`): Extended article status API to return `last_studied_at` timestamp from `SentenceLearningRecord`.
- **Frontend** (`ReadingMode.jsx`): Merged timestamps and sorted by `max(last_read, last_studied_at)`.
- **Frontend** (`SentenceStudy.jsx`): Added `fetchStatusAndSort` helper used in all article-loading code paths (selectBook, URL navigation, last session restoration).
- **UI** (`ArticleListView.jsx` × 2): Added Zap icon RECENT badge with orange styling.

#### Verification
- **Manual**: Verified sorting and RECENT badge in both Reading and Sentence Study modes.

### ✅ Sentence Study Mobile & Explanation Fixes (2026-01-08)
**Fixed mobile layout issues and markdown rendering for word/phrase explanations.**

#### Mobile Layout Fixes
- **Scrollbar Issue**: Changed `h-screen` to `h-dvh` (dynamic viewport height) to properly handle mobile browser chrome.
- **Content Overflow**: Added `overflow-hidden` to prevent unwanted scrollbars on initial load.
- **Long Content Layout**: Dynamic `justify-start`/`justify-center` based on whether explanations are shown, keeping sentence visible when explanations are long.

#### Phrase Explanation Rendering
- **Problem**: Markdown headers (`## Meaning`, `## Examples`) were not rendering correctly; content appeared all bolded with no line breaks.
- **Root Cause**: SSE streaming broke newlines - when LLM chunks contained `\n`, they were lost during SSE parsing.
- **Solution**:
  - **Backend** (`sentence_study.py`): Encode newlines as `[NL]` markers before sending via SSE.
  - **Frontend** (`sseParser.js`): Decode `[NL]` markers back to actual `\n` characters.
  - **ReactMarkdown** (`WordInspector.jsx`): Added `h2`/`h3` component handlers for proper header styling.
- **Prompts** (`sentence_study_service.py`): Updated word/phrase explanation prompts to use markdown format with headers.

### ✅ Autonomous Verification System (2026-01-09)
**Enabling AI to self-verify code changes before notifying users.**

#### Problem
AI coding assistants often complete changes without verifying correctness, requiring human intervention to catch errors that could have been detected automatically.

#### Solution: Post-Change Verification Skill

| Component | Path | Purpose |
|-----------|------|---------|
| **Health Check API** | `/api/verify/health` | Aggregates frontend/backend errors, DB status |
| **Log Reader** | `log_collector.get_recent_errors()` | Reads unified.log with time filtering |
| **Verification Skill** | `docs/skills/post-change-verification.md` | Decision tree for when/how to verify |

#### Health Check Response
```json
{
  "status": "healthy|unhealthy",
  "error_count": 0,
  "warning_count": 0,
  "frontend_errors": [],
  "backend_errors": [],
  "db_connected": true,
  "summary": "✅ System healthy. No errors in the last 60 seconds."
}
```

#### Verification Workflow
1. **Always**: Call `/api/verify/health` after changes
2. **If UI change**: Use Chrome DevTools MCP for visual verification
3. **If unhealthy**: Fix errors before notifying user

#### Files Changed
- `app/services/log_collector.py`: Added `get_recent_logs()`, `get_recent_errors()`
- `app/api/routers/verify.py`: NEW - Health check endpoint
- `app/core/db.py`: Added `get_db_health()`
- `app/main.py`: Registered verify router
- `docs/skills/post-change-verification.md`: NEW - Verification skill
- `CLAUDE.md`: Added skill reference

### ✅ Dictionary Reliability & Testing (Phase 52) (2026-01-10)
**Established "Golden Standard" testing framework to prevent dictionary parsing regressions.**

#### Problem
- Parsing logic modification was high-risk, often breaking one feature while fixing another.
- Missing specific data points (e.g., verb grammar `[transitive]`) causing incorrect display.
- No automated way to verify parser output against "truth" (actual dictionary HTML).

#### Solution: Golden Standard Framework
- **Snapshot Testing**: Capture raw HTML (`.html`) and verified JSON (`_expected.json`).
- **Tools**: `scripts/generate_ldoce_golden.py` to auto-generate test data.
- **Test Suite**: `tests/test_ldoce_parser_golden.py` performs deep comparison and critical field checks.
- **Coverage**: Initial coverage for example word "hoist" (verb/noun homographs).

#### Fixes Implemented
- **Grammar Extraction**:
  - Fixed missing `[transitive]` label for verbs.
  - Logic now extracts entry-level grammar from `.entryhead` and applies as fallback to senses.
- **Verification**: Browser validated against golden standard image.

#### Files
- `app/services/ldoce_parser.py`: Logic fix.

### ✅ Review Queue UX Enhancements (Phase 53) (2026-01-16)
**Optimized Review Queue experience with clickable help words and visual cues.**

#### Features
- **Clickable Help Words**: "Forgot" panel help explanation now features a clickable version of the sentence.
- **Contextual Lookup**: Clicking highlighted words in the help panel triggers the dictionary/AI inspector.
- **Visual Cues**: Added pulse animation to highlighted words to guide user interaction.
- **Layout Optimization**: Removed duplicate sentence display; main card remains visible and interactive when help is shown.

#### Implementation
- **Frontend**: `ReviewQueue.jsx`
  - Integrated `useWordExplainer` hook.
  - Enhanced `HighlightedSentence` with `clickable` prop and CSS pulse animation.
  - Conditional rendering logic to toggle interactivity.

#### Verification
- **Manual**: Verified interaction flow (Forgot -> Click Highlight -> Inspector).




### ✅ Visual Consistency & Explanation UI (Phase 54) (2026-01-16)
**Unified the "Help" experience across Study and Review modes with a refined visual palette.**

#### Problem
- Review Queue had a legacy "help panel" design (Orange/Yellow).
- Sentence Study had a different design.
- The original "Green/Cyan/Purple" palette felt disconnected ("Green" implies success, not help).

#### Solution
- **Unified Component**: `ExplanationCard.jsx` now powers both Sentence Study and Review Queue help views.
- **Knowledge Stream Palette**:
  - **Stage 1 (Simple)**: Cyan (Clean Info)
  - **Stage 2 (Detailed)**: Sky Blue (Structure)
  - **Stage 3 (Deep)**: Indigo (Deep Analysis)
- **Result**: A cohesive, professional "deep dive" aesthetic without semantic confusion.

#### Verification
- **Manual**: Verified consistent behavior in both modes.

### ✅ Optional HTTPS Support (Phase 55) (2026-01-16)
**Enabled optional HTTPS mode for Voice Development without breaking default workflow.**

#### Problem
- Mobile voice features (Gemini Live) require HTTPS to work (WebSocket/Mic constraints).
- Running HTTPS by default causes browser security warnings every time.
- PowerShell script logic forced a binary choice based on file existence, not intent.

#### Solution
- **Default to HTTP**: Standard `dev.ps1` runs in HTTP.
- **Opt-in HTTPS**: Added `-Https` flag to `dev.ps1`.
- **Frontend Config**: Updated `vite.config.js` to respect `HTTPS` env var and added `npm run dev:https`.

#### Verification
- **Manual**: Verified `./scripts/dev.ps1` runs on HTTP.
- **Manual**: Verified `./scripts/dev.ps1 -Https` runs on HTTPS (with certs).
- **Manual**: Verified `npm run dev` vs `npm run dev:https`.
