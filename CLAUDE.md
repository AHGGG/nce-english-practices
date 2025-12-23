# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

This is a comprehensive English learning platform that combines:
1. **Tense Practice**: Interactive exercises across 16 tense variations using LLM generation.
2. **Hybrid Dictionary**: Multi-dictionary support (MDX format) with rich definitions, audio, and images.
3. **Scenario Roleplay**: Real-time AI chat for practicing specific grammar points in realistic contexts.
4. **Voice Practice**: Real-time voice conversation using Gemini Native Audio API.

The backend is built with **FastAPI** and the frontend is a **React** Single Page Application (SPA) built with **Vite**.

## Development Setup

```bash
# Install dependencies
uv sync

# Run the Web Application
uv run python -m app.main
# OR (Windows Powershell)
./scripts/dev.ps1

# For HTTPS (mobile voice requires HTTPS)
uv run python scripts/generate_cert.py  # Generate self-signed cert
uv run python -m app.main       # Auto-detects cert.pem/key.pem
```

## Shortcuts (Windows)
```powershell
./scripts/dev.ps1   # Start Server
./scripts/test.ps1  # Run All Tests (E2E + Backend)
```

## Testing

```bash
# Run All Automated Tests
uv run pytest tests -v

# Run Voice Lab Integration Tests (Backend)
uv run pytest tests/test_voice_lab_integration.py -v

# Run Deepgram WebSocket Tests
uv run pytest tests/test_deepgram_websocket.py -v

# Run Manual Verification Config (requires running server)
# 1. Start Dev Server: ./scripts/dev.ps1
# 2. Run Script: uv run python tests/verification/verify_deepgram_websocket.py
```

## Environment Configuration

Create a `.env` file in the project root:

```env
# Required for LLM features
DEEPSEEK_API_KEY=your_key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
MODEL_NAME=deepseek-chat

# Required for Voice feature
GEMINI_API_KEY=your_key
DASHSCOPE_API_KEY=your_key # Alibaba Cloud Dashscope (Qwen)

# Database (defaults to local postgres)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/nce_practice
```

## Database Management

```bash
# Initialize/migrate database
uv run alembic upgrade head

# Create new migration after model changes
uv run alembic revision --autogenerate -m "description"

# Downgrade one version
uv run alembic downgrade -1

# View migration history
uv run alembic history
# View migration history
uv run alembic history
```

## Coach & TTS
The new Coach architecture uses **Edge-TTS** for audio.
- **Library**: `edge-tts` (Official Microsoft Edge TTS API wrapper).
- **Voice**: `en-US-AndrewMultilingualNeural`.
- **Flow**: Backend streams bytes -> Frontend plays Blob via Web Audio API.

## Architecture

### Package Structure (`app/`)

The project follows a modular package structure:

- **`app/main.py`**: Application entry point and API routes.
- **`app/config.py`**: Settings management using Pydantic Settings.
- **`app/core/`**: Core business logic.
  - `practice.py`: Grading and feedback logic.
  - `db.py`: SQLAlchemy session management.
- **`app/services/`**: Infrastructure services.
  - `llm.py`: Unified LLM service (DeepSeek + Gemini clients).
  - `dictionary.py`: MDX/MDD parsing and multi-dictionary management.
  - `chat.py`: Stateful chat session management.
  - `voice.py`: Voice session management (WebSocket).
  - `coach.py`: **NEW** Agentic Coach service (LLM Tool use).
  - `tts.py`: **NEW** Edge-TTS integration.
  - `voice_lab.py`: **NEW** Multi-vendor integration (Google, ElevenLabs, Deepgram).
  - `dsml_parser.py`: **NEW** Parser for DeepSeek raw XML tool calls.
- **`app/generators/`**: Content generation logic.
  - `theme.py`, `sentence.py`, `story.py`, `quiz.py`, `scenario.py`
- **`app/models/`**: Data models package.
  - `schemas.py`: Pydantic models (DTOs) and API schemas.
  - `orm.py`: SQLAlchemy database models.
- **`app/database.py`**: Database operations and query functions.
- **`app/database.py`**: Database operations and query functions.

### Database Layer

