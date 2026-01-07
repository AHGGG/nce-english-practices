# Product Roadmap: NCE Active Grammar Gym

> **Core Philosophy**: "Active Usage over Passive Memorization."
> **Strategy**: A 4-Stage Learning Path (Context -> Drill -> Apply -> Speak).

## 0. Strategic Pivot (2025-12-27): The Voice-First CI Architecture
> **New Core Philosophy**: "Unified Contextual Acquisition."
> **Shift**: Moving away from the discrete 4-stage model (Drill/Apply/Speak) to a **single, unified Voice Interface** that guides the user through the input-intake-acquisition loop using CI principles (i+1, 98% Comprehension, Low Anxiety).

### Core Features (Implemented 2025-12)
- [x] **Negotiation Loop**: "Huh?" button triggers simplified explanation (L1/L2) -> "Got it" moves to next.
- [x] **Multi-Example Navigation**: Browse multiple senses and examples for deep context.
- [x] **Context Enhancement**:
    - [x] **Rich Context**: Backend uses definition and POS to ground explanations (Fixes "Context is not enough").
    - [x] **Session Sync**: Navigation resets session to prevent stale context.
    - [x] **TTS Optimization**: Prompts forbid markdown/asterisks for clean audio.
- [x] **Step History**: Back/Forward navigation through the negotiation dialogue.
- [x] **Scaffolding**: Click-to-reveal definitions and translations.
- [x] **Playback Control**: Speed adjustment (0.5x, 0.75x, 1.0x) and auto-replay.
- [x] **Word List Focus**: Practice vocabulary from specific books (CET4/6, COCA).
    - [x] **Random Selection**: Uses `func.random()` for variety instead of sequential order.
    - [x] **SKIP Support**: Exclude current word when fetching next (prevents repetition).
- [x] **Ingestion Strategy**: Content-driven learning from external sources.
    - [x] **RSS Service**: Basic feed parsing and sentence extraction (2025-12-28).
    - [x] **EPUB Service**: Local EPUB parsing with full-text articles (2025-12-28).
        - [x] **Structured Parsing**: Block-level extraction (Headings, Paragraphs, Images) for better layout preservation (2026-01-04).
    - [x] **Word Sense Disambiguation**: LLM-powered sense selection based on context.
    - [x] **Content Provider Architecture** (2025-12-29):
        - [x] `ContentBundle` unified data model for all content sources.
        - [x] `BaseContentProvider` abstract interface.
        - [x] 4 Providers implemented: Epub, RSS, Podcast, PlainText.
        - [x] `ContentFeeder` migrated to use `ContentService`.
    - [x] **EPUB Image Support** (2025-12-29):
        - [x] Image extraction and in-memory caching in `EpubProvider`.
        - [x] `/api/reading/epub/image` endpoint for serving images.
        - [x] `MemoizedImage` component with lazy loading.
        - [x] `Lightbox` modal with ESC-to-close.
        - [x] Sentence-image interleaving in Reading Mode.
        - [x] Mobile inspector panel fixed (z-index, fixed positioning).
- [ ] **Frontend Mode Separation** (Planned):
    - [ ] Specialized Views: Podcast Mode, Reading Mode, Vocabulary Mode.
    - [ ] Source-Aware Drill-down: Record learning context for each word.

## [LEGACY] 1. Stage 0: Context & Concept (The "Learn" Stage)
*(Note: This 4-stage model is being deprecated in favor of the unified voice flow)*
*For beginners or starting a new concept.*
- [x] **Contextual Story Generator**:
    - [x] **Streaming Support**: Real-time story generation for better UX.
    - [x] **Micro-Scenarios**: Real-time context generation for dictionary examples (2025-12-27).
    - Generates a short, engaging story that naturally uses the target tense/aspect multiple times.
    - **Why**: Primes the brain with pattern recognition before analyzing rules.
- [ ] **Interactive Explainer**:
    - Click any sentence in the story to see a breakdown: "Why was *had been running* used here?"
    - **Tech**: LLM analysis on demand.

## 2. Stage 1: The Matrix Gym (The "Drill" Stage)
*For building speed and mechanical accuracy.*
- [x] **Interactive Matrix** (Current Core):
    - Transformation practice: "Change this Present Simple sentence to Future Perfect."
    - **Upgrade**: Add strict input validation and "Give me a hint" button.
