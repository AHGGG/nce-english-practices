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
│   ├── web/                # React Vite App (Moved from frontend/)
│   ├── mobile/             # (Planned) Expo React Native
│   └── backend/            # Logical proxy for Python backend
├── packages/
│   ├── api/                # Shared API Logic (Auth, Types, Client)
│   ├── shared/             # Shared Hooks, Utils, Stores (Zustand)
│   └── ui-tokens/          # (Planned) Shared Design Tokens
├── backend/                # (Physical) Python Backend Code (app/, scripts/)
└── turbo.json              # Build orchestration
```

### Backend (`app/` in root)

- **Entry**: `app/main.py`
- **Run via Turbo**: `apps/backend` package proxies commands to root-level `uv` scripts.
- **API Contract**: Pydantic models -> OpenAPI -> TypeScript Types.

### Frontend (`apps/web`)

- **Tech**: React + Vite + TailwindCSS.
- **Dependencies**: Consumes `@nce/shared` and `@nce/api`.
- **Note**: Vite automatically handles `workspace:*` symlinks.

## Shared Logic & Patterns (CRITICAL MEMORY)

### 1. Type Safety Contract (OpenAPI -> TypeScript)
**Workflow**:
1. Backend: Update Pydantic models in `app/models/`.
2. Root: Run `pnpm turbo gen:types`.
3. Frontend: `@nce/api/src/schema.d.ts` is updated.
4. Result: Types are available via `import { components } from '../schema'`.

### 2. Async Authentication & Token Storage
**Context**: To support React Native (Async Storage) and Web (LocalStorage) with one logic codebase (`packages/api`).
**Pattern**: `AuthService` methods (`getAccessToken`, `isTokenExpired`) are **ASYNC** (return Promises).
**Pitfall**: Legacy axios interceptors in Web often expect sync tokens.
**Fix**: ALWAYS `await` token retrieval in interceptors.
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
**Pattern**: Pure logic hooks (no UI).
**Example**: `useWordExplainer` returns `{ data, actions }`.
**Web Integration**: Re-export from `apps/web/src/hooks/` or import directly.

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

### Authentication System (NEW 2026-01-18)

Multi-user authentication with JWT tokens, designed for future public deployment.

**Backend Components**:
- **Model**: `app/models/orm.py::User` - User accounts with email, password hash, roles
- **Schemas**: `app/models/auth_schemas.py` - Registration, login, token DTOs
- **Service**: `app/services/auth.py` - Password hashing, JWT creation/verification
- **Router**: `app/api/routers/auth.py` - REST API endpoints

**API Endpoints**:
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Create new account |
| `/api/auth/login` | POST | Login, returns JWT tokens |
| `/api/auth/refresh` | POST | Refresh access token |
| `/api/auth/logout` | POST | Clear refresh token cookie |
| `/api/auth/me` | GET | Get current user profile |
| `/api/auth/change-password` | POST | Update password |

**Token Strategy**:
- **Access Token**: Short-lived (15 min), stored in localStorage
- **Refresh Token**: Long-lived (7 days), stored in HttpOnly cookie
- **Auto-refresh**: Frontend `authFetch()` handles token expiry

**Frontend Components**:
- `src/api/auth.js` - Auth API utilities with auto-refresh
- `src/context/AuthContext.jsx` - Global auth state provider
- `src/components/ProtectedRoute.jsx` - Route guard component
- `src/views/auth/LoginPage.jsx` - Login form with glassmorphism design
- `src/views/auth/RegisterPage.jsx` - Registration with password strength

**Security Features**:
- Password strength validation (min 8 chars, letter + digit)
- Failed login attempt tracking
- Account locking support
- Soft delete for users

**Data Migration**:
- Use admin CLI to migrate existing data: `uv run python scripts/user_admin.py migrate-data --to-user-id <id>`
- See **User Administration** section for full CLI usage

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

### Frontend Design System ("Cyber-Noir")
- **Philosophy**: "Mental Gym" - High contrast, information-dense, no distractions.
- **Tech Stack**: TailwindCSS + Lucide Icons + custom `index.css` utilities.
- **Charts**: `react-chartjs-2` + `chart.js` for data visualization.
- **Tokens**:
  - **Colors**: Uses semantic naming in `tailwind.config.js` (e.g., `bg-bg-base`, `text-text-primary`, `accent-primary`).
  - **Source of Truth**: `src/index.css` (CSS Variables) mapped to Tailwind via `tailwind.config.js`.
  - **Typography**: `Merriweather` (Content/Serif), `JetBrains Mono` (Data/UI).
- **Architecture**:
  - `src/components/ui/`: Core atomic components (Button, Input, Card).
  - `src/components/reading/`: **Modularized 2025-12-31** Reading Mode package.
    - `ReadingMode.jsx`: Main container with view routing.
    - `ArticleListView.jsx`, `ReaderView.jsx`: View components.
    - `WordInspector.jsx`, `SentenceInspector.jsx`, `Lightbox.jsx`: Modal overlays.
    - `MemoizedSentence.jsx`, `MemoizedImage.jsx`: Performance-optimized components.
  - `src/components/performance/`: **Modularized 2025-12-31** Performance Report package.
    - `PerformanceReport.jsx`: Main container.
    - `cards/`: KPI display components (KPICard, ActionCards, Card).
    - `cards/`: KPI display components (KPICard, ActionCards, Card).
    - `widgets/`: Data visualization widgets (Heatmap, Charts, Badges).
  - `src/hooks/`: Shared logic hooks.
    - `useWordExplainer.js`: Unified dictionary + LLM context explanation logic (Shared by Reading/SentenceStudy). **Updated 2026-01-17** to support parallel Collins/LDOCE fetching and context-aware fallback.
  - `src/utils/`: Shared utilities.
    - `sseParser.js`: **NEW 2026-01-06** Unified SSE stream parser supporting both JSON (chunks) and Text (raw) streams.
  - `src/index.css`: Global token definitions via Tailwind `@layer base`.
  - `tailwind.config.js`: Central source of truth for design tokens. Maps `neon-*` colors to CSS variables for runtime theming.
  - **Rule**: ALWAYS prefer using `components/ui` primitives (Button, Card, Tag) or semantic tokens (`accent-primary`, `text-muted`) over raw Tailwind classes (`text-green-500`) to maintain the "Cyber-Noir" aesthetic.

### Dictionary Service

The application supports loading multiple MDX dictionaries simultaneously.
- **Source**: `resources/dictionaries/` (recursive scan at startup).
- **Backend**: `app.services.dictionary.dict_manager` loads MDX (definitions) and MDD (resources).
- **Asset Serving**:
  - Definitions are rewritten to use absolute proxy paths (`/dict-assets/{subdir}/...`) for CSS/JS.
  - Binary assets (images/audio) are served via `/dict-assets/{path}` tunnel.
  - Falls back to MDD cache if file not found on disk.

### Collins Dictionary Parser (NEW)

For high-quality structured data from Collins COBUILD dictionary:

- **Parser**: `app/services/collins_parser.py` extracts structured data from HTML.
- **Models**: `app/models/collins_schemas.py` (Pydantic models).
- **API**: `GET /api/dictionary/collins/{word}` returns:
  - Headword, UK/US pronunciations with audio URLs
  - Word frequency (1-5)
  - Inflections with audio
  - Senses with definitions (EN/CN), examples, translations
  - Synonyms, phrasal verbs
- **Usage**: The AUI `stream_context_resources()` uses this parser for context extraction.

### LDOCE Dictionary Parser

For structured data from Longman LDOCE6++ dictionary:

- **Parser**: `app/services/ldoce_parser.py` extracts structured data from HTML.
- **Models**: `app/models/ldoce_schemas.py` (Pydantic models).
- **API**: `GET /api/dictionary/ldoce/{word}` returns:
  - Headword, pronunciations (BrE/AmE), audio URLs
  - Multiple entries (verb, noun, etc.) with homograph numbers
  - Senses with definitions (EN/CN), grammar labels, examples
  - Extended data: Etymology, Verb Table, Thesaurus, Collocations, Extra Examples
- **Grammar Extraction**: Entry-level grammar (e.g., `[transitive]`) is used as fallback when senses don't have their own grammar labels.

#### Golden Standard Testing

> Detailed guide: [Dictionary Maintenance Skill](docs/skills/dictionary-maintenance.md)

To prevent parser regressions, use the golden standard framework: `tests/test_ldoce_parser_golden.py`.


### Podcast System (Offline Playback)

**Architecture (2026-01-22 Update)**:
- **Shared Feed Model**: `PodcastFeed` is global. User subscriptions are tracked in `PodcastFeedSubscription` (Many-to-Many).
- **Playback State**: `UserEpisodeState` tracks resume position (`current_position_seconds`) and finished status per user/episode.
- **Offline Strategy**:
  - **PWA**: `vite-plugin-pwa` + Workbox.
  - **Audio Cache**: `podcast-audio-cache` (Cache API) stores audio files.
  - **Progress Tracking**: Backend download endpoint (`/api/podcast/episode/{id}/download`) supports `HEAD` requests for Content-Length.
  - **Frontend**: `PodcastFeedDetailView` shows download progress/status. `PodcastDownloadsView` manages offline content.

### Coach Service (Agentic)
- **Role**: Central orchestrator for the "Neural Link" mode.
- **Pattern**: Tool-Using Agent. The LLM decides *which* UI component to show (Vocab, Story, Drill) by calling tools.
- **DSML Parser**: Handles DeepSeek's custom XML-style tool calls (`<｜DSML｜invoke>`).
- **Data Flow**: User Input -> LLM -> Tool Call -> Backend Execution (e.g., Generate Story) -> Result Re-injection -> Final Response -> Frontend Render.

- **Endpoint**: `/ws/voice` (requires HTTPS on mobile browsers).
- **Protocol**:
  1. Client connects and sends config (voice name, system instruction).
  2. Server connects to Gemini Live API.
  3. Bidirectional streaming: Client sends PCM audio, server streams back audio + transcriptions.
- **Transcriptions**: Both user input and AI output are transcribed and sent separately as JSON messages.

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
- **Stage 2 (Content)**: Generate sentences/stories using *only* the specific vocabulary from Stage 1.

### 2. Unified Log System (Log Bridge)

A centralized logging system that collects both frontend and backend logs.

**Architecture**:
- **`app/services/log_collector.py`**: Color-coded terminal output + file logging
- **`frontend/src/utils/logBridge.js`**: Intercepts `console.log` and sends to backend via `navigator.sendBeacon` (non-blocking)
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
To support multiple dictionaries (e.g., Collins + LDOCE) in one view:
- **No Global Base URL**: We do *not* use `<base>` tags in the frontend.
- **Path Rewriting**: The backend rewrites all relative asset links at runtime to point to their specific dictionary subdirectory.
- Path Rewriting: The backend rewrites all relative asset links at runtime to point to their specific dictionary subdirectory.
- This prevents CSS/JS conflicts between different dictionaries.

### 4. Review Algorithm Debugging
- **Debug Dashboard**: A dedicated view at `/performance/debug` helps verify the SM-2 algorithm.
- **Curve Debug**: A dedicated view at `/performance/memory-debug` helps verify data bucket distribution.
- **Endpoint**: `GET /api/review/debug/schedule` returns the logic trace for upcoming 14 days.
- **Endpoint**: `GET /api/review/debug/memory-curve` returns interval histograms and bucket stats.
- **Unit Tests**: `tests/test_sm2_core.py` ensures mathematical correctness of the interval logic.
- **Undo Logic**: The `/undo` endpoint strictly reverts the last review's SM-2 state changes (Interval, Repetition, EF) and deletes the log. The frontend implements an Undo/Redo toggle for the most recent action.

### 3. Async/Sync Hybrid
- **API Routes**: Use `async def` and run blocking LLM calls in thread pools via `run_in_threadpool`.
- **CRITICAL RULE**: Do NOT use `async def` for CPU-bound or blocking I/O operations (like `time.sleep`, heavy file parsing) unless you `await` them. If you can't await them, use `def` (sync) so FastAPI runs them in a thread pool. Mixing blocking code in `async def` will freeze the entire event loop.
- **Database**: All DB operations are async using `AsyncSessionLocal`.
- **Tests**: Use `pytest-asyncio` with function-scoped fixtures for isolation.

### 4. Stateful Chat Sessions
- **Creation**: `start_new_mission()` generates mission, stores in DB, returns session_id.
- **Continuation**: `handle_chat_turn()` loads history, calls LLM, updates DB.
- **Storage**: PostgreSQL with JSONB columns for flexible mission/history data.

## File Locations

**Source Code**:
- `app/` - Main application package
  - `services/` - Business logic (sentence_study_service.py, llm.py, etc.)
  - `api/routers/` - FastAPI routers

- `frontend/src/components/sentence-study/` - Sentence Study views & components
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
- **Alembic `NotNullViolationError`**: Adding a non-nullable column to an existing table fails without a default value.
    - **Fix**: Always add `server_default='...'` to `op.add_column` for non-nullable columns in migration scripts.
- **API/Frontend Contract Mismatch**: Frontend components may silently fail to render if API response keys don't match exactly what props expect.
    - **Fix**: Double-check Pydantic schemas or dict keys in backend against React component usage. (e.g., `total_reviews` vs `total_words_analyzed`).
- **Tailwind CSS Variable Opacity**: Using `bg-color/50` with CSS variables defined as Hex codes (e.g., `--color: #ff0000`) fails silently.
    - **Fix**: Define CSS variables as RGB triplets (e.g., `--color: 255 0 0`) and use `rgb(var(--color) / <alpha-value>)` in `tailwind.config.js`.
