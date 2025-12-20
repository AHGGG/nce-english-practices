# Global Progress Tracker

## ✅ Phase 1: MVP - Web App Refactor (Completed)
- [x] **Architecture Switch**: Migrated from python CLI/TUI to FastAPI Web App.
- [x] **Core Features**:
    - [x] Theme/Vocabulary generation via LLM.
    - [x] Tense Matrix generation (4 time layers x 4 aspects).
    - [x] Local Caching (JSON).
- [x] **UI/UX Refreshed**:
    - [x] Modern Dark Mode interface (Glassmorphism).
    - [x] **Sidebar Navigation Layout** (Learn / Drill / Apply views).
    - [x] Responsive Design.

## ✅ Phase 2: The "Active Gym" Implementation (Completed)

### Stage 1: Learn (Context)
- [x] **Story Generator** (`/api/story`).
    - [x] Generic story generation based on topic & tense.
    - [x] Frontend: Story reader component.
    - [x] **Streaming Support**: Real-time output via NDJSON stream.

### Stage 2: Drill (Matrix)
- [x] **Interactive Inputs**:
    - [x] Click-to-Quiz (MCQ) implementation.
    - [x] Real-time grading feedback (Modal UI).

### Stage 3: Apply (Scenario)
- [x] **Application UI**:
    - [x] "Real-life Scenario" mode (`/api/scenario`).
    - [x] Interactive Grading & Feedback loop.

### Stage 4: Speak (Chat)
- [x] **Roleplay Agent**:
    - [x] Stateful Chat interface (`/api/chat`).
    - [x] "Secret Mission" prompt engineering.

## 🚧 Phase 3: Retention & Polish (Current Focus)
- [x] **Data Dashboard**:
    - [x] Backend Strategy pattern for stats (`/api/stats`).
    - [x] Frontend specific Visualization (XP, Recent Activity).
- [x] **PWA Support** (Installable App).
- [x] **Hybrid Dictionary System**:
    - [x] MDX Parser service (`readmdict` + `python-lzo`).
    - [x] `/api/dictionary` endpoint (with Resource Tunnel).
    - [x] **Fix**: `@@@LINK` redirect support.
    - [x] Frontend Popover UI.
- [ ] **Anki Export** / **SRS System**.

## 📅 Phase 4: Refinement & Advanced Features (Completed)
- [x] **Async Core**: Refactor blocking calls in `chat.py` & `main.py`.
- [x] **Grammar Coach**: "Polish" button for suggestions in Chat.
- [x] **Review System (SRS)**:
    - [x] Database Schema (ReviewNote, SRSReview).
    - [x] SRS Algorithm (SuperMemo-2).
    - [x] "Add to Review" UI Integration.
- [x] **Stats 2.0**:
    - [x] Practice Duration Tracker (Global Timer + Stats UI).
    - [x] **RolePlay Duration**: Accurate per-turn and voice session tracking.

## 🚀 Phase 5: Infrastructure & Scalability (Completed)
- [x] **Backend Refactoring (Red Flags Resolved)**:
    - [x] **Database Migration**: Synchronous SQLite -> **Async PostgreSQL**.
    - [x] **ORM Layer**: Validated SQLAlchemy 2.0 + Pydantic models.
    - [x] **Migrations**: Added **Alembic** version control for database schema.
    - [x] **Stateless Architecture**: Moved Chat Sessions from memory (`ACTIVE_SESSIONS`) to DB to support horizontal scaling/restarts.
    - [x] **Unified LLM Service**: Centralized OpenAI and Google GenAI client management (`app.services.llm`).
    - [x] **Log Bridge**: Frontend console logs now stream to backend terminal for unified debugging.
    - [x] **Testing Infrastructure**: Added `pytest` + `asyncpg` + `httpx` with `nce_practice_test` database.

## 📱 Phase 6: Mobile & Polish (Completed)
- [x] **Mobile Adaptation**:
    - [x] **Layout**: Bottom Navigation Bar (`MobileNav.jsx`).
    - [x] **Header Input**: Responsive Topic Input (`TopicInput.jsx`).
    - [x] **Access**: Configured `host: 0.0.0.0` and Firewall rules for external access.
- [x] **UX Polish**:
    - [x] **Loading States**: Scenarios/Chat load independently of Story stream.
    - [x] **Styling**: Fixed StoryReader text styles and bold highlighting.
    