- [ ] **comparative Analysis**:
    - Side-by-side view of commonly confused tenses (e.g., Simple Past vs. Present Perfect).

## 3. Stage 2: Active Application (The "Use" Stage)
*For checking understanding in isolation.*
- [ ] **Smart Cloze Mode**:
    - The system hides the *critical* grammar components (auxiliary verbs, participial endings) based on the target tense.
    - *Not just random words*, but structurally relevant deletions.
- [ ] **Sentence Scramble**:
    - Reassemble complex sentences to internalize word order (syntax).

## 4. Stage 3: Real-World Simulation (The "Speak" Stage)
*The ultimate goal: Spontaneous usage.*
- [x] **Scenario Roleplay**:
    - "You are at a cafe. Order a coffee using *would like*."
    - Open-ended chat interface with an AI persona.
- [ ] **Mission System**:
    - The AI judges if you *achieved the goal* AND *used the grammar correctly*.
- [x] **Grammar Coach** (New):
    - **Contextual Refinement**: "Polish my sentence" button on user messages.
    - AI suggests more native/idiomatic expressions based on the conversation context.

## 5. Stage 4: Review & Retention (The "Keep" Stage)
*For long-term mastery.*
- [x] **Review Notes System**:
    - Extract key vocabulary/grammar points from chat sessions.
    - User accepts/rejects notes.
- [x] **Spaced Repetition (SRS)**:
    - Schedule reviews for accepted notes (Anki-style algorithms).

## Technical Foundation & Deployment Updates
- [x] **Backend**: New endpoints for `/api/story` and `/api/chat`.
- [x] **Frontend**: New "Mode Switcher" (Learn / Drill / Apply / Speak) in the navigation.
- [x] **State**: Persist user progress per stage (Now in PostgreSQL).
- [x] **Async Architecture**: Refactor synchronous LLM calls to prevent blocking (Complete).
- [x] Dictionary Fixes: Support `@@@LINK` redirects and relative asset pathing.
- [x] Dictionary Fixes: Fixed missing spaces in LDOCE collocation examples (2026-01-05).
- [x] Testing Infrastructure: Refactored legacy tests into a modern `pytest` suite for voice integration and WebSocket verification.
- [x] **Mobile Adaptation**:
    - [x] `TEXT_DELTA`: Streaming text incremental updates.
    - [x] `TEXT_MESSAGE_START/END`: Message lifecycle events (Segmentation).
    - [x] `STATE_SNAPSHOT`: Complete state for recovery/initialization (2025-12-22).
    - [x] `STATE_DELTA`: JSON Patch state updates (Implemented via jsonpatch).
    - [x] `MESSAGES_SNAPSHOT`: History synchronization event.
    - [x] `STREAM_START/END/ERROR`: Lifecycle events.
    - [x] **AUI Streaming**: Complete AG-UI compatible streaming system (2025-12-22).
        - [x] Backend deep copy bug fixes in `stream_vocabulary_flip()`.
        - [x] Frontend hooks violation fix in `StoryReader` component.
        - [x] All 4 streaming scenarios verified working (Story, Vocabulary, State Sync, Vocab Patch).
        - [x] **Context Resources**: Grouped by Sense for better clarity (2025-12-24).
        - [x] **Translation Toggle**: Chinese hidden by default, click to reveal (2025-12-24).
    - [x] **AUI Bi-directional (Phase 2)**: (2025-12-22)
        - [x] Backend Input Service (Postgres Persistent).
        - [x] Interactive UI Components.
        - [x] Human-in-the-Loop Demo.
    - [x] **AUI Protocol Gaps (Phase 3)**: (2025-12-22)
        - [x] `INTERRUPT` Event for explicit control flow.
        - [x] Component Schema Validation (`aui_schema.py`).
    - [x] **AG-UI Protocol Alignment (Phase 4)**: (2025-12-23)
        - [x] Enhanced `InterruptEvent` with `interrupt_id` and `payload` fields.
        - [x] Enhanced `RunFinishedEvent` with `interrupt` outcome support.
        - [x] Interactive `InterruptBanner` component with action buttons.
        - [x] Enhanced `RunFinishedEvent` with `interrupt` outcome support.
        - [x] Interactive `InterruptBanner` component with action buttons.
        - [x] Demo endpoint for Study Plan confirmation flow.
    - [x] **Reading Mode Stylization (2025-12-29)**:
        - [x] Deep refactor of `ReadingMode.jsx` to Cyber-Noir Design System.
        - [x] Replaced hardcoded styles with `components/ui` primitives (Button, Card, Tag).
        - [x] Implemented sharp aesthetics (no rounded corners, hard shadows).
        - [x] **Performance Optimization**: `React.memo` + CSS-based highlighting to reduce click latency (<50ms).
    - [x] **AUI Mobile Compatibility (Phase 5)**: (2025-12-25)
        - [x] Robust Reconnection: Auto-reconnect, Backoff, Visibility handling in `useAUITransport`.
        - [x] Responsive Layout: `AUIStreamingDemo` stack layout on mobile.
        - [x] Component Optimization: Touch-friendly sizing for all inline components (`InterruptBanner`, `MessageList`).
        - [x] UI Fixes: Improved flexbox centering to prevent clipping on overflow.
    - [x] **AUI Transport Consolidation (2025-12-26)**:
        - [x] **Cut SSE**: Removed dual transport complexity.
        - [x] **Unified WebSocket**: Standardized all streaming on WebSocket.
        - [x] **Frontend Refactor**: Simplified `useAUITransport` and Hydrator.
        - [x] **Cleanup**: Removed legacy SDKs (`deepgram-sdk`, `elevenlabs`), SSE scripts, and unused routers.