- **Tailwind Color Token Consistency**: When adding new UI components, avoid using raw Tailwind colors (e.g., `text-white`, `bg-green-500`) or undefined tokens (e.g., `category-green` when only `category-blue` is defined).
    - **Fix**: Always check `tailwind.config.js` to verify the color token exists before using it. Use semantic tokens from the design system (e.g., `text-text-primary`, `bg-accent-success`, `bg-category-blue`).
    - **Available Category Colors**: `orange`, `blue`, `amber`, `red`, `gray`, `indigo`, `yellow` (NO `green` - use `accent-success` instead).

- **Authenticated Fetch in PWA/Offline Utils**: Native `fetch()` does not include JWT tokens.
    - **Fix**: Always pass `authFetch` (from `api/auth.js`) or manually add `Authorization` headers when making requests from utility functions like `downloadEpisodeForOffline`.
- **Podcast Redirects & Content-Length**: CDNs (like Megaphone) redirect audio requests, and `httpx` follows redirects by default only for some methods or needs explicit config. Also, `Content-Length` is needed for progress bars.
    - **Fix**: Use `client.stream('GET', ..., follow_redirects=True)` in backend proxy. Perform a `HEAD` request first to get `Content-Length` if the stream response lacks it.
- **Podcast RSS Episode Limits**: iTunes Search API returns historical total counts (e.g., 100+), but many RSS feeds only provide the most recent episodes (e.g., 4) to save bandwidth. This is NOT a bug.
    - **Fix**: UI should differentiate between "Total Episodes" (iTunes) and "Available Episodes" (RSS), or provide a tooltip explanation.

