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
# Install dependencies (Root)
pnpm install
uv sync

# Run the Full Stack (Frontend + Backend)
pnpm turbo dev

# Run specific parts
pnpm turbo dev --filter=@nce/web      # Web only
pnpm turbo dev --filter=@nce/backend  # Backend only
```

## Architecture (Monorepo)

The project follows a **Monorepo** structure using `pnpm workspaces` and `Turborepo`.

### Workspace Structure

```
/
├── apps/
│   ├── web/                # React Vite App
│   ├── mobile/             # Expo React Native (Android/iOS/Web)
│   └── backend/            # Logical proxy for Python backend
├── packages/
│   ├── api/                # Shared API Logic (Auth, Types, Client)
│   ├── shared/             # Shared Hooks, Utils, Stores (Zustand)
│   └── ui-tokens/          # Shared Design Tokens (colors, typography)
├── backend/                # (Physical) Python Backend Code (app/, scripts/)
└── turbo.json              # Build orchestration
```

## Shared Logic & Patterns (CRITICAL MEMORY)

### 1. Type Safety Contract (OpenAPI -> TypeScript)

1. Backend: Update Pydantic models in `app/models/`.
2. Root: Run `pnpm turbo gen:types`.
3. Frontend: `@nce/api/src/schema.d.ts` is updated.
4. Result: Types are available via `import { components } from '../schema'`.

### 2. Async Authentication & Token Storage

`AuthService` methods (`getAccessToken`, `isTokenExpired`) are **ASYNC** (return Promises).

```javascript
// BAD
const token = getAccessToken();
config.headers.Authorization = `Bearer ${token}`; // "[object Promise]" -> 401 Error

// GOOD
const token = await getAccessToken();
config.headers.Authorization = `Bearer ${token}`;
```

### 3. Shared Hooks (View Model Pattern)

**Location**: `packages/shared/src/hooks/`

Pure logic hooks (no UI). Example: `useWordExplainer` returns `{ data, actions }`.

## Shortcuts (Windows)

```powershell
./scripts/dev.ps1        # Start Server (HTTP)
./scripts/dev.ps1 -Https # Start Server (HTTPS)
./scripts/test.ps1       # Run All Tests (E2E + Backend)
```

## User Administration

> Detailed guide: [User Administration Skill](docs/skills/user-administration.md)

Use `scripts/user_admin.py` for user management (create, migrate, reset password).

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

# Authentication (IMPORTANT: Change SECRET_KEY in production!)
# Generate with: openssl rand -hex 32
SECRET_KEY=your-32-byte-hex-secret-key
ALLOW_REGISTRATION=true  # Set to false to disable public registration
```

## Database Management

> Detailed guide: [Database Management Skill](docs/skills/database-management.md)

Use `alembic` for migrations.

## TTS

The system uses **Edge-TTS** for audio.

- **Library**: `edge-tts` (Official Microsoft Edge TTS API wrapper).
- **Voice**: `en-US-AndrewMultilingualNeural`.
- **Flow**: Backend streams bytes -> Frontend plays Blob via Web Audio API.

### Backend Internal Structure (`app/`)

```
app/
├── main.py, config.py          # Entry & Config
├── core/db.py                  # SQLAlchemy async session
├── services/                   # Business Logic
│   ├── llm.py                  # DeepSeek + Gemini Client
│   ├── dictionary.py           # MDX/MDD Dictionary Manager
│   └── ...
├── api/routers/                # FastAPI Routers
└── models/                     # Pydantic & ORM Models
```

## Core Systems (Detailed Documentation)

### Authentication System

Multi-user authentication with JWT tokens. See: [Auth System Documentation](docs/auth-system.md)

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

### Content Feeder Service (Multi-Example)

- **Role**: Feeds rich content to the Negotiation Interface.
- **Service**: `app/services/content_feeder.py`.
- **Method**: `get_all_examples(word)` orchestrates dictionary parsing and structures data for navigation.
- **Models**: Uses `WordExampleSet` to support hierarchical navigation (Word -> Entry -> Sense -> Example).

### Dictionary Service