- [x] **Deployment & Architecture Optimization** (New):
    - [x] **Dockerization**: Multi-stage build for React (Vite) + FastAPI.
    - [x] **SPA Serving**: Configure FastAPI to serve React static files (remove Jinja2).
    - [x] **Code Cleanup**: Remove legacy `templates/` directory and synchronous DB patterns.
    - [x] **Service Layer Refactor**: Decouple business logic from `voice.py` router.
    - [x] **Local Deployment**: Added `deploy/` with `docker-compose`, Nginx, and management scripts (2025-12-31).
        - [x] **Fixes (2026-01-06)**: Fixed alembic inclusion, static file serving, and build caching.
        - [x] **Security (2026-01-06)**: Added HTTP Basic Auth and migration stability fixes.
    - [x] **Navigation Dashboard**: Unified `/nav` page for easy access to all routes (2025-12-31).

## 6. Tools & Ecosystem (The "Support" Layer)
*Features that support the learning journey.*
- [x] **Hybrid Dictionary (Crucial)**:
    - **Layer 1 (Fast)**: **MDX Support**. Import local dictionary files (e.g., Mdict) for authoritative definitions.
    - **Layer 2 (Context)**: "Explain in Context" AI button for specific sentence nuances.
- [x] **Log Bridge**:
    - [x] **Unified Debugging**: Stream frontend logs (console.log) to the backend terminal via `navigator.sendBeacon` (non-blocking).
    - [x] **RLock Fix**: Fixed backend self-deadlock in `log_collector.py`.