- **Engine**: PostgreSQL with async support (`asyncpg`).
- **ORM**: SQLAlchemy 2.0 with async sessions.
- **Migrations**: Alembic for schema versioning.
- **Test Isolation**: Tests use `nce_practice_test` database with transaction rollback per test.

### LLM Service Pattern

The `llm_service` singleton in `app/services/llm.py` provides:
- **Sync Client**: `llm_service.sync_client` (OpenAI/DeepSeek) for blocking operations.
- **Async Client**: `llm_service.async_client` for async endpoints.
- **Voice Client**: `llm_service.voice_client` (Gemini) for WebSocket voice sessions.

ALL generators and routes use this service rather than creating clients directly.

### Frontend Design System ("Cyber-Noir")
- **Philosophy**: "Mental Gym" - High contrast, information-dense, no distractions.
- **Tech Stack**: TailwindCSS + Lucide Icons + custom `index.css` utilities.
- **Tokens**:
  - **Colors**: `canvas` (Black), `ink` (Off-white), `neon` (Accents).
  - **Typography**: `Merriweather` (Content/Serif), `JetBrains Mono` (Data/UI).
- **Architecture**:
  - `src/components/ui/`: Core atomic components (Button, Input, Card).
  - `src/index.css`: Global token definitions via Tailwind `@layer base`.
  - `tailwind.config.js`: Central source of truth for design tokens.

### Dictionary Service

The application supports loading multiple MDX dictionaries simultaneously.
- **Source**: `resources/dictionaries/` (recursive scan at startup).
- **Backend**: `app.services.dictionary.dict_manager` loads MDX (definitions) and MDD (resources).
- **Asset Serving**:
  - Definitions are rewritten to use absolute proxy paths (`/dict-assets/{subdir}/...`) for CSS/JS.
  - Binary assets (images/audio) are served via `/dict-assets/{path}` tunnel.
  - Falls back to MDD cache if file not found on disk.

### Coach Service (Agentic)
- **Role**: Central orchestrator for the "Neural Link" mode.
- **Pattern**: Tool-Using Agent. The LLM decides *which* UI component to show (Vocab, Story, Drill) by calling tools.
- **DSML Parser**: Handles DeepSeek's custom XML-style tool calls (`<｜DSML｜invoke>`).
- **Data Flow**: User Input -> LLM -> Tool Call -> Backend Execution (e.g., Generate Story) -> Result Re-injection -> Final Response -> Frontend Render.

### Voice Chat (WebSocket)

- **Endpoint**: `/ws/voice` (requires HTTPS on mobile browsers).
- **Protocol**:
  1. Client connects and sends config (voice name, system instruction).
  2. Server connects to Gemini Live API.
  3. Bidirectional streaming: Client sends PCM audio, server streams back audio + transcriptions.
- **Transcriptions**: Both user input and AI output are transcribed and sent separately as JSON messages.

## Key Design Patterns

### 1. Two-Stage LLM Generation
- **Stage 1 (Theme)**: Generate vocabulary slots first (`app/generators/theme.py`).
- **Stage 2 (Content)**: Generate sentences/stories using *only* the specific vocabulary from Stage 1.

### 2. Unified Log System (Log Bridge)

A centralized logging system that collects both frontend and backend logs.

**Architecture**:
- **`app/services/log_collector.py`**: Color-coded terminal output + file logging
- **`frontend/src/utils/logBridge.js`**: Intercepts `console.log/warn/error` and sends to backend
- **Log File**: `logs/unified.log` (cleared on each server restart)

**Categories** (Generic, not vendor-specific):
| Category | Description | Color |
|----------|-------------|-------|
| `user_input` | User speech/text, STT results | Blue |
| `agent_output` | AI responses, TTS | Green |
| `function_call` | Tool/function executions | Violet |
| `audio` | Audio processing, chunks | Cyan |
| `network` | API calls, WebSocket, latency | Yellow |
| `lifecycle` | Connect/disconnect/init | White |
| `general` | Default | White |

**For AI Debugging**: Read `logs/unified.log` directly:
```powershell
Get-Content logs/unified.log -Tail 50   # Last 50 lines
```

### 3. Multi-Dictionary Isolation
To support multiple dictionaries (e.g., Collins + LDOCE) in one view:
- **No Global Base URL**: We do *not* use `<base>` tags in the frontend.
- **Path Rewriting**: The backend rewrites all relative asset links at runtime to point to their specific dictionary subdirectory.
- This prevents CSS/JS conflicts between different dictionaries.