### Production Network & Proxy Strategy (NEW 2026-01-24)

- **SOCKS5 Proxy Support**: Standard `httpx` does not support SOCKS5.
    - **Fix**: Must install `httpx[socks]` dependency.
    - **Configuration**: Use `PROXY_URL` env var (e.g., `socks5://172.17.0.1:7890`).
- **SSL Issues with RSS Feeds**: Many older podcast servers have expired/incomplete certificate chains that fail in strict production environments (Linux/Docker) but pass on local dev (Mac/Windows).
    - **Fix**: Implement an auto-retry mechanism: Try standard SSL first; if it fails, catch `httpx.ConnectError/SSLError` and retry with `verify=False`.
- **User-Agent Blocking**: CDNs (Cloudflare) often block default Python User-Agents.
    - **Fix**: Always set a full Browser User-Agent header (e.g., Chrome/123.0) for RSS fetches.
- **Proxy Architecture (Sidecar Pattern)**: Do NOT embed VLESS/Shadowsocks clients into the application container.
    - **Best Practice**: Run the proxy client (Xray/Clash) as a separate "Sidecar" container or standalone service on the host. The application should only know about the standard HTTP/SOCKS interface.
    - **Ref**: See `docs/skills/setup-proxy-client.md`.

### Docker Dependency Management
- **`uv.lock` vs `pyproject.toml`**: During rapid dev, `uv.lock` might lag behind `pyproject.toml`.
    - **Pitfall**: Using `uv sync --frozen` in Dockerfile causes build failures if lockfile is stale.
    - **Fix**: Remove `--frozen` in Dockerfile unless you have a strict CI process to ensure lockfile currency.

