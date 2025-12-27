
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

### ✅ AUI Bi-directional Communication (Phase 2) (2025-12-22)
**Implemented "Human-in-the-Loop" capabilities allowing Agents to pause and wait for user input**

#### Backend Extensions
- [x] **Input Service** (`app/services/aui_input.py`):
  - `AUIInputService` with `asyncio.Queue` session management.
  - `wait_for_input(session_id)` blocking helper.
- [x] **API Endpoint** (`app/api/routers/aui_input.py`):
  - `POST /api/aui/input` for receiving user actions.
- [x] **Event/Demo**:
  - `stream_interactive_flow()` demo in Streaming Service.
  - `GET /api/aui/demo/stream/interactive`.
  - **Persistence Upgrade (2025-12-25)**:
    - **PostgreSQL LISTEN/NOTIFY**: Replaced in-memory queue with DB-backed signaling (`AUIInputRecord`).
    - **Scalability**: Supports multi-process/worker deployments.
    - **Robustness**: Survives server restarts during "Wait for Input" state.

#### Frontend Extensions
- [x] **Interactive Component** (`frontend/src/components/aui/interactive/InteractiveDemo.jsx`):
  - Visual status indicators (Processing/Waiting/Success).
  - Button grid for user actions.
  - Uses `fetch` to submit input to backend.
- [x] **Demo Integration**:
  - Added "Human Loop" demo to `AUIStreamingDemo.jsx`.

#### Verification
- [x] **Internal Verification**: `scripts/verify_interactive_flow.py` (Pass).
- [x] **Unit Tests**: `tests/test_aui_input.py` (All Pass).
- [x] **Manual Verification**: Browser interactions verified.

### ✅ AUI Independent Feature Completion (2025-12-22)
**Completed remaining self-implemented AUI features and refined streaming granularity**

#### Backend Extensions
- [x] **Granular Streaming**: Refactored `stream_vocabulary_cards` in `aui_streaming.py` to use `STATE_DELTA` (JSON Patch `op: add`) for true incremental updates instead of snapshots.
- [x] **History Sync**: Implemented `MESSAGES_SNAPSHOT` event in `aui_events.py` for future conversation recovery.
- [x] **Refactoring**: Cleaned up `AUIEventType` enum (removed duplicate `STATE_SNAPSHOT`).

#### Frontend Extensions
- [x] **Stream Hydrator**: Added `aui_messages_snapshot` handler in `AUIStreamHydrator.jsx`.
- [x] **Component Robustness**: Updated `FlashCardStack.jsx` and `VocabGrid.jsx` to handle both legacy string arrays and new rich object arrays (`{word, definition}`).
- [x] **Bug Fix**: Resolved React render error ("Objects are not valid as a React child") by normalizing data structure in components.

#### Verification
- [x] **Unit Tests**: Created `tests/test_aui_incremental_vocab.py` verifying `STATE_DELTA` generation.

### ✅ AUI Independent Gap Implementation (2025-12-22)
**Implemented missing AG-UI protocol features in isolation (Gap Analysis Results)**

#### Backend Extensions
- [x] **Control Flow**: Added `INTERRUPT` event type and `InterruptEvent` model in `aui_events.py` for explicit flow control.
- [x] **Schema Validation**: Created `app/services/aui_schema.py` using Pydantic to validate component props (`StoryReader`, `FlashCardStack`, `VocabGrid`, `InteractiveDemo`).

#### Verification
- [x] **Unit Tests**:
  - `tests/test_aui_interrupt.py` (Passed)
  - `tests/test_aui_schema.py` (Passed)

### ✅ AUI Schema Extension & Rehydration Support (2025-12-23)
**Completed full schema coverage and activity rehydration for AG-UI alignment**

#### Backend Extensions
- [x] **Schema Validation**: Extended `app/services/aui_schema.py` to cover all `registry.js` components:
  - Added `MarkdownMessageProps`, `DiffCardProps`, `TenseTimelineProps`, `TaskDashboardProps`.
- [x] **Activity Rehydration**: Added `activities` field to `StateSnapshotEvent` in `aui_events.py` for restoring running tasks on page reload.

#### Verification
- [x] **Unit Tests**:
  - `tests/test_aui_schema_extended.py` (12 tests - Passed)
  - `tests/test_aui_snapshot_extended.py` (3 tests - Passed)

### ✅ AG-UI Interrupt Event Enhancement (2025-12-23)
**Aligned InterruptEvent and RunFinishedEvent with AG-UI draft specification for Human-in-the-Loop flows**