### 3. Async/Sync Hybrid
- **API Routes**: Use `async def` and run blocking LLM calls in thread pools via `run_in_threadpool`.
- **Database**: All DB operations are async using `AsyncSessionLocal`.
- **Tests**: Use `pytest-asyncio` with function-scoped fixtures for isolation.

### 4. Stateful Chat Sessions
- **Creation**: `start_new_mission()` generates mission, stores in DB, returns session_id.
- **Continuation**: `handle_chat_turn()` loads history, calls LLM, updates DB.
- **Storage**: PostgreSQL with JSONB columns for flexible mission/history data.

## File Locations

**Source Code**:
- `app/` - Main application package

- `templates/` - Jinja2 HTML templates
- `resources/dictionaries/` - MDX/MDD dictionary files
- `alembic/` - Database migrations

**User Data**:
- `~/.english_tense_practice/` - Storage for cached themes (legacy file-based cache).
- **PostgreSQL**: Primary storage for sessions, stories, attempts, and chat history.

## Common Pitfalls

- **Global Run Conflict**: Running `uv run pytest tests` fails because `pytest-playwright` (Sync) and `httpx`/`asyncpg` (Async) require conflicting Event Loop policies on Windows (Selector vs Proactor).
    - **Solution**: We removed most Playwright E2E tests to simplify this. For remaining synchronous tests, run them separately if needed.
- **Backend `RuntimeError`**: `asyncio.run()` loops conflict with `pytest-asyncio` loops.
    - **Fix**: Tests require `nest_asyncio.apply()` on Windows. (This is handled in `tests/conftest.py`).

### Database Connection
- **Tests**: Require PostgreSQL running on `localhost:5432` with `nce_practice_test` database.
- **Fixture**: `conftest.py` drops/creates all tables per test function for isolation.
- **Override**: Test fixtures override `get_db()` dependency to inject test session.

### MDX Resource Paths
- **MDD Keys**: Often use Windows-style paths (`\image.png`) or just filenames.
- **Lookup Priority**: Check filesystem first, then MDD cache, then basename fallback.
- **Rewriting**: All `src`, `href` attributes in HTML are rewritten to absolute `/dict-assets/` URLs.

### Voice on Mobile
- **HTTPS Required**: WebSocket with audio requires HTTPS. Generate cert with `generate_cert.py`.
- **Certificate Trust**: Users must accept self-signed cert warning on first connection.

### Voice Integrations (Raw API Pattern)

As of 2025-12-19, all voice provider integrations use **raw `httpx` API calls** instead of SDKs for better stability and control:

- **ElevenLabs** (`app/services/voice_lab.py`):
  - **TTS**: `POST /v1/text-to-speech/{voice_id}` with JSON body, streaming response.
  - **STT**: `POST /v1/speech-to-text` with multipart form data.
  - **SFX**: `POST /v1/sound-generation` with JSON body.
  - **STS**: `POST /v1/speech-to-speech/{voice_id}` with multipart form data.
  - **Header**: `xi-api-key: {API_KEY}`

- **Deepgram** (`app/services/voice_lab.py` + `app/api/routers/deepgram_websocket.py`):
  - **TTS**: `POST https://api.deepgram.com/v1/speak?model={voice}&encoding=mp3`
  - **STT**: `POST https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true`
  - **Live STT/TTS**: WebSocket proxying via `websockets` library.
  - **Header**: `Authorization: Token {API_KEY}`
  - **websockets v15.x**: Use `additional_headers` (not `extra_headers`).

- **Google Gemini** (`app/services/voice_lab.py`):
  - Uses official `google-genai` SDK with Live API for multimodal TTS/STT.

- **Dashscope (Alibaba Cloud)** (`app/services/voice_lab.py`):
  - **TTS**: `POST https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation` (Qwen3-TTS)
  - **STT**: `POST https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription` (Qwen3-ASR)
  - **LLM**: Uses `AsyncOpenAI` client (compatible mode) for `qwen3-30b-a3b` "Deep Thinking".
  - **Header**: `Authorization: Bearer {API_KEY}`