The application supports loading multiple MDX dictionaries simultaneously.

- **Source**: `resources/dictionaries/` (recursive scan at startup).
- **Backend**: `app.services.dictionary.dict_manager` loads MDX (definitions) and MDD (resources).
- **Asset Serving**:
  - Definitions are rewritten to use absolute proxy paths (`/dict-assets/{subdir}/...`) for CSS/JS.
  - Binary assets (images/audio) are served via `/dict-assets/{path}` tunnel.
  - Falls back to MDD cache if file not found on disk.

### Collins Dictionary Parser

High-quality structured data from Collins COBUILD dictionary.

- **Parser**: `app/services/collins_parser.py`
- **Models**: `app/models/collins_schemas.py` (Pydantic models).
- **API**: `GET /api/dictionary/collins/{word}`

> See: [Dictionary Maintenance Skill](docs/skills/dictionary-maintenance.md)

### LDOCE Dictionary Parser

Structured data from Longman LDOCE6++ dictionary.

- **Parser**: `app/services/ldoce_parser.py`
- **Models**: `app/models/ldoce_schemas.py` (Pydantic models).
- **API**: `GET /api/dictionary/ldoce/{word}`

### Podcast System

Offline playback architecture with PWA support and audio caching.

> Detailed: [Podcast System Documentation](docs/podcast-system.md)

### Coach Service (Agentic)

Central orchestrator for the "Neural Link" mode with tool-using agent pattern.

> Detailed: [Coach Service Documentation](docs/coach-service.md)

### Context-Aware Image Generation

- **Service**: `app/services/image_generation.py` using Zhipu GLM-Image.
- **Trigger**: LLM analyzes sentence context to determine if visual aid helps understanding.
- **Parallelism**: Image detection runs parallel to text explanation to reduce latency.
- **Storage**: generated images are stored in Postgres (`generated_images` table) as raw bytes.
- **Config**: Controlled by `ENABLE_IMAGE_GENERATION` in `.env`.
- **Frontend**: `WordInspector` receives `image_check` events via SSE to trigger generation.

## Key Design Patterns

### 1. Two-Stage LLM Generation

- **Stage 1 (Theme)**: Generate vocabulary slots first (`app/generators/theme.py`).
- **Stage 2 (Content)**: Generate sentences/stories using _only_ the specific vocabulary from Stage 1.

### 2. Unified Log System (Log Bridge)

A centralized logging system that collects both frontend and backend logs.

**Architecture**:

- **`app/services/log_collector.py`**: Color-coded terminal output + file logging
- **`frontend/src/utils/logBridge.js`**: Intercepts `console.log` and sends to backend via `navigator.sendBeacon`
- **Log File**: `logs/unified.log` (cleared on each server restart)
  > Don't commit `logs/unified.log` to git.

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

- **No Global Base URL**: We do _not_ use `<base>` tags in the frontend.
- **Path Rewriting**: The backend rewrites all relative asset links at runtime to point to their specific dictionary subdirectory.
- This prevents CSS/JS conflicts between different dictionaries.

### 4. Review Algorithm Debugging

- **Debug Dashboard**: `/performance/debug`
- **Curve Debug**: `/performance/memory-debug`
- **Endpoints**:
  - `GET /api/review/debug/schedule` - Logic trace for upcoming 14 days
  - `GET /api/review/debug/memory-curve` - Interval histograms and bucket stats
- **Unit Tests**: `tests/test_sm2_core.py` ensures mathematical correctness
- **Undo Logic**: `/undo` endpoint reverts the last review's SM-2 state changes

### 5. Async/Sync Hybrid

- **API Routes**: Use `async def` and run blocking LLM calls in thread pools via `run_in_threadpool`.
- **CRITICAL RULE**: Do NOT use `async def` for CPU-bound or blocking I/O operations (like `time.sleep`, heavy file parsing) unless you `await` them. If you can't await them, use `def` (sync) so FastAPI runs them in a thread pool. Mixing blocking code in `async def` will freeze the entire event loop.
- **Database**: All DB operations are async using `AsyncSessionLocal`.
- **Tests**: Use `pytest-asyncio` with function-scoped fixtures for isolation.