#### Backend Changes
- [x] **InterruptEvent** (`app/services/aui_events.py`):
  - Added `interrupt_id` field with auto-generated ID (`int-{uuid}`)
  - Renamed `metadata` to `payload` for AG-UI semantic alignment
- [x] **RunFinishedEvent**:
  - Added `interrupt` field for interrupt payloads
  - Documented `outcome` values: `"success"`, `"interrupt"`, `"cancelled"`

#### Frontend Changes
- [x] **AUIStreamHydrator** (`frontend/src/components/aui/AUIStreamHydrator.jsx`):
  - Added `aui_interrupt` event handler
  - Added `interruptState` tracking
  - Created `InterruptBanner` component (amber styling with reason/action/payload display)

#### Verification
- [x] **Unit Tests**: `tests/test_aui_interrupt.py` (6 tests - All Passed)
- [x] **Backend Serialization**: Verified `interrupt_id` prefix generation

### ✅ AUI ID Generators & Custom Event (2025-12-23)
**Completed AG-UI aligned ID generator functions and CUSTOM event type for protocol extensibility**

#### Backend Extensions
- [x] **ID Generators** (`app/services/aui_events.py`):
  - `generate_message_id()` - Returns `msg-{uuid}`
  - `generate_run_id()` - Returns `run-{uuid}`
  - `generate_thread_id()` - Returns `thread-{uuid}`
  - `generate_tool_call_id()` - Returns `tool-{uuid}`
  - `generate_activity_id()` - Returns `act-{uuid}`
- [x] **CustomEvent** (`app/services/aui_events.py`):
  - New `CUSTOM` event type for protocol extensibility
  - Supports arbitrary `name` and `value` fields

#### Verification
- [x] **Unit Tests**:
  - `tests/test_aui_id_generators.py` (10 tests - Passed)
  - `tests/test_aui_custom_event.py` (8 tests - Passed)
- [x] **Regression Test**: All 105 AUI tests passed

### ✅ AUI WebSocket Transport Support (2025-12-23)
**Added parallel WebSocket transport layer alongside existing SSE for bidirectional HITL scenarios**

#### Backend Implementation
- [x] **WebSocket Router** (`app/api/routers/aui_websocket.py`):
  - Unified endpoint `/api/aui/ws/{stream_type}`
  - Supports all stream types: story, vocabulary, activity, tool-call, agent-run, etc.
  - Reuses `AUIStreamingService` async generators (no duplication)
  - Bidirectional HITL message support
  - Health check endpoint `/api/aui/ws/ping`

#### Frontend Implementation
- [x] **Transport Hook** (`frontend/src/hooks/useAUITransport.js`):
  - Abstracts SSE (EventSource) and WebSocket connections
  - Unified `onMessage` callback interface
  - Automatic URL conversion (SSE → WebSocket)
  - Bidirectional `send()` for WebSocket
- [x] **AUIStreamHydrator** updates:
  - New `transport` prop (`'sse'` | `'websocket'`)
  - Transport indicator badge (SSE blue, WS purple)
- [x] **AUIStreamingDemo** updates:
  - Transport layer toggle UI (📡 SSE / 🔌 WebSocket)
  - Transport status display

#### Verification
- [x] **Unit Tests**: `tests/test_aui_websocket.py` (10 tests - Passed)
- [x] **Regression Test**: All 116 AUI tests passed

### ✅ AUI WebSocket HITL Improvements (2025-12-23)
**Fixed bidirectional communication for Human Loop and Study Plan demos**

#### Bug Fixes
- [x] **Method Name Bug**: Fixed `receive_input` → `submit_input` in `aui_websocket.py`
- [x] **React StrictMode**: Fixed infinite loop by checking connection instance identity
- [x] **Stream Type Mapping**: Added URL conversion for SSE → WebSocket endpoint names

#### Study Plan (Interrupt) Improvements
- [x] **Wait for Input**: `stream_interrupt_demo` now awaits user response via `input_service.wait_for_input()`
- [x] **Bidirectional Handling**: `interrupt` stream type now uses `handle_interactive_stream`
- [x] **Session ID in Payload**: InterruptEvent includes `session_id` for proper routing
- [x] **Response UI**: Different feedback messages for confirm/customize/cancel actions

