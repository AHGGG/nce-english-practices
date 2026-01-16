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
./scripts/dev.ps1 -Https                # Start with HTTPS
```

```

## Local Deployment (Docker)

部署架构见 `deploy/` 目录。一键部署: `cd deploy && ./scripts/deploy.sh`

> 详见 [Local Deployment Skill](docs/skills/local-deployment.md)

## Shortcuts (Windows)
```powershell
./scripts/dev.ps1        # Start Server (HTTP)
./scripts/dev.ps1 -Https # Start Server (HTTPS)
./scripts/test.ps1       # Run All Tests (E2E + Backend)
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

## TTS
The system uses **Edge-TTS** for audio.
- **Library**: `edge-tts` (Official Microsoft Edge TTS API wrapper).
- **Voice**: `en-US-AndrewMultilingualNeural`.
- **Flow**: Backend streams bytes -> Frontend plays Blob via Web Audio API.

## Architecture

### Package Structure (`app/`)

```
app/
├── main.py, config.py          # 入口 & 配置
├── core/db.py                  # SQLAlchemy async session
├── services/
│   ├── llm.py                  # DeepSeek + Gemini 统一客户端
│   ├── dictionary.py           # MDX/MDD 多词典
│   ├── voice.py, tts.py        # WebSocket 语音 + Edge-TTS
│   ├── voice_lab.py            # 多厂商集成 (ElevenLabs/Deepgram/Dashscope)
│   ├── content_service.py      # Content Provider 工厂
│   └── aui/                    # Agent-to-UI 流式渲染
├── services/content_providers/ # EPUB/RSS/Podcast/PlainText
├── models/
│   ├── schemas.py, orm.py      # Pydantic DTOs + SQLAlchemy ORM
│   └── *_schemas.py            # 按领域拆分的 schema
├── database/                   # DB 操作封装
└── api/routers/
    ├── sentence_study.py       # 核心学习 API (SSE streaming, 两级缓存)
    ├── review.py               # SM-2 间隔重复
    ├── reading.py, content.py  # 阅读 & EPUB
    ├── voice_session.py        # 语音会话
    └── deepgram/               # Deepgram WebSocket 代理
```

**Frontend** (`frontend/src/`):
- `components/sentence-study/` - 句子学习 UI (3-stage simplification, streaming)
- `components/reading/` - 阅读模式 (WordInspector, SentenceInspector)
- `components/performance/` - 仪表盘 (KPI Cards, Memory Curve)
- `hooks/useWordExplainer.js` - 词典 + LLM 解释统一逻辑
- `utils/sseParser.js` - SSE 流解析器



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
    - `useWordExplainer.js`: Unified dictionary + LLM context explanation logic (Shared by Reading/SentenceStudy). **Updated 2026-01-06** to support prev/next sentence context.
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

To prevent parser regressions, we use a golden standard test framework:

```bash
# Generate golden standard test data for a word
uv run python scripts/generate_ldoce_golden.py <word>

# Run golden standard tests
uv run pytest tests/test_ldoce_parser_golden.py -v
```

**Test Data Location**: `resources/test_data/ldoce_golden/`
- `{word}.html` - Raw HTML from MDX dictionary
- `{word}_expected.json` - Verified expected output
- `{word}_current.json` - Current parser output (generated by tests)

**Adding New Test Words**:
1. Run `generate_ldoce_golden.py <word>` to create test data
2. Verify `_current.json` matches real dictionary
3. Copy to `_expected.json` as baseline
4. Add word to `@pytest.mark.parametrize` in test file

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
- **Endpoint**: `GET /api/review/debug/schedule` returns the logic trace for upcoming 14 days.
- **Unit Tests**: `tests/test_sm2_core.py` ensures mathematical correctness of the interval logic.

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

### Database Connection
- **Tests**: Require PostgreSQL running on `localhost:5432` with `nce_practice_test` database.
- **Fixture**: `conftest.py` drops/creates all tables per test function for isolation.
- **Override**: Test fixtures override `get_db()` dependency to inject test session.

### MDX Resource Paths
- **MDD Keys**: Often use Windows-style paths (`\image.png`) or just filenames.
- **Lookup Priority**: Check filesystem first, then MDD cache, then basename fallback.
- **Rewriting**: All `src`, `href` attributes in HTML are rewritten to absolute `/dict-assets/` URLs.
- **Parsing Robustness**: Some LDOCE entries (like 'palestinian') lack standard `<en>` tags within definitions. The parser implements a fallback to read direct text nodes while excluding `<tran>` tags.

### Voice on Mobile
- **HTTPS Required**: WebSocket with audio requires HTTPS.
- **Certificate**: Generate with `uv run python scripts/generate_cert.py`.
- **Start Server**: Use `./scripts/dev.ps1 -Https`.
- **Certificate Trust**: Users must accept self-signed cert warning on first connection.

### PowerShell HTTPS Testing
- PowerShell `curl -k` / `Invoke-WebRequest -SkipCertificateCheck` may fail with self-signed certs.
- **Use Node.js instead**: `$env:NODE_TLS_REJECT_UNAUTHORIZED=0; node -e "fetch('https://localhost:5173/api/...').then(r=>r.json()).then(console.log)"`

## Skills (Detailed Tool Guides)

以下技能模块包含详细操作指南，需要时按需加载：

| Skill | 路径 | 何时使用 |
|-------|------|----------|
| Post-Change Verification | [docs/skills/post-change-verification.md](docs/skills/post-change-verification.md) | **代码变更后、通知用户前** - 自动验证变更是否有问题 |
| Local Deployment | [docs/skills/local-deployment.md](docs/skills/local-deployment.md) | Docker 本地/内网部署 |
| Voice Integrations | [docs/skills/voice-integrations.md](docs/skills/voice-integrations.md) | 调用 ElevenLabs/Deepgram/Gemini/Dashscope 语音 API |
| AUI Streaming Protocol | [docs/skills/aui-streaming-protocol.md](docs/skills/aui-streaming-protocol.md) | 实现或调试 Agent 实时流式 UI 更新 |
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
