
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
    - [x] **Robust Parsing**: Fixed 500 error on Markdown-wrapped JSON responses.
    - [x] **Timeout Handling**: Fixed API hangs with 30s timeout settings.

## 🏗️ Phase 8: Architecture & Deployment Optimization (Completed)
- [x] **Analysis**:
    - [x] Completed Architecture Review (`review_report.md`).
    - [x] Updated `CLAUDE.md` to reflect React stack.
- [x] **Deployment**:
    - [x] **Dockerfile**: Multi-stage build (Node build -> Python runtime).
    - [x] **Serve Static**: `main.py` serves React static files directly.
    - [x] **Code Cleanup**: Deleted legacy templates and simplified service layer.

## 🎨 Phase 9: Visual & UX Overhaul (Completed)
- [x] **Concept**:
    - [x] "Cyber-Noir" direction (Synthwave + Ink & Paper).
    - [x] **Prototype**: `UnifiedDesignSystem.jsx` proof-of-concept.
- [x] **Implementation**:
    - [x] Global Tailwind Design Tokens.
    - [x] Component Library Refactor (`src/components/ui`).
    - [x] View Migration (Learn, Drill, Apply).
    - [x] **Toast System**: Non-blocking notifications.
    - [x] **Mobile Optimization**: Compact HUD, Collapsible Headers, Responsive Tables.
    - [x] **Typography**: Optimized font hierarchy for readability.

## 🤖 Phase 10: Coach-Centric Architecture (Completed)
- [x] **Backend Engine**:
    - [x] **CoachService**: Centralized session management.
    - [x] **Tool-Use Pattern**: Agentic Command (show_vocabulary, etc.).
    - [x] **DSML Parser**: Robust XML-style tool call parsing.
- [x] **Audio Upgrade**:
    - [x] **Edge TTS**: High-quality free Neural voices.
    - [x] **Voice Control**: Full STT (WebSpeech) + TTS loop.
- [x] **Frontend Experience**:
    - [x] **Coach Canvas**: Dynamic UI workspace.
    - [x] **Cyber-Noir Design**: Hard-edged terminal aesthetic.
    
## 🎙️ Phase 11: Voice Vendor Integrations (Completed)
- [x] **ElevenLabs**:
    - [x] HTTPX migration (No SDK).
    - [x] TTS, STT, STS, SFX support.
    - [x] WebSocket Real-time STT.
- [x] **Deepgram**:
    - [x] HTTPX/Websockets migration (No SDK).
    - [x] Nova-3 STT (REST + Live).
    - [x] Aura TTS (REST + Streaming).
- [x] **Google (Gemini)**:
    - [x] Multimodal TTS/STT.
- [x] **Dashscope (Alibaba Cloud)**:
    - [x] **Qwen-ASR**: `qwen3-asr-flash` integration.
    - [x] **Qwen-TTS**: `qwen3-tts-flash` integration with WAV header wrapper.
    - [x] **Qwen-LLM**: `qwen3-30b-a3b` (Deep Thinking) integration in `LLMService`.
    - [x] **Verification**:
        - [x] "Round-Trip" semantic integrity tests.
        - [x] Automated vendor verification scripts (`verify_dashscope_llm.py`).
    - [x] **Verification**:
        - [x] "Round-Trip" semantic integrity tests.
        - [x] Automated vendor verification scripts (`verify_dashscope_llm.py`).
- [x] **UI**: 
    - [x] Integrated Vendor-Specific Labs for testing.
    - [x] Updated Voice Agents (ElevenLabs, Deepgram) to support Dashscope LLM provider selection.

## 🔧 Phase 13: SDK Removal Refactoring (Completed 2025-12-19)
- [x] **Deepgram**: Removed `deepgram-sdk`.
- [x] **ElevenLabs**: Removed `elevenlabs` SDK.
- [x] **Frontend**: Simplified Deepgram UI and fixed WebSocket proxying.

## 🧪 Phase 14: Automated Testing Infrastructure (Completed 2025-12-19)
- [x] **Backend**: Integration tests for all voice vendors.
- [x] **WebSocket**: Automated connection tests for Deepgram.
- [x] **Utilities**: PCM Simulation, Semantic Similarity, Log Capture.

## 🔧 Phase 15: Voice Agent Function Calling (Completed 2025-12-20)
- [x] **Agent Functions Module**: Created `app/services/agent_functions.py`.
    - [x] `lookup_word`: Dictionary lookup using MDX dictionaries.
    - [x] `get_example_sentences`: LLM-generated example sentences.
    - [x] `agent_filler`: Conversational filler ("Let me look that up...").
    - [x] `end_call`: Graceful call termination.
- [x] **Backend Integration**: Modified `deepgram_websocket.py`.
    - [x] `functions_enabled` query parameter.
    - [x] `FunctionCallRequest` event handling.
    - [x] Function execution and `FunctionCallResponse` sending.
- [x] **Frontend UI**: Updated `DeepgramVoiceAgent.jsx`.
    - [x] Toggle switch for enabling functions.
    - [x] Function call/result display in conversation.