**Why Raw APIs over SDKs?**
1. SDK version mismatches cause frequent breakage (v3 vs v4 vs v5 API changes).
2. Documentation often outdated; raw API specs are more reliable.
3. Better error handling and debugging visibility.
4. Reduced dependency footprint.

4. Reduced dependency footprint.

### AUI Streaming Protocol (Agent-to-UI)

The system supports a streaming UI protocol for real-time Agent updates:

- **Events**:
  - `aui_render_snapshot`: Full component render (Backward compatible).
  - `aui_text_delta`: Incremental text updates (ChatGPT-style).
  - `aui_text_message_start/end`: Message lifecycle events for concurrent streams.
  - `aui_messages_snapshot`: Message history synchronization.
  - `aui_state_snapshot`: Complete state for recovery/initialization.
  - `aui_state_delta`: Granular state updates using **JSON Patch** (RFC 6902).
  - `aui_activity_snapshot/delta`: Activity progress tracking.
  - `aui_tool_call_*`: Tool call lifecycle (start/args/end/result).
  - `aui_run_*`: Agent run lifecycle (started/finished/error).
  - `aui_interrupt`: Control flow interruption (e.g. for user input).
- **Architecture**:
  - **Backend**: `app.services.aui_events` generates events; `app.api.routers.aui_stream` serves SSE.
  - **Validation**: `app.services.aui_schema` validates component props using Pydantic models.
  - **Frontend**: `AUIStreamHydrator` consumes SSE and applies patches using `fast-json-patch`.
- **Interactivity (Bi-directional)**:
  - **Downstream**: SSE pushes UI state (buttons/forms).
  - **Upstream**: Client sends actions via `POST /api/aui/input`.
  - **Backend**: `AUIInputService` pauses agent execution until input is received (In-Memory Queue).
- **AG-UI Alignment (2025-12-23)**:
  - `InterruptEvent` now includes `interrupt_id` (auto-generated) and `payload` for structured data.
  - `RunFinishedEvent` supports `outcome="interrupt"` with associated interrupt details.
  - `InterruptBanner` component displays interactive action buttons from `payload.options`.
- **WebSocket Transport (2025-12-23)**:
  - **Backend**: `/api/aui/ws/{stream_type}` endpoint in `aui_websocket.py`.
  - **Frontend**: `useAUITransport` hook abstracts SSE/WebSocket; `AUIContext` provides `send` function.
  - **Bidirectional**: `interactive` and `interrupt` streams use `handle_interactive_stream` for HITL.
  - **Fallback**: SSE remains default; WebSocket enabled via `transport="websocket"` prop.

### Third-Party SDK Debugging: Lessons Learned (2025-12-17)

**问题背景**: Deepgram TTS/STT 调用失败，尝试多次修复无效。

**根本原因**: 安装的是 Deepgram SDK **v5.3.0**，但 MCP 文档和网上资料多为 v3/v4 API，导致：
1. `from deepgram import SpeakOptions` 失败 - 该类在 v5 不存在
2. `speak.rest.v("1").save()` 方法签名不同
3. `listen.rest.v("1").transcribe_file()` 参数格式变了

**解决方案**: 移除 SDK，改用 `httpx` 直接调用 REST API。

**经验总结**:
> 当第三方 SDK 频繁出问题时，考虑直接使用 REST API。

## Documentation Tools

We have a local CLI tool to query the offline API documentation (ElevenLabs & Deepgram) without needing to browse files manually.

```bash
# General Usage
uv run python scripts/analyze_voice_api.py [query] [options]

# Examples:

# 0. Get API Catalog / Index (Directory Mode)
# Lists all available endpoints in a compact format
uv run python scripts/analyze_voice_api.py --compact

# 1. Search for "websocket" related endpoints
uv run python scripts/analyze_voice_api.py "websocket"

# 2. List all ElevenLabs endpoints
uv run python scripts/analyze_voice_api.py --provider elevenlabs

# 3. Get detailed YAML spec for a specific endpoint (e.g., search for /v1/speak)
uv run python scripts/analyze_voice_api.py "/v1/speak" --details

# Options:
#   query           Search term (path, summary, description)
#   -p, --provider  Filter by provider (elevenlabs, deepgram)
#   -m, --method    Filter by HTTP method (GET, POST)
#   -d, --details   Show full OpenAPI spec
```