### Database Connection
- **Tests**: Require PostgreSQL running on `localhost:5432` with `nce_practice_test` database.
- **Fixture**: `conftest.py` drops/creates all tables per test function for isolation.
- **Override**: Test fixtures override `get_db()` dependency to inject test session.

### MDX Resource Paths
- **MDD Keys**: Often use Windows-style paths (`\image.png`) or just filenames.
- **Lookup Priority**: Check filesystem first, then MDD cache, then basename fallback.
- **Rewriting**: All `src`, `href` attributes in HTML are rewritten to absolute `/dict-assets/` URLs.
- **Parsing Robustness**: Some LDOCE entries (like 'palestinian') lack standard `<en>` tags within definitions. The parser implements a fallback to read direct text nodes while excluding `<tran>` tags.

### EPUB Sentence Extraction
- **Consistency Rule**: Always use **Block-Based Extraction** (sentences from `ContentBlock` paragraphs) for counting.
- **Do NOT** use `_split_sentences_lenient(full_text)` for logic or status checks, as it often produces different counts than the structured content used in the UI.
- **Caching**: Use `article.get("block_sentence_count")` which is pre-computed during EPUB loading to avoid O(N) HTML parsing in list endpoints.

### EPUB Provider Caching (Crucial Performance)
- **Module-Level Caching**: `EpubProvider` uses a module-level `_epub_cache` (Singleton pattern) to store parsed `EpubBook` data.
- **Instance-Level Fallacy**: Do NOT rely on `self._cached_articles` in a fresh `EpubProvider()` instance without checking the module cache. FastAPI creates a new provider instance for every request.
- **Strategy**: The `_load_epub` method automatically checks middleware cache before parsing.