## 🐛 Phase 7: Stability & Bug Fixes (Completed)
- [x] **Dictionary**:
    - [x] Fixed JS execution in MDX definitions (`DangerousHtml`).
    - [x] **Architecture**: Migrated Dictionary Content to Iframe Sandbox for perfect CSS/JS isolation (Fixes Sidebar & Scripts).
    - [x] **Sandbox**: Switched to `srcDoc` + `postMessage` isolation to block Extension conflicts (SES Error) and fix Infinite Scroll.
- [x] **LLM Reliability**:
    - [x] Fixed 500 error on Markdown-wrapped JSON responses (Robust Parsing).
    - [x] Fixed API hangs with 30s timeout settings.

## 🏗️ Phase 8: Architecture & Deployment Optimization (Completed)
- [x] **Analysis**:
    - [x] Completed Architecture Review (`review_report.md`).
    - [x] Updated `CLAUDE.md` to reflect React stack.
- [x] **Deployment**:
    - [x] **Dockerfile**: Multi-stage build (Node build -> Python runtime).
    - [x] **Main.py Refactor**: Remove Jinja2, serve React Static Files.
    - [x] **Code Cleanup**: Delete legacy `templates/` directory.
    - [x] **Service Layer Refactor**: Decouple business logic from `voice.py` router.

## 🎨 Phase 9: Visual & UX Overhaul (Completed)
- [x] **Concept**:
    - [x] Analyzed 4 candidate UI systems.
    - [x] Established "Cyber-Noir" direction (Synthwave + Ink & Paper).
    - [x] **Prototype**: Created `UnifiedDesignSystem.jsx` proof-of-concept.
- [x] **Implementation**:
    - [x] Global Tailwind Config updates (Design Tokens).
    - [x] Component Library Refactor (`src/components/ui`).
    - [x] View Migration (Learn, Drill, Apply).
    - [x] Custom Scrollbar styling.
    - [x] **Toast System**: Implemented non-blocking notifications.
    - [x] **Mobile Optimize**: Refined Chat/Apply layout for small screens.
    - [x] **Empty State 2.0**: Implemented "System Standby" screen with locked navigation to prevent phantom interaction.
    - [x] **Debug Infrastructure**: Fixed Log Bridge (Error Boundary + Stack Trace) for full-stack visibility.
    - [x] **Mobile Optimization**:
        - [x] **Core Data Slots**: Implemented Compact HUD Grid (2x3) with Auto-Collapse logic on scroll.
        - [x] **Transitions**: Smooth CSS animations for header collapse.
        - [x] **Typography**: Optimized font sizes for Learn (Story) and Apply (Scenario) for better readability.
        - [x] **Roleplay Layout**: Optimized ChatCard to maximize vertical space (Collapsible Mission Brief + Compact Header).
        - [x] **Transformer Input**: Integrated Connection Status & Voice Visualizer into the Input Bar, removing the top status bar entirely.
        - [x] **Challenge Layout**: Compacted ScenarioCard (padding, fonts, spacing) to eliminate scrolling for standard tasks.
        - [x] **Drill Matrix**: Implemented Responsive Matrix Grid (Table on Desktop, Stacked Cards on Mobile) to fix horizontal scrolling.
        - [x] **Context Story Layout**: Optimized Typography and Spacing in StoryReader to increase information density and reduce scrolling.

## 🤖 Phase 10: Coach-Centric Architecture (Completed)
- [x] **Backend Engine**:
    - [x] **CoachService**: Centralized session management and LLM orchestration.
    - [x] **Tool-Use Pattern**: Migrated from simple chat to Tool-Calling Agent (`show_vocabulary`, `present_story`, `start_drill`).
    - [x] **DSML Parser**: Implemented robust parsing for DeepSeek's raw XML-style tool calls.
    - [x] **On-Demand Generation**: Implemented fallback logic to generate stories on-the-fly (`_generate_story`).
- [x] **Audio Upgrade**:
    - [x] **TTS Engine**: Integrated Microsoft Edge TTS (`edge-tts`) for high-quality, free Neural voices.
    - [x] **Voice Control**: Full STT (WebSpeech) + TTS loop for hands-free practice.
- [x] **Frontend Experience**:
    - [x] **Coach Canvas**: Dynamic workspace that renders UI components (Vocab/Story/Drill) based on Agent commands.
    - [x] **Cyber-Noir Design**: Hard-edged, information-dense "Terminal" aesthetic for the Coach interface.
    - [x] **Optimistic UI**: Instant improvements in chat responsiveness.

