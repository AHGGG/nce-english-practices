
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

## 🎨 Phase 16: AUI Streaming System (Completed 2025-12-21)
- [x] **Event System**: Created AG-UI compatible event types (`app/services/aui_events.py`).
    - [x] `RENDER_SNAPSHOT`: Backward compatible with existing `AUIRenderPacket`.
    - [x] `TEXT_DELTA`: Streaming text incremental updates.
    - [x] `STATE_SNAPSHOT`: Complete state for recovery/initialization (2025-12-22).
    - [x] `STATE_DELTA`: JSON Patch state updates (Implemented via jsonpatch).
    - [x] `STREAM_START/END/ERROR`: Lifecycle events.
- [x] **Streaming Service**: Implemented `AUIStreamingService` (`app/services/aui_streaming.py`).
    - [x] `stream_story_presentation()`: Stream story with incremental text deltas.
    - [x] `stream_vocabulary_cards()`: Stream vocabulary cards progressively.
    - [x] `stream_vocabulary_flip()`: JSON Patch demo with granular card state updates (2025-12-22).
    - [x] **Bug Fix**: Replaced shallow `.copy()` with `copy.deepcopy()` to prevent state mutation (2025-12-22).
## 📆 Recent Updates (December 2025)

### ✅ AUI Extended Events Implementation (2025-12-22)
**完整实现 AG-UI 协议中缺失的事件类型，支持 Activity Progress、Tool Call、Run Lifecycle**

#### Backend Extensions
- [x] **Event System** (`app/services/aui_events.py`):
  - 新增 9 个事件类型：`ACTIVITY_SNAPSHOT`, `ACTIVITY_DELTA`, `TOOL_CALL_*` (4个), `RUN_*` (3个)
  - 新增对应的 Pydantic 事件类和 `create_activity_delta()` 辅助函数
  
- [x] **Streaming Services** (`app/services/aui_streaming.py`):
  - `stream_long_task_with_progress()` - 演示 Activity Progress 事件
  - `stream_tool_execution()` - 演示完整 Tool Call 生命周期
  - `stream_agent_run()` - 演示 Agent Run 成功/失败场景
  
- [x] **Demo Endpoints** (`app/api/routers/aui_demo_extended.py`):
  - `/api/aui/demo/stream/activity` - Activity Progress 演示
  - `/api/aui/demo/stream/tool-call` - Tool Call 演示
  - `/api/aui/demo/stream/agent-run` - Agent Run 演示（支持 fail 参数）

#### Frontend Extensions
- [x] **Stream Hydrator** (`frontend/src/components/aui/AUIStreamHydrator.jsx`):
  - 新增 `activities`, `toolCalls`, `runState` 状态管理
  - 实现 `aui_activity_snapshot/delta` 事件处理（使用 JSON Patch）
  - 实现 `aui_tool_call_*` 事件链处理
  - 实现 `aui_run_*` 生命周期事件处理
  - **修复**: 添加 `text_delta` 事件处理，支持 Story Stream 文本累积
  - 创建 3 个内联 UI 组件：
    - `ActivityProgressBar` - 实时进度条 + 状态徽章
    - `ToolCallTimeline` - 工具调用时间线（按 ID 分组）
    - `RunStatusBadge` - Agent 运行状态显示
  
- [x] **Component Fixes**:
  - `FlashCardStack.jsx` - 添加受控模式支持（支持外部 props 控制 `current_index`/`is_flipped`）
  - `StoryReader.jsx` - 已支持 props 变化响应（无需修改）
  
- [x] **Demo Page Refactor** (`frontend/src/views/AUIStreamingDemo.jsx`):
  - 采用 Playground 风格的左右分栏布局
  - 8 个演示卡片（2×4 网格）：Story/Vocabulary/State Sync/Vocab Patch + 4个扩展事件
  - 一键切换演示，选中高亮，实时 URL 显示

#### Testing & Verification
- [x] **Unit Tests** (26 tests passing):
  - `tests/test_aui_activity_events.py` (8 tests)
  - `tests/test_aui_tool_call_events.py` (10 tests)
  - `tests/test_aui_run_lifecycle.py` (10 tests)
  