### Voice on Mobile
> See [Mobile Voice Debugging Skill](docs/skills/mobile-voice-debugging.md) for HTTPS setup and troubleshooting.


## Skills (Detailed Tool Guides)

以下技能模块包含详细操作指南，需要时按需加载：

| Skill | 路径 | 何时使用 |
|-------|------|----------|
| User Administration | [docs/skills/user-administration.md](docs/skills/user-administration.md) | **管理用户** - 创建、迁移数据、重置密码 |
| Database Management | [docs/skills/database-management.md](docs/skills/database-management.md) | **数据库维护** - Alembic 迁移命令 |
| Dictionary Maintenance | [docs/skills/dictionary-maintenance.md](docs/skills/dictionary-maintenance.md) | **词典维护** - Parser Golden Standard 测试 |
| Mobile Voice Debugging | [docs/skills/mobile-voice-debugging.md](docs/skills/mobile-voice-debugging.md) | **移动端调试** - HTTPS 证书与远程调试 |
| Post-Change Verification | [docs/skills/post-change-verification.md](docs/skills/post-change-verification.md) | **代码变更后、通知用户前** - 自动验证变更是否有问题 |
| Local Deployment | [docs/skills/local-deployment.md](docs/skills/local-deployment.md) | Docker 本地/内网部署 |
| Voice Integrations | [docs/skills/voice-integrations.md](docs/skills/voice-integrations.md) | 调用 ElevenLabs/Deepgram/Gemini/Dashscope 语音 API |
| AUI Streaming Protocol | [docs/skills/aui-streaming-protocol.md](docs/skills/aui-streaming-protocol.md) | 实现或调试 Agent 实时流式 UI 更新 |
| Podcast Architecture | [docs/skills/podcast-architecture.md](docs/skills/podcast-architecture.md) | **Podcast 开发** - Apple API 策略与缓存机制 |
| SDK Debugging | [docs/skills/sdk-debugging.md](docs/skills/sdk-debugging.md) | 第三方 SDK 调用失败的诊断方法 |
| API Docs Query | [docs/skills/api-docs-query.md](docs/skills/api-docs-query.md) | 查询 ElevenLabs/Deepgram 离线 API 文档 |

### Voice Integrations (概要)

所有语音厂商集成使用 **raw `httpx` API 调用**，而非 SDK：
- **ElevenLabs**: TTS/STT/SFX/STS via `app/services/voice_lab.py`
- **Deepgram**: TTS/STT + WebSocket 代理 via `app/api/routers/deepgram/`
- **Gemini**: 官方 SDK Live API
- **Dashscope**: Qwen3-TTS/ASR

> 详见 [Voice Integrations Skill](docs/skills/voice-integrations.md)

### AUI Streaming Protocol (概要)

Agent-to-UI 实时流式协议，支持：
- JSON Patch 增量更新、工具调用生命周期、中断事件
- WebSocket 双向通信，PostgreSQL LISTEN/NOTIFY
- 移动端兼容（自动重连、触摸优化）

> 详见 [AUI Streaming Protocol Skill](docs/skills/aui-streaming-protocol.md)