- [x] **Data Dashboard**:
    - [x] **Visual Stats**: Daily streaks, words encounter counter, practice volume.
    - [x] **Time Tracking**: Record total practice duration per session.
    - [x] **History**: Log of all completed quizzes and missions.
    - [x] **Performance Report V1-V3** (2025-12-29 ~ 2025-12-30):
        - [x] V1: KPIs (vocab size, mastery rate, comprehension, study time), activity heatmap, difficult words, source distribution.
        - [x] V2: Due reviews count, learning streak, reading word count, milestone badges (vocab + streak).
        - [x] V3: Daily goals (4 types with circular progress), Memory curve (actual vs Ebbinghaus).
    - [x] **Reading Session Tracking** (2025-12-30):
        - [x] `ReadingSession` model + `reading_sessions` table.
        - [x] Mixed-signal quality assessment (time-ratio, scroll-behavior, word-clicks).
        - [x] Frontend `ReadingTracker.js` with heartbeat, visibility API, sentence IntersectionObserver.
        - [x] `/api/reading/*` endpoints (start, heartbeat, word-click, end, stats).
        - [x] `get_reading_stats_v2()` with validated word count (skimmed = 0, low = 30%, medium = 70%, high = 100%).
    - [x] **Sentence Study Mode (ASL)** (2026-01-01):
        - [x] `SentenceLearningRecord` ORM model + Alembic migration.
        - [x] `/api/sentence-study/*` endpoints (progress, record, simplify, overview).
        - [x] Frontend `SentenceStudy.jsx` with article list, sentence view, Clear/Unclear flow.
        - [x] Difficulty choice modal (Vocabulary/Grammar/Both).
        - [x] LLM-powered sentence simplification (vocabulary/grammar/context).
        - [x] **Article Overview**: English summary + Chinese translation before study.
        - [x] Key topics extraction and difficulty hints.
        - [x] **UX Enhancements** (2026-01-02):
            - [x] **Collocation Highlighting**: AI-based phrase detection & clickable units.
            - [x] **Progressive Explanations**: Default -> Simple -> Chinese Deep Dive workflow.
            - [x] **Rich Text**: Markdown rendering for explanations.
        - [x] **Book Shelf Navigation** (2026-01-02):
            - [x] **Hierarchical Navigation**: Library -> Book -> Chapter List -> Study Mode.
            - [x] **Context Restoration**: Auto-resume last studied book/chapter on return.
            - [x] **Library API**: `/api/reading/epub/books` endpoint.
        - [x] **SRS Integration** (2026-01-02~03):
            - [x] `scheduled_review` and `review_count` fields in `SentenceLearningRecord`.
            - [x] Smart interval calculation (gap-type aware: collocations get shorter intervals).
            - [x] `GET /queue`: Review queue endpoint.
            - [x] `POST /review`: Review completion endpoint.
            - [x] `ReviewQueue.jsx` frontend with sentence display.
        - [x] **User Comprehension Profile** (2026-01-02~03):
            - [x] `UserComprehensionProfile` ORM model + migration.
            - [x] `GET /profile`: Profile stats endpoint.
            - [x] `ProfileStats.jsx` frontend with actionable metrics:
                - Study summary (sentences studied, clear/unclear counts, pass rate).
                - Gap breakdown (vocab/grammar/collocation distribution).
                - Words to review (from `WordProficiency` difficulty > 0.3).
                - Insights and recommendations.
            - [x] Fixed diagnosis logic: phrase clicks always override to 'collocation'.
            - [x] Fixed UI: Correct Tailwind color classes for progress bars.
        - [x] **UX Optimizations** (2026-01-03):
            - [x] **3-Stage Progressive Simplification**:
                - Stage 1: English simplification (vocab/grammar/both).
                - Stage 2: Detailed breakdown with examples.
                - Stage 3: 中文深度解释 (Chinese deep dive).
            - [x] **Unclear Sentence Features** (2026-01-06):
                - [x] **Review Highlighting**: Unclear sentences highlighted in Completed View and Reading Mode.
                - [x] **Color Coding**: Orange (Vocab) / Blue (Grammar) / Red (Both).
                - [x] **Sentence Inspector**: Inline panel for progressive explanations (Stage 1-3).
            - [x] **Streaming LLM**: `/simplify` returns SSE for real-time text.
            - [x] **LLM Caching**: `/simplify` and `/explain-word` cache results by hash key.
            - [x] **Mobile UI**: Larger touch targets (py-4), flex-wrap, touch-manipulation.
            - [x] **Bugfix**: Collocations cleared immediately on sentence change.
            - [x] **LLM Cache Persistence** (2026-01-03):
                - `ArticleOverviewCache` and `SentenceCollocationCache` ORM models.
                - Alembic migration `552a79d1e801_add_llm_cache_tables.py`.
                - Two-tier cache: in-memory + PostgreSQL for `overview` and `collocations`.
                - Cache survives server restarts.
            - [x] **Collocation Prefetching** (2026-01-03):
                - `/prefetch-collocations` endpoint for background lookahead.
                - Frontend auto-prefetches next 3 sentences when viewing current.
                - Uses `asyncio.create_task()` for non-blocking background generation.
            - [x] **Bug Fixes** (2026-01-03):
                - Fixed SSE cache truncation (multi-line content now sent line-by-line).
                - Fixed streaming race condition with request ID pattern.
                - Added ReactMarkdown rendering for simplified content.
                - Added max-height scroll for long explanations.
            - [x] **SM-2 Review System** (2026-01-04):
                - `ReviewItem` and `ReviewLog` ORM models with SM-2 parameters.
                - Alembic migration `4f0adbca8a15_add_review_system_tables.py`.
                - New `/api/review/*` router with SM-2 algorithm (queue, complete, create, stats, memory-curve).
                - Auto-creation of ReviewItems in `record_learning` when user marks unclear or looks up words.
                - Updated `ReviewQueue.jsx` with card-based 3-button rating UI (忘了/想起来了/太简单).
            - [x] **Review Helper** (2026-01-06):
                - Multi-stage explanation when clicking "忘了" (Forgot) in review.
                - Streaming LLM explanations reusing `explain-word` and `simplify` APIs.
                - Quality=2 for "remembered after help" (better than forgot, worse than remembered).
                - 3-stage progressive hints with visual stage indicator.
            - [x] **Full Article Review** (2026-01-04):
                - [x] **COMPLETED View**: Replaces redirect-to-list when article finishes.
                - [x] **Highlighting**: Shows full text with words/phrases looked up during study.
                - [x] **Stats**: Study summary (Clear Rate, Words Looked Up).
            - [x] **Reading-SentenceStudy Integration** (2026-01-04):
                - [x] **Cross-Mode Navigation**: URL params + "Deep Study" / "Read Full Article" buttons.
                - [x] **Unified Article Status API**: `/api/content/article-status` with combined progress.
                - [x] **Study Highlights in Reading Mode**: Words looked up during Sentence Study shown in amber.
                - [x] **Study Highlights in Reading Mode**: Words looked up during Sentence Study shown in amber.
                - [x] **ReviewItem Auto-Creation**: Reading Mode word lookups (2+) create SM-2 items.
                - [x] **Unified Word Explanation** (2026-01-05):
                    - [x] Shared `useWordExplainer` hook.
                    - [x] Streaming LLM Context Explanation in Reading Mode.
                    - [x] Progressive Styles ("Simpler please", "Chinese Deep Dive") in Reading Mode.
            - [x] **Critical Bug Fixes** (2026-01-05):
                - [x] **First Sentence Issue**: Fixed bug where first sentence was skipped in Study Mode due to legacy filtering.
                - [x] **Block-Based Model**: Migrated frontend to use structured `ContentBlock`s for accurate rendering.
    - [x] **SentenceStudy Refactoring** (2026-01-06):
        - [x] **Frontend Split**: Extracted `SentenceStudy.jsx` (1344 lines) into 5 focused views (`ArticleListView`, `StudyingView`, etc.) in `frontend/src/components/sentence-study/views/`.
        - [x] **Service Layer**: Created `sentence_study_service.py` for LLM streaming, caching, and SRS logic.
        - [x] **Router Slimming**: Reduced `sentence_study.py` router by ~14% (delegate to service).
    - [x] **Memory Curve Optimization** (2026-01-07):
        - [x] **Semantic Fix**: Clarified X-axis as "Review Interval" instead of "Days since learning" in documentation.
        - [x] **Code Cleanup**: Consolidated duplicate logic in `review.py` by calling `get_memory_curve_data`.
        - [x] **Naming**: Renamed misleading `total_words_analyzed` to `total_reviews`.