- [x] **Verification Script**: `scripts/verify_aui_extended.py`
- [x] **Browser Testing**: ✅ 所有演示功能正常工作

#### Documentation
- [x] `walkthrough.md` - 完整实现文档
- [x] `task.md` - 任务追踪（所有阶段完成）

---

## 📊 Historical Milestones-12-22).
    - [x] **Bug Fix**: Replaced shallow `.copy()` with `copy.deepcopy()` to prevent state mutation (2025-12-22).
- [x] **SSE API Endpoints**: Added streaming routes (`app/api/routers/aui_stream.py`, `aui_stream_demo.py`).
    - [x] `GET /api/aui/stream/story`: Stream story presentations.
    - [x] `GET /api/aui/stream/vocabulary`: Stream vocabulary cards.
    - [x] `GET /api/aui/stream/vocab-patch-demo`: JSON Patch state delta demo.
    - [x] `GET /api/aui/stream/state-demo`: Complex state sync demonstration.
- [x] **Frontend Stream Hydrator**: Created `AUIStreamHydrator.jsx`.
    - [x] EventSource integration for SSE consumption.
    - [x] Text delta accumulation and component state updates.
    - [x] Dynamic component loading from AUI registry.
    - [x] Deep cloning with `structuredClone` for safe JSON Patch application (2025-12-22).
    - [x] Fixed endpoint paths to include `/api` prefix (2025-12-22).
- [x] **Testing Page**: Built `AUIStreamingDemo.jsx` with full test UI.
    - [x] User level selection (i+1 Scaffolding).
    - [x] Story and vocabulary streaming tests.
    - [x] JSON Patch card flip demo button (2025-12-22).
    - [x] State sync dashboard demo (2025-12-22).
    - [x] Route registered at `/aui-stream-demo`.
- [x] **Verification & Testing**: Comprehensive test coverage (2025-12-22).
    - [x] **Unit Tests**: Created `tests/test_aui_patch.py` - 8/8 tests passing.
    - [x] **Verification Script**: `scripts/verify_aui_streaming.py` for automated endpoint testing.
    - [x] **Manual Browser Testing**: All 4 streaming scenarios verified working.
    - [x] **Live Testing Results**: State Demo ✅, Vocab Patch Demo ✅, Story Streaming ✅, Vocab Cards ✅.
    - [x] **Bug Fixes** (2025-12-22):
        - [x] Fixed React hooks violation in `StoryReader.jsx` - moved early return before hooks.
        - [x] Fixed endpoint paths in `AUIStreamingDemo.jsx` - added missing `/api` prefix.

### ✅ AUI Text Message Lifecycle Events Implementation (Phase 1.1) (2025-12-22)
**实现了消息级生命周期事件，支持并发消息流和多 Agent/工具的文本分段**

#### Backend Extensions
- [x] **Event System** (`app/services/aui_events.py`):
  - 新增 `TEXT_MESSAGE_START` 和 `TEXT_MESSAGE_END` 事件类型
  - 更新 `AUIEvent` Union 类型支持新事件
- [x] **Streaming Service** (`app/services/aui_streaming.py`):
  - 新增 `stream_concurrent_messages()` 演示方法，模拟多角色并发对话
- [x] **Demo Endpoint**:
  - 新增 `GET /api/aui/demo/stream/multi-messages`

#### Frontend Extensions
- [x] **Stream Hydrator** (`frontend/src/components/aui/AUIStreamHydrator.jsx`):
  - 修复 `aui_text_delta` 在并发更新时的闭包/状态竞态问题 (Functional State Update)
  - 实现消息列表渲染 (`MessageList` 组件)
  - 支持 `aui_text_message_start` 初始化消息容器
  - 支持 `aui_text_message_end` 标记消息完成
- [x] **Demo UI** (`frontend/src/views/AUIStreamingDemo.jsx`):
  - 新增 "Multi Messages" 演示卡片

#### Testing
- [x] **Unit Tests**: `tests/test_aui_text_lifecycle.py` (8 tests passing)
- [x] **Verification**: `scripts/verify_text_lifecycle.py` (Live stream verification)