### 6. Stateful Chat Sessions

- **Creation**: `start_new_mission()` generates mission, stores in DB, returns session_id.
- **Continuation**: `handle_chat_turn()` loads history, calls LLM, updates DB.
- **Storage**: PostgreSQL with JSONB columns for flexible mission/history data.

## File Locations

**Source Code**:

- `app/` - Main application package
  - `services/` - Business logic
  - `api/routers/` - FastAPI routers
- `frontend/src/components/sentence-study/` - Sentence Study views & components
- `templates/` - Jinja2 HTML templates
- `resources/dictionaries/` - MDX/MDD dictionary files
- `alembic/` - Database migrations

**User Data**:

- `~/.english_tense_practice/` - Storage for cached themes (legacy file-based cache)
- **PostgreSQL**: Primary storage for sessions, stories, attempts, and chat history

## Common Pitfalls

Common issues and solutions for development.

> Detailed: [Common Pitfalls Documentation](docs/common-pitfalls.md)

## Mobile Architecture & Guidelines

Mobile app architecture with React Native, Expo, and NativeWind.

> Detailed: [Mobile Architecture Documentation](docs/mobile-architecture.md)

## Skills (Detailed Tool Guides)

以下技能模块包含详细操作指南，需要时按需加载：

| Skill                    | 路径                                                                               | 何时使用                                                         |
| ------------------------ | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Mobile Architecture**  | [docs/MOBILE_ARCHITECTURE_PLAN.md](docs/MOBILE_ARCHITECTURE_PLAN.md)               | **移动端开发** - 跨端复用架构与迁移计划                          |
| **Mobile Dev Pitfalls**  | [docs/skills/mobile-dev-pitfalls.md](docs/skills/mobile-dev-pitfalls.md)           | **移动端开发** - NativeWind 样式问题、Alpha 语法、条件 className |
| Mobile Quick Reference   | [docs/MOBILE_QUICK_REFERENCE.md](docs/MOBILE_QUICK_REFERENCE.md)                   | **移动端开发** - 快速参考与代码模板                              |
| User Administration      | [docs/skills/user-administration.md](docs/skills/user-administration.md)           | **管理用户** - 创建、迁移数据、重置密码                          |
| Database Management      | [docs/skills/database-management.md](docs/skills/database-management.md)           | **数据库维护** - Alembic 迁移命令                                |
| Dictionary Maintenance   | [docs/skills/dictionary-maintenance.md](docs/skills/dictionary-maintenance.md)     | **词典维护** - Parser Golden Standard 测试                       |
| Mobile Voice Debugging   | [docs/skills/mobile-voice-debugging.md](docs/skills/mobile-voice-debugging.md)     | **移动端调试** - HTTPS 证书与远程调试                            |
| Post-Change Verification | [docs/skills/post-change-verification.md](docs/skills/post-change-verification.md) | **代码变更后、通知用户前** - 自动验证变更是否有问题              |
| Local Deployment         | [docs/skills/local-deployment.md](docs/skills/local-deployment.md)                 | Docker 本地/内网部署                                             |
| Voice Integrations       | [docs/skills/voice-integrations.md](docs/skills/voice-integrations.md)             | 调用 ElevenLabs/Deepgram/Gemini/Dashscope 语音 API               |
| AUI Streaming Protocol   | [docs/skills/aui-streaming-protocol.md](docs/skills/aui-streaming-protocol.md)     | 实现或调试 Agent 实时流式 UI 更新                                |
| Podcast Architecture     | [docs/skills/podcast-architecture.md](docs/skills/podcast-architecture.md)         | **Podcast 开发** - Apple API 策略与缓存机制                      |
| SDK Debugging            | [docs/skills/sdk-debugging.md](docs/skills/sdk-debugging.md)                       | 第三方 SDK 调用失败的诊断方法                                    |
| API Docs Query           | [docs/skills/api-docs-query.md](docs/skills/api-docs-query.md)                     | 查询 ElevenLabs/Deepgram 离线 API 文档                           |