#### Frontend Improvements
- [x] **AUIContext**: New React Context for passing WebSocket `send` function to child components
- [x] **InteractiveDemo**: Uses `useAUI()` hook for WebSocket-first communication
- [x] **InterruptBanner**: Checks `useWebSocket` prop and uses `onAction` callback

#### Verification
- [x] **Human Loop Demo**: Button clicks now work via WebSocket
- [x] **Study Plan Demo**: Confirm/customize/cancel buttons work and show feedback
- [x] **All 10 WebSocket Tests**: Passed

### 🔧 Context Resource System (2025-12-24)
**Multi-modal context resources with dictionary extraction, TTS, and learning progress tracking**

#### Backend Implementation
- [x] **Data Models** (`app/models/context_schemas.py`, `app/models/orm.py`):
  - `ContextResource` and `ContextLearningRecord` tables
  - `ContextType` and `LearningStatus` enums
- [x] **Context Service** (`app/services/context_service.py`):
  - Dictionary HTML example extraction
  - TTS generation via edge-tts
  - Learning progress tracking (unseen/learning/mastered)
- [x] **REST API** (`app/api/routers/context_router.py`):
  - `GET /api/context/{word}` - Get contexts for word
  - `POST /api/context/{word}/extract` - Extract from dictionary
  - `GET /api/context/{id}/audio` - Stream TTS audio
  - `POST /api/context/{id}/learn` - Update learning status

#### AUI Streaming Integration
- [x] **AUI Components** (`frontend/src/components/aui/`):
  - `ContextCard.jsx` - Pure presentation component with audio playback
  - `ContextList.jsx` - Context list with progress bar
- [x] **Stream Endpoint** (`/api/aui/stream/contexts?word=...`):
  - Progressive loading via STATE_DELTA
  - WebSocket support added
- [x] **WebSocket Param Fix** (`frontend/src/hooks/useAUITransport.js`):
  - Fixed URL conversion to extract query params from SSE URLs
  - Params now passed to WebSocket via params message

#### Verification
- [x] **Unit Tests**: `tests/test_context_service.py` (6 tests - Passed)
- [x] **Demo UI**: Added "Context Resources" button to AUI Streaming Demo

### 📖 Collins Dictionary Parser (2025-12-24)
**Structured data extraction from Collins COBUILD dictionary HTML**

#### Data Models (`app/models/collins_schemas.py`)
- [x] `CollinsAudio`: Audio URL pairs (original + API)
- [x] `CollinsInflection`: Word forms with audio (simmers, simmering, simmered)
- [x] `CollinsExample`: Example sentences with translations
- [x] `CollinsSense`: Senses with definition, examples, synonyms
- [x] `CollinsEntry`: Complete word entry with all metadata
- [x] `CollinsWord`: API response model

#### Parser (`app/services/collins_parser.py`)
- [x] Headword, UK/US pronunciations with audio URLs
- [x] Word frequency (1-5 based on filled circles)
- [x] Inflected forms with individual audio
- [x] Multiple senses with definitions (EN/CN)
- [x] Example sentences with translations and grammar patterns
- [x] Synonyms and phrasal verbs
- [x] Unicode icon cleanup (speaker icons)

#### API Endpoint
- [x] `GET /api/dictionary/collins/{word}` - Structured JSON response
- [x] `GET /api/tts?text=...` - Direct TTS generation endpoint

#### Context Demo Refactoring
- [x] **Backend**: `stream_context_resources()` now uses Collins parser
- [x] **Frontend**: `ContextCard.jsx` enhanced with:
  - Translation display (Chinese)
  - Grammar pattern badges
  - Sense index (`#1`, `#2`)
  - Collapsible definition & synonyms section
- [x] **Reorganization (2025-12-24)**:
  - [x] **Grouping**: Context resources grouped by Sense meaning in `ContextList.jsx`
  - [x] **Frontend**: Created `SenseCard.jsx` for hierarchical display
  - [x] **Metadata**: Backend propagates definition/sense-index to all examples

#### Verification
- [x] **Unit Tests**: `tests/test_collins_parser.py` (14 tests - Passed)
- [x] **HTML Fixtures**: 5 sample words (simmer, run, work, hello, beautiful)

### 🐛 UI & Stability Fixes (2025-12-24)
- [x] **Context Resources UI (Buttons & Visibility)**:
  - [x] **Local State Management**: `ContextCard.jsx` now uses local state for "Got it" and status toggles, enabling immediate UI feedback without backend roundtrips during testing.
  - [x] **Visibility Improvement**: Enhanced contrast (`text-ink/80`) for Chinese definitions in `SenseCard` and `ContextCard`.
  - [x] **Event Propagation**: `AUIStreamHydrator` properly passes `onAction`/`onStatusChange` handlers to dynamic components.