- [x] **Voice Vendor Lab**:
    - [x] **Internal Tool**: `/voice-lab` refactored to **Vendor-Centric Layout** (Google, Deepgram, ElevenLabs tabs).
    - [x] **SDK Removal**: Removed ElevenLabs and Deepgram SDKs in favor of raw `httpx` API calls.
    - [x] **Automation**: Added `VoiceTester` service for cross-vendor semantic verification.
    - [x] **Conversation Loop**: Added interactive STT-LLM-TTS loop for real-time testing.
- [x] **Audio Engine**:
    - [x] **TTS**: Text-to-Speech for all generated sentences (Browser Native or API).
    - [x] **Shadowing**: Record user audio and compare (via Voice Lab & Agents).

## 7. Visual & UX Overhaul (The "Cyber-Noir" System)
*Goal: Combine Synthwave aesthetics with Ink & Paper sharpness for a high-performance "Mental Gym".*
- [x] **Design Exploration**:
    - [x] Review candidate UIs (Ink, Neon, Nomadic, Synthwave).
    - [x] Prototype "Cyber-Noir" Unified System (High contrast, 1px borders, No glow).
- [x] **Core Design System**:
    - [x] **Tokens**: Define Colors (OLED Black, Neon Green/Pink), Typography (Serif Headers + Mono Data).
    - [x] **Components**: Rebuild primitives (Button, Input, Card, Modal) in `frontend/src/components/ui/`.