## 🎙️ Phase 11: Voice Vendor Integrations (Completed)
- [x] **ElevenLabs**:
    - [x] Integration with Python SDK v3 (`elevenlabs.client`) -> Migrated to `httpx`.
    - [x] Confirmed TTS streaming validation.
    - [x] **New Features**: Added Text-to-SFX and Speech-to-Speech (Voice Changer).
- [x] **ElevenLabs**:
    - [x] Integration with Python SDK v3 (`elevenlabs.client`) -> Migrated to `httpx`.
    - [x] Confirmed TTS streaming validation.
    - [x] **New Features**: Added Text-to-SFX and Speech-to-Speech (Voice Changer).
    - [x] **UI**: Integrated STTPanel for REST STT and **Realtime STT (WebSocket)** for streaming.
- [x] **Deepgram**:
    - [x] **Refactor**: Removed official SDK dependency in favor of raw `httpx` and `websockets` (Nova-3).
    - [x] **TTS**: Aura Voice (REST + Streaming).
    - [x] **STT**: Nova-3 (REST + Live WebSocket).
- [x] **Google (Gemini)**:
    - [x] **TTS**: Multimodal Generation (Live API + WAV Header Injection).
    - [x] **STT**: Multimodal Transcription.
- [x] **Automated Verification**: Implemented "Round-Trip" testing framework (`VoiceTester`) verifying Semantic Integrity across all vendors.
- [x] **Conversation Loop**: Integrated generic STT -> LLM -> TTS loop for full-duplex voice testing.
- [x] **UI Refactor**: Reorganized Voice Lab to **Vendor-Centric Layout** (Manufacturer Tabs).
- [x] **Router Consolidation**: Consolidated all routers from `app/routers` into `app/api/routers` for architectural consistency.

## ??? Phase 12: Engineering Optimization & DX (Completed)
- [x] **Project Structure Optimization**:
    - [x] **Model Consolidation**: Refactored scattered models (pp/models.py, pp/db_models.py) into a structured pp/models/ package (schemas.py, orm.py).
    - [x] **Import Cleanup**: Updated all codebase imports to use the new modular structure.
    - [x] **Cleanup**: Removed legacy and ambiguous model files.
- [x] **Developer Experience (DX)**:
    - [x] **Scripting**: Added PowerShell automation scripts (scripts/dev.ps1, scripts/test.ps1) for consistent cross-platform development.
    - [x] **Testing**: Solved Windows-specific event loop conflicts by isolating E2E and Backend tests in the test runner script.
    - [x] **Cleanup**: Removed expired E2E tests (`test_navigation.py`) and implemented offline fallbacks.

## 🔧 Phase 13: SDK Removal Refactoring (Completed 2025-12-19)
- [x] **Deepgram**:
    - [x] Removed `deepgram-sdk` dependency in favor of raw `httpx` + `websockets`.
    - [x] Fixed WebSocket connections: `extra_headers` → `additional_headers` (websockets v15.x).
    - [x] Live STT, Streaming TTS, and Voice Agent endpoints verified working.
- [x] **ElevenLabs**:
    - [x] Removed `elevenlabs` SDK dependency in favor of raw `httpx`.
    - [x] Refactored `ElevenLabsProvider`: `tts()`, `stt()`, `text_to_sfx()`, `speech_to_speech()`.
    - [x] All methods now use direct REST API calls with streaming support.
- [x] **Frontend**:
    - [x] Simplified Deepgram VoiceLab UI to 3-tab layout (Live STT, Voice Agent, Tools).
    - [x] Added `ws: true` to Vite proxy for `/api` WebSocket routes.

## 🧪 Phase 14: Automated Testing Infrastructure (Completed 2025-12-19)
- [x] **Backend Integration Tests**:
    - [x] Implemented TTS/STT round-trip verification for all vendors (Google, ElevenLabs, Deepgram).
    - [x] Added specific tests for ElevenLabs STS and SFX.
- [x] **WebSocket Verification**:
    - [x] Added automated connection tests for Deepgram Live STT and Streaming TTS.
    - [x] Added manual verification script (`verify_deepgram_websocket.py`) for full-duplex flows.
- [x] **Test Utilities**:
    - [x] **PCM Audio Sim**: Created utilities to simulate real-time audio streaming from WAV files.
    - [x] **Semantic Similarity**: Added fuzzy matching for STT verification.
    - [x] **Log Capture**: Investigated and fixed backend log capture for automated verification.
- [x] **Cleanup**:
    - [x] Removed legacy E2E tests (learn, apply, drill) and redundant verification scripts.
    - [x] Consolidated testing structure into `tests/test_voice_lab_integration.py` and `tests/test_deepgram_websocket.py`.