- [x] **Stability**:
  - [x] **Hook Violation Fix**: Resolved `Rendered more hooks than during the previous render` error in `AUIStreamHydrator` by moving `useCallback` to top level.

### 🎯 Context Resources UX Enhancements (2025-12-24)
- [x] **Translation Toggle**:
  - [x] `ContextCard.jsx`: Chinese translations hidden by default, click "Show Translation" to reveal
  - [x] `SenseCard.jsx`: Chinese definitions hidden by default, click "Show Meaning" to reveal
  - [x] Uses `lucide-react` `Languages` icon for toggle button
- [x] **AUI Architecture Alignment**:
  - [x] **Removed `/api/aui/action` endpoint**: Kept single transport channel philosophy
  - [x] **Simplified `handleComponentAction`**: SSE mode only logs locally, no HTTP POST
  - [x] **Enabled bidirectional WebSocket** for `contexts` stream type in `aui_websocket.py`
  - [x] **WebSocket action handler**: Distinguishes HITL vs general actions, logs and ACKs without queueing
  - [x] **Cleanup**: Removed redundant `/playground` route and broken `Playground.jsx` (2025-12-25)
  - [x] **Logic Unification**: Refactored to "Click-to-Reveal" translation toggles for both `ContextList` and `DictionaryResults` (2025-12-25)


### 📖 LDOCE Dictionary Parser (2025-12-25)
**Structured data extraction from Longman LDOCE6++ dictionary HTML**

#### Data Models (`app/models/ldoce_schemas.py`)
- [x] `LDOCEAudio`: Audio URL pairs (BrE/AmE)
- [x] `LDOCEExample`: Example sentences with translations and audio
- [x] `LDOCECollocation`: Collocation patterns with examples
- [x] `LDOCESense`: Senses with definition, grammar, examples, collocations
- [x] `LDOCEPhrasalVerb`: Phrasal verb entries
- [x] `LDOCEEntry`: Complete word entry with all metadata
- [x] `LDOCEWord`: API response model (supports multiple entries per word)

#### Parser (`app/services/ldoce_parser.py`)
- [x] Headword, hyphenation, homograph numbers (simmer1, simmer2)
- [x] UK/US pronunciations with audio URLs
- [x] Multiple entries per word (verb, noun, etc.)
- [x] Senses with definitions (EN/CN)
- [x] Grammar patterns (`[intransitive, transitive]`)
- [x] Example sentences with translations and audio
- [x] Collocations from corpus
- [x] Phrasal verbs

#### API Endpoints
- [x] `GET /api/dictionary/ldoce/{word}` - LDOCE-specific endpoint
- [x] `GET /api/dictionary/{source}/{word}` - Unified endpoint (source = `collins` | `ldoce`)

#### Verification
- [x] **Unit Tests**: `tests/test_ldoce_parser.py` (16 tests - Passed)
- [x] **HTML Fixtures**: 4 sample words (simmer, run, beautiful, hello)

### 📖 LDOCE Extended Parser Features (2025-12-25)
**Added extraction of extended popup data: Word Origin, Verb Table, Thesaurus, Collocations, Extra Examples**

#### Extended Data Models (`app/models/ldoce_schemas.py`)
- [x] `LDOCEEtymology`: Word origin (century, origin word, meaning, notes)
- [x] `LDOCEVerbForm`: Verb conjugation form (tense, person, form, auxiliary)
- [x] `LDOCEVerbTable`: Complete verb table (simple + continuous forms)
- [x] `LDOCEExtraExample`: Examples from other dictionaries/corpus
- [x] `LDOCEThesaurusEntry`: Related word with definition and examples
- [x] `LDOCEThesaurus`: Topic-based thesaurus entries + word sets
- [x] Updated `LDOCECollocation` with `part_of_speech` field

#### Extended Parser Methods (`app/services/ldoce_parser.py`)
- [x] `_find_popup_content()`: Helper to locate popup button content divs
- [x] `_extract_etymology()`: Parse Word Origin popup
- [x] `_extract_verb_table()`: Parse Verb Table (Simple + Continuous forms)
- [x] `_extract_extra_examples()`: Parse Examples from other dictionaries/corpus
- [x] `_extract_thesaurus()`: Parse Language Activator + Word Sets
- [x] `_extract_popup_collocations()`: Parse Collocations with POS categorization