- [x] **View Implementation**:
    - [x] **App Shell**: Update Sidebar/Navbar to "Cyber-Noir" style.
    - [x] **Story Mode**: Apply Serif typography and high-contrast reading experience.
    - [x] **Drill Matrix**: Apply Monospace data aesthetic and snappy interactions.
    - [x] **Story Mode**: Apply Serif typography and high-contrast reading experience.
    - [x] **Drill Matrix**: Apply Monospace data aesthetic and snappy interactions.
    - [x] **Scenario/Chat**: Update message bubbles to "Hard Shape" style.
    - [x] **Reading Mode**: Refactored to strict Cyber-Noir token usage (2025-12-29).

## 8. Engineering Excellence (Optimization)
- [x] **Structure Optimization**: Consolidate models into `app/models/` package.
- [x] **DX**: Scripts for easy startup and testing (scripts/dev.ps1, scripts/test.ps1).
- [x] **Legacy Cleanup**: Removed expired E2E tests and formalized offline fallback logic.
- [x] **Large File Refactoring** (2025-12-31):
    - [x] **Database Module**: Split `app/database.py` into `app/database/` package (core, stats, story, review, etc.).
    - [x] **AUI Streaming Service**: Split `app/services/aui_streaming.py` into `app/services/aui/` package (story, vocab, demos, renderer).
    - [x] **Deepgram WebSocket Router**: Split `app/api/routers/deepgram_websocket.py` into `app/api/routers/deepgram/` package (live_stt, streaming_tts, voice_agent, unified_agent).
    - [x] **AUI Renderer Migration**: Moved `app/services/aui.py` into the new package as `renderer.py`.
    - [x] **Frontend Components** (2025-12-31):
        - [x] `ReadingMode.jsx` (739 lines) → `components/reading/` package (9 files).
        - [x] `PerformanceReport.jsx` (650 lines) → `components/performance/` package (14 files).
    - [x] **Dead Code Removal** (2025-12-31):
        - [x] Deleted unused services (`rss_service.py`, `epub_service.py`).
        - [x] Deleted legacy routers (`elevenlabs_websocket.py`).
    - [x] **Legacy Feature Cleanup** (2026-01-01):
        - [x] **Frontend**: Removed `/learn`, `/drill`, `/apply`, `/coach` pages and all related components.
            - Deleted Views: `Learn.jsx`, `Drill.jsx`, `Apply.jsx`, `Stats.jsx`, `Coach.jsx`.
            - Deleted Components: `Learn/`, `Drill/`, `Apply/`, `Layout/`, `Coach/`.
            - Deleted Context: `CoachContext.jsx`.
            - Refactored `App.jsx`, `NavDashboard.jsx`, `GlobalContext.jsx`, `client.js`.
        - [x] **Backend Generators**: Deleted `theme.py`, `sentence.py`, `story.py`, `quiz.py`, `scenario.py`, `coach.py`.
        - [x] **Backend Services**: Deleted `coach.py`, `chat.py`, `dsml_parser.py`, `review.py`.
        - [x] **Backend Database Modules**: Deleted `chat.py`, `coach.py`, `story.py`, `session_theme.py`.
        - [x] **Core Module**: Deleted `core/practice.py`.
        - [x] **Database Migration**: `8742f3599637_drop_legacy_tables.py` drops 7 unused tables.
        - [x] **AUI Demo Fix**: Replaced `StoryReader` with `MarkdownMessage` in demos.
        - [x] **Tests Deleted**: 10 obsolete test files removed.
    - [x] **Dashboard Simplification** (2026-01-02):
        - [x] Removed 11 unused metrics: vocab_size, mastery_rate, comprehension, daily_goals, heatmap, badges, streak, sources, recent_words, difficult_words, due_reviews.
        - [x] Retained only: study_time (with Sentence Study + Reading), reading_stats, memory_curve.
        - [x] Deleted 9 frontend widget/card components.
        - [x] New B-scheme layout: 3 KPI cards + Memory Curve chart.
    - [x] **Legacy Practice Cleanup** (2026-01-02):
        - [x] Deleted `app/api/routers/practice.py` (log_attempt API).
        - [x] Deleted `app/database/stats.py` (Attempt-based functions).
        - [x] Removed Attempt and UserGoal from ORM imports.
        - [x] Database Migration: `9c5d07931690_drop_attempts_and_user_goals_tables.py` drops `attempts` and `user_goals` tables.
        - [x] Updated frontend `client.js` to remove `logAttempt`, `fetchStats`.
        - [x] Updated tests in `test_api_stats.py`.