#### Frontend Component (`frontend/src/components/aui/DictionaryResults.jsx`)
- [x] Expandable sections with toggle (▶/▼) for all extended data
- [x] **📜 Word Origin**: Century badge, origin word, meaning
- [x] **📝 Verb Table**: Simple forms + Continuous forms grid
- [x] **📚 Thesaurus**: Expandable entries with nested examples + Word Sets
- [x] **🔗 Collocations**: Expandable patterns with examples + translations
- [x] **💬 Extra Examples**: Source-coded (C=Corpus, D=Dictionary) examples

#### Unified SSE/WebSocket Streaming
- [x] **SSE Endpoint Fix**: Refactored `/api/aui/stream/ldoce-demo` to use `stream_ldoce_lookup()` service
- [x] **Parity**: Both SSE and WebSocket now use same code path with full extended data

#### Verification
- [x] **Unit Tests**: `tests/test_ldoce_parser.py` (22 tests - 16 original + 6 extended data)
- [x] **Diagnostic Script**: `scripts/diagnose_ldoce.py` for parser verification
- [x] **Browser Testing**: All expandable sections work correctly

### 📱 AUI Mobile Compatibility (2025-12-25)
**Comprehensive mobile optimization for AUI streaming demos and components**

#### Transport Layer (`useAUITransport.js`)
- [x] **Auto-Reconnection**: Automatically reconnects WebSocket on close.
- [x] **Exponential Backoff**: Retries with increasing delays (1s, 2s, 4s...).
- [x] **Visibility Handling**: Immediate reconnection when tab becomes visible (fixes background disconnects).

#### UI/UX Optimization
- [x] **Responsive Layout** (`AUIStreamingDemo.jsx`):
  - Switches to `flex-col` stack layout on mobile.
  - Fixed flexbox centering causing top content cutoff (switched to `margin-auto` wrapper).
  - Removed redundant "STREAMING" absolute indicator to prevent overlapping.
- [x] **Component Adaptation** (`AUIStreamHydrator.jsx`):
  - **InterruptBanner**: Vertical button stack, 48px touch targets, scrollable payload.
  - **MessageList**: Responsive typography (16px mobile/14px desktop), optimized padding.
  - **ActivityProgressBar**: Thicker progress bars, stacked labels.
  - **ToolCallTimeline/RunStatusBadge**: Adaptive layouts prevents horizontal overflow.

#### Verification
- [x] **WebSocket Tests**: `tests/test_aui_websocket.py` (Passed).
- [x] **Manual Testing**: Verified all 14 demos on simulated mobile viewport (iPhone 12).

### ✅ AUI Transport Consolidation (Phase 17) (2025-12-26)
**Simplified streaming architecture by removing SSE and standardizing on WebSocket**

#### Architecture Changes
- [x] **Backend Cleanup**:
  - Deleted `aui_stream.py` and `aui_stream_demo.py` (SSE Routers).
  - Cleaned up `main.py` imports.
- [x] **Frontend Refactor**:
  - `useAUITransport.js`: Hardcoded to WebSocket-only. Removed SSE logic.
  - `AUIStreamingDemo.jsx`: Removed "Transport Layer" toggle.
  - `AUIStreamHydrator.jsx`: Simplified props interface.

#### Stability Improvements
- [x] **Stability Improvements**:
  - [x] **Log Bridge Fix**:
    - [x] **Backend**: Switched `threading.Lock` to `threading.RLock` to prevent self-deadlock.
    - [x] **Frontend**: Switched `fetch` to `navigator.sendBeacon` for non-blocking log transmission.
    - [x] **Result**: Solved `/api/logs` pending request issues during high-frequency logging.
- [x] **Code Cleanup**:
  - [x] **Removed Legacy SSE**: Deleted `aui_demo_extended.py` and updated `main.py`.
  - [x] **Doc Cleanup**: Updated `aui_websocket.py` and frontend hooks to reflect WebSocket-only status.
  - [x] **Test Cleanup**:
    - [x] Removed broken import in `app/api/routers/__init__.py`.
    - [x] Verified deepgram/elevenlabs tests use raw connections (no SDK dependency).
    - [x] Confirmed `tests/` directory is clean of legacy SSE references.

#### Verification
- [x] **Unit Tests**: `test_aui_websocket.py` (10/10 Passed).
- [x] **Manual Verification**: All demo streams working over WebSocket.
    - [x] **Legacy Cleanup**:
        - [x] **SDK Removal**: Verified removal of `deepgram-sdk` and `elevenlabs` from `pyproject.toml`.
        - [x] **Script Cleanup**: Deleted legacy SSE verification scripts and tests.
        - [x] **Frontend Refactor**: Cleaned up `useAUITransport` legacy mappings.

## 🧠 Phase 18: Strategic Pivot - The Voice CI Revolution (Current)
**Goal**: Re-architect the application from a multi-stage toolset into a Unified Voice Interface driven by SLA/CI Theory.
- [x] **Theoretical Foundation**:
    - [x] Socratic Dialogue on SLA/ALG vs Learning.
    - [x] Deep dive into "Comprehensible Input" research (Krashen, Long, Swain).
    - [x] **Strategy Shift**: Confirmed pivot to "Unified Voice Interface" (Voice-First, Context-Driven).
- [ ] **Architecture Design (Next)**:
    - [x] **Core Loop Design**: Defined "Recursive Negotiation Loop" (Explain -> L1 -> Verify).
    - [x] **Context Engine**: Defined LTM (Proficiency) and STM (Session) memory structures.
    - [ ] **Ingestion Strategy**: RSS/Podcast pipeline design.

### ✅ Phase 24: Multi-Example Content Feeder (Completed 2025-12-27)
**Implemented rich dictionary content feeding with multiple examples per word and intuitive navigation.**

#### Backend Implementation
- [x] **New Schemas** (`app/models/word_example_schemas.py`):
  - `SenseWithExamples`, `WordEntry`, `WordExampleSet` for structured data.
- [x] **Content Feeder** (`app/services/content_feeder.py`):
  - Added `get_all_examples(word)` method.
  - Integration with `CollinsParser` to extract all senses and examples.
  - Bug fixes for `grammar_pattern` and `pos` access in Collins schema.
- [x] **API Endpoint**:
  - `GET /api/negotiation/word-examples?word={word}`.

#### Frontend Implementation
- [x] **Navigation UI**:
  - **Sense Tabs**: Clickable tabs to switch between different dictionary senses.
  - **Example Navigator**: Left/Right arrows to cycle through examples within a sense.
  - **Status Indicators**: "Example X/Y" and "Z senses" badges.
- [x] **Interaction**:
  - Auto-fetch examples on START and Negotiation (HUH/CONTINUE).
  - Updates main text, definition, and translation dynamically.

### ✅ Phase 25: Voice UI Enhancements & History (Completed 2025-12-27)
**Refined the Negotiation Interface with requested UX features and robust state management.**

#### Features
- [x] **Step History**:
  - Bi-directional navigation (Back/Forward).
  - **Bug Fix**: Solved "Cross-Sense Pollution" by resetting history on Sense/Example switch.
  - **State Restoration**: Fully restores text, step, definition, translation, and indices.
- [x] **Playback Speed Control**:
  - Toggle button (Gauge icon) for 1.0x, 0.75x, 0.5x speeds.
  - Visual feedback for current speed.
- [x] **Skip Function**:
  - "SKIP" button to discard current word and fetch a new one immediately.
- [x] **Layout Optimization**:
  - Compact "Hero Card" design.
  - Action buttons (HUH? / SKIP / GOT IT) grid.
  - Embedded audio controls (Play/Back/Forward/Speed). 

### ✅ Phase 26: Negotiation Deep Context (Completed 2025-12-27)
**Solved "Context is not enough" issue by injecting dictionary definitions into LLM prompts and forcing session synchronization.**

#### Backend Enhancements
- [x] **Rich Context Schema**:
  - Updated `NegotiationContext` to include `definition`, `part_of_speech`, and `translation_hint`.
  - Service logic (`NegotiationService`) now validates session integrity based on context.
- [x] **Smart Explanation**:
  - `_generate_explanation` now constructs prompts using specific dictionary sense data.
  - **TTS Optimization**: Prompts explicitly forbid markdown output for smooth audio.
- [x] **Testing**:
  - Added `tests/test_negotiation_context.py` to verify prompt injection logic.

#### Frontend Refactor
- [x] **Context Synchronization**:
  - `NegotiationInterface.jsx` forces `session_id` reset on navigation (Next Example/Sense).
  - Explicitly sends `definition` and `part_of_speech` from `wordExamples` state to backend.
- [x] **Robustness**:
  - Prevents "Stale Context" where AI explains the previous example after navigation.
