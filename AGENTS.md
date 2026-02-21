# CLAUDE.md

This file provides guidance to Coding agent when working with this repository.

## Project Overview

This is a comprehensive AI-powered English learning platform that combines:

1. **Hybrid Dictionary** - Collins COBUILD + Longman LDOCE with AI context explanations
2. **Sentence Study** - Progressive i+1 learning with 4-stage scaffolding
3. **Voice Practice** - Real-time AI conversation with Gemini/Deepgram
4. **Scenario Roleplay** - Contextual dialogue with specified topics & tenses
5. **Podcast System** - Subscription, offline playback & AI transcription
6. **Audiobook Player** - Synchronized subtitles (SRT/VTT/LRC)
7. **SM-2 Review** - Spaced repetition with memory curve visualization
8. **Weak Points Tracking** - Unified view of difficult vocabulary & phrases

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
│   ├── web/                # React Vite App (前端 SPA)
│   │   ├── src/            # 前端源码
│   │   ├── public/         # 静态资源
│   │   └── scripts/        # 构建脚本
│   ├── mobile/             # Expo React Native (跨端移动应用)
│   │   ├── app/            # Expo 入口
│   │   ├── src/            # 移动端源码
│   │   └── assets/         # 移动端资源
│   └── backend/            # 后端逻辑代理 (package.json only)
├── packages/
│   ├── api/                # 共享 API 逻辑 (认证、类型、客户端)
│   │   └── src/
│   ├── shared/             # 共享 Hooks、工具、状态 (Zustand)
│   │   ├── hooks/          # 纯逻辑 hooks (View Model 模式)
│   │   ├── utils/          # 通用工具函数
│   │   └── platform/       # 平台兼容性处理
│   ├── store/              # 全局状态管理 (Zustand stores)
│   │   └── src/
│   └── ui-tokens/          # 共享设计令牌 (颜色、字体、间距)
│       └── src/
├── app/                    # Python 后端 (FastAPI)
│   ├── api/routers/        # API 路由
│   │   ├── auth.py         # 认证相关
│   │   ├── content.py      # 内容管理
│   │   ├── dictionary.py   # 词典查询
│   │   ├── review.py       # 复习算法
│   │   ├── sentence_study.py # 句子学习
│   │   ├── podcast.py      # 播客系统
│   │   ├── voice_lab.py    # 语音实验室
│   │   ├── aui_websocket.py # Agent UI WebSocket
│   │   └── ...
│   ├── services/           # 业务逻辑层
│   │   ├── llm.py          # LLM 客户端 (DeepSeek + Gemini)
│   │   ├── dictionary.py   # MDX/MDD 词典管理
│   │   ├── tts.py          # TTS 语音合成 (Edge-TTS)
│   │   ├── voice/          # 语音服务
│   │   │   ├── voice_session.py
│   │   │   └── voice_tester.py
│   │   ├── content/        # 内容服务
│   │   │   └── content_feeder.py
│   │   ├── learning/       # 学习服务
│   │   │   ├── proficiency_service.py  # 熟练度评估
│   │   │   └── sentence_study_service.py # 句子学习
│   │   ├── parsing/        # 词典解析器
│   │   │   ├── collins_parser.py   # Collins COBUILD
│   │   │   └── ldoce_parser.py     # Longman LDOCE
│   │   ├── media/          # 媒体处理
│   │   ├── voice_lab.py    # 语音实验室核心
│   │   ├── podcast_service.py # 播客服务
│   │   ├── negotiation_service.py # 谈判对话服务
│   │   ├── context_service.py   # 上下文服务
│   │   ├── log_collector.py     # 统一日志收集
│   │   ├── image_generation.py  # AI 图片生成 (智谱)
│   │   ├── auth.py         # 认证服务
│   │   ├── agent_functions.py   # Agent 工具函数
│   │   └── aui/            # Agent UI 核心
│   ├── models/             # 数据模型
│   │   ├── orm.py          # SQLAlchemy ORM 定义
│   │   ├── auth_schemas.py # 认证 Pydantic 模型
│   │   ├── collins_schemas.py   # Collins 词典模型
│   │   ├── ldoce_schemas.py     # LDOCE 词典模型
│   │   └── *_schemas.py    # 其他业务模型
│   ├── core/               # 核心工具
│   │   ├── db.py           # SQLAlchemy 异步会话
│   │   └── utils.py        # 通用工具
│   ├── generators/         # LLM 内容生成器
│   └── prompts.yaml        # LLM Prompt 模板
├── scripts/                # 工具脚本
│   ├── dev.ps1             # 开发服务器启动
│   ├── test.ps1            # 测试脚本
│   └── user_admin.py       # 用户管理
├── resources/              # 词典资源
│   └── dictionaries/       # MDX/MDD 词典文件
├── alembic/                # 数据库迁移
│   └── versions/
├── tests/                  # 测试套件
├── docs/                   # 文档
│   ├── skills/             # 技能指南
│   └── *.md                # 系统文档
└── turbo.json              # Turborepo 构建编排
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

### 4. Collocation Cache Reset Script

When collocation prompt/schema changes and you need full re-detection, use:

```bash
uv run python scripts/clear_collocation_cache.py --yes
```

This clears DB cache table `sentence_collocation_cache`; restart backend to clear in-memory cache too.

## Shortcuts (Windows)

```powershell
./scripts/dev.ps1        # Start Server (HTTP)
./scripts/dev.ps1 -Https # Start Server (HTTPS)
./scripts/test.ps1       # Run All Tests (E2E + Backend)
```

## Deployment Script Notes

- `deploy/scripts/deploy.sh` now prunes dangling images (`<none>`) after successful deploy to control disk growth on VPS.
- Use `./scripts/deploy.sh --no-prune` when you need to keep intermediate images for debugging.

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

# Network / TLS
OUTBOUND_SSL_VERIFY=true  # Keep true in production; set false only for trusted local proxy debugging

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
├── app_factory.py              # FastAPI assembly (lifespan, routers, middleware, SPA mount)
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

Multi-user authentication with JWT tokens, token refresh strategy, and data migration tools. See: [Auth System Documentation](docs/auth-system.md)

- **Router dependency entrypoint**: `app/api/deps/auth.py` re-exports auth dependencies (`get_current_user`, `require_current_user`, `get_current_user_id`) so business routers do not import from `app/api/routers/auth.py` directly.

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

### Weak Points Dashboard

- **Web Route**: `/weak-points` (entry added in `/nav`).
- **API**: `GET /api/vocabulary/unfamiliar-items`
  - Query params: `item_type=all|word|phrase`, `sort=recent|count|difficulty`, `q`, `limit`, `offset`
- **Data Sources**: Aggregates from `SentenceLearningRecord.word_clicks/phrase_clicks`, `VocabLearningLog`, `ReviewItem.highlighted_items`, and `WordProficiency`.
- **Purpose**: Unified view for unfamiliar words/collocations with context samples, review queue status, and difficulty signals.

### Vocabulary Context History

- **API**: `GET /api/vocabulary/contexts?word=...`
- **Behavior**: Returns explicit lookup history from `VocabLearningLog` only (for "我查过什么").
- **Metadata**: Includes `source_title` / `source_label` for source-aware display in WordInspector (uses `ReadingSession.article_title` and podcast episode titles when available).
- **Usage Exploration API**: `GET /api/vocabulary/usages?word=...&limit=10&exclude_sentence=...` aggregates from `SentenceLearningRecord`, `ReviewItem`, lookup logs, and recent EPUB source text search for cross-article "other usages".

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

Offline playback with PWA support, audio caching via Cache API, and episode state tracking (resume position, finished status). See: [Podcast System Documentation](docs/podcast-system.md)

- **Favorites (Server-backed)**:
  - **Data Model**: `PodcastFavoriteEpisode` (`podcast_favorite_episodes`)
  - **API**: `GET /api/podcast/favorites`, `GET /api/podcast/favorites/ids`, `POST /api/podcast/episode/{id}/favorite`, `DELETE /api/podcast/episode/{id}/favorite`
  - **Web**: Favorites page and in-feed favorite toggle in `apps/web/src/views/podcast/PodcastFeedDetailView.tsx`
  - **Mobile**: Favorites list route `apps/mobile/app/podcast/favorites.tsx`, entry button in `apps/mobile/app/(tabs)/podcast.tsx`, and in-feed favorite toggle in `apps/mobile/src/components/podcast/PodcastDetailView.tsx`
- **Router Composition (Backend)**:
  - `app/api/routers/podcast.py` is the composition entry (`/api/podcast` prefix)
  - Feed/favorites/opml/image endpoints: `app/api/routers/podcast_feed_routes.py`
  - Session/sync/device endpoints: `app/api/routers/podcast_session_routes.py`
  - Download proxy endpoints: `app/api/routers/podcast_download_routes.py`
  - Transcription trigger/background task endpoints: `app/api/routers/podcast_transcription_routes.py`
- **Feed Detail Search (Backend + Web)**:
  - `GET /api/podcast/feed/{feed_id}` now supports optional `q` for server-side episode keyword filtering (title)
  - `apps/web/src/views/podcast/PodcastFeedDetailView.tsx` uses this query param so filtering works correctly with paginated "Load More" lists
- **Performance Ranking**:
  - `GET /api/performance/study-time` now includes `podcast_channels` (Top 10 channels by listened seconds in selected time range, including channel cover `image_url`), aggregated from `podcast_listening_sessions` -> `podcast_episodes` -> `podcast_feeds`
- **Session Analytics Mode Tag**:
  - `podcast_listening_sessions.listening_mode` distinguishes session source (`normal` feed playback vs `intensive` unified-player mode)
  - Aggregation for `GET /api/performance/study-time` remains unified under `podcast` total for now (mode tag is for future split analytics)
- **Playlists (Client-only)**:
  - Stored in browser `localStorage` via `apps/web/src/utils/podcastPlaylists.ts`
  - Web routes: `/podcast/playlists` and `/podcast/playlist/:playlistId`
  - Add-to-playlist action available per episode in feed detail view
  - Web playlist detail playback now seeds a queue in `apps/web/src/context/PodcastContext.tsx` so when an episode ends it auto-continues to the next item in that playlist

#### AI Transcription (Intensive Listening Mode)

Podcast episodes can be transcribed using AI to enable time-aligned subtitle display.

- **Design Document**: `docs/podcast-ai-transcription-design.md`
- **Architecture**: `Client-Server` (Optional Remote Transcription)
- **Transcription Engine**: `app/services/transcription/` - Pluggable engine architecture
  - `remote.py` - HTTP Client for remote GPU worker
  - `sensevoice.py` - Local SenseVoice GPU implementation
- **API**: `POST /api/podcast/episode/{id}/transcribe` - Trigger transcription (accepts `remote_url` & `api_key`)
  - **Probe API**: `POST /api/podcast/transcription/probe` - Manually verify remote transcription URL/API key reachability from settings
  - Remote worker endpoints: `POST /api/transcribe/jobs` + `GET /api/transcribe/jobs/{job_id}` (async submit/poll; avoids long single-request proxy timeout)
  - Remote mode supports `audio_url` input so the worker can fetch audio directly (avoids uploading full podcast bytes from caller)
- **Data Model**: `PodcastEpisode.transcript_segments` (JSONB) stores time-aligned segments
- **Frontend (Web)**: "Intensive Listening" flow in `apps/web/src/views/podcast/PodcastFeedDetailView.tsx` + `apps/web/src/views/player/UnifiedPlayerView.tsx`
  - `UnifiedPlayerView` now includes a Study Basket side panel for podcast/audiobook intensive listening: clicked word/collocation lookups and bookmarked subtitle sentences are staged in basket, manageable (remove/un-bookmark), and batch-submitted to review queue via one-click add (no immediate enqueue on click)
  - Study Basket state is persisted server-side per user + content scope via `/api/study-basket/{source_type}/{content_id}` (web syncs basket automatically, so refresh/reopen keeps collected items)
  - Podcast intensive keyboard controls now support `podcastKeymapMode` (`standard` / `vim`) from Settings: Vim mode provides `j/k` sentence navigation plus single-line quick jump (`s` -> label targets including multi-word collocations -> `K` query, `;`/`,` cycle, `Esc` close)
- **Frontend (Mobile)**: "Intensive Listening" flow in `apps/mobile/app/podcast/intensive.tsx` (entry from `apps/mobile/src/components/podcast/PodcastDetailView.tsx`)

**Audio Format Support**:

- Native support (soundfile): WAV, FLAC, OGG, AIFF
- Requires ffmpeg: MP3, M4A, M4V, AAC, MP4, WebM, Opus

To enable M4A/MP4 transcription, install ffmpeg:

```bash
# Windows
winget install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg
```

### Audiobook System

Local audiobook playback with synchronized subtitle highlighting.

- **Backend Provider**: `app/services/content_providers/audiobook_provider.py`
- **API Routes**: `app/api/routers/audiobook.py`
  - `GET /api/content/audiobook/` - List all audiobooks
  - `GET /api/content/audiobook/{book_id}` - Get audiobook content with subtitle segments
  - `GET /api/content/audiobook/{book_id}/audio` - Stream audio file
- **Shared API Client**: `packages/api/src/endpoints/audiobook.ts`
- **Frontend Hook**: `packages/shared/src/hooks/useAudioPlayer.ts` - Audio playback state management
- **Frontend Renderer**: `apps/web/src/components/content/renderers/AudioContentRenderer.tsx`
- **Views**: `apps/web/src/views/audiobook/` - Library and Player views
- **Mobile Views**: `apps/mobile/app/(tabs)/audiobook.tsx` and `apps/mobile/app/audiobook/[bookId].tsx`
- **Subtitle Formats**: SRT, VTT, LRC
- **Directory Structure**: `resources/audiobooks/{book_id}/` containing `audio.mp3` + `subtitles.srt` + optional `metadata.json`

### EPUB Provider Boundaries

- **Provider**: `app/services/content_providers/epub_provider.py`
- **Public methods for routers/services**: `list_books()`, `resolve_filename(filename_or_id)`, `get_articles(filename_or_id)`, `get_block_sentence_count(article)`, `split_sentences(text)`
- **Rule**: callers should not access private EPUB internals (`_load_epub`, `_cached_articles`, `_split_sentences_lenient`, `_extract_structured_blocks`) outside the provider

### Source ID Parsing

- **Utility**: `app/services/source_id.py` provides shared helpers (`parse_source_id`, `parse_epub_source_id`)
- **Rule**: routers/services should reuse these helpers for `{source_type}:{item_id}:{index}` parsing instead of ad-hoc `split(":")` logic

### Unified Content Protocol

- **Catalog API**: `GET /api/content/catalog/{source_type}` returns provider items (for EPUB includes stable `id` + `filename`)
- **Units API**: `GET /api/content/units/{source_type}/{item_id}` and `/with-status` return chapter/unit lists keyed by stable item id
- **Bundle API**: `GET /api/content/bundle?source_id=...` is the unified read endpoint for reading/sentence-study overlays
- **Asset API**: `GET /api/content/asset?source_id=...&path=...` serves provider assets (EPUB images currently)
- **Capabilities Contract**: providers expose `get_capabilities()` and include flags under `ContentBundle.metadata.capabilities`

### Content Renderer System

Unified rendering system for different content types (epub, podcast, audiobook). See: [Content Renderer Skill](docs/skills/content-renderer.md)

**CRITICAL Memory**:

- Use `studyWordSet` + `studyPhraseSet` (NOT `studyHighlightSet`) - split for different rendering styles
- Use `getCollocations` callback (NOT static collocations array) - each sentence needs its own collocations
- `MemoizedSentence.jsx` re-exports `SentenceBlock` - always use `SentenceBlock` for new code
- Collocation detection now outputs `reasoning` (English rationale) + `difficulty` (1/2/3) + optional `confidence`; frontend/mobile apply global real-time filtering via `collocationDisplayLevel` (`basic|core|full`) across reading/sentence-study/podcast/audiobook/review flows

### Coach Service (Agentic)

Central orchestrator for "Neural Link" mode with tool-using agent pattern. LLM decides UI components via DSML parser. Includes Voice/WebSocket integration. See: [Coach Service Documentation](docs/coach-service.md)

### Context-Aware Image Generation

- **Service**: `app/services/image_generation.py` using Zhipu GLM-Image.
- **Trigger**: LLM analyzes sentence context to determine if visual aid helps understanding.
- **Parallelism**: Image detection runs parallel to text explanation to reduce latency.
- **Storage**: generated images are stored in Postgres (`generated_images` table) as raw bytes.
- **Config**: Controlled by `ENABLE_IMAGE_GENERATION` in `.env`.
- **Frontend**: `WordInspector` receives `image_check` events via SSE to trigger generation.

## Key Design Patterns

Tracing project by this markdown file. So update this file when you update the code. Do not add progressive infomations to this file. This file is like a long term memory of the project. So you should make sure this file is always up to date.

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
| --------------- | ----------------------------- | ------ |
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
- **Concurrent DB Tasks**: Never share one `AsyncSession` across `asyncio.gather` tasks; create isolated sessions per concurrent task (same pattern as collocation batch detection and stats aggregation).
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

Windows testing conflicts, Tailwind CSS variable issues, NativeWind alpha syntax limitations, podcast RSS limits, and Docker dependency management. See: [Common Pitfalls Documentation](docs/common-pitfalls.md)

### Content Renderer Pitfalls

See: [Content Renderer Skill](docs/skills/content-renderer.md) for detailed pitfalls and solutions.

**Quick Reference**:

- Use `studyWordSet` + `studyPhraseSet` (NOT `studyHighlightSet`)
- Use `getCollocations` callback (NOT static collocations array)
- `MemoizedSentence.jsx` re-exports `SentenceBlock` - always use `SentenceBlock` for new code
- When using renderer, pass custom logic via props (renderer handles all rendering internally)

## Mobile Architecture & Guidelines

React Native + Expo + NativeWind architecture. Covers audio background tasks, WebView bridge, voice PTT, Zustand persistence, and SSE streaming. See: [Mobile Architecture Documentation](docs/mobile-architecture.md)

- **Reading/Sentence Study List Reuse (Mobile)**: `apps/mobile/src/components/UnifiedArticleListMobile.tsx` is the shared entry list UI for both `apps/mobile/app/(tabs)/library.tsx` (Reading) and `apps/mobile/app/sentence-study.tsx` (Sentence Study), mirroring Web's `UnifiedArticleListView` pattern.
- **Unified Content Contract**: mobile book/article list loaders must support `catalog` as `items` (legacy `books`) and units as `units` (legacy `articles`) to stay compatible with `/api/content/catalog/epub` and `/api/content/units/epub/{item_id}/with-status`.
- **Reading Collocations (Mobile)**: `apps/mobile/app/reading/[id].tsx` loads sentence collocations via shared `useCollocationLoader`, and `apps/mobile/src/utils/htmlGenerator.ts` renders phrase-level dashed collocation highlights in the WebView (filtered by global `collocationDisplayLevel`).
- **Shared Collocation Logic**: use `packages/shared/src/utils/collocationHighlight.ts` (`filterCollocationsByLevel`, `normalizeStudyHighlights`, `normalizePhrase`) as the single source of truth for Reading/Sentence Study collocation filtering and study-highlight normalization.
- **Shared Collocation Level Switch (Mobile)**: `apps/mobile/src/components/content/CollocationLevelSwitch.tsx` is the shared UI control for `collocationDisplayLevel`; Reading, Sentence Study, Podcast Intensive, and Audiobook should reuse this component to avoid UI drift.
- **Settings Contract Parity**: `packages/store/src/modules/settings` should keep `podcastSpeed` and `transcriptionRemote*` keys aligned with web `GlobalSettings`; mobile podcast intensive transcription should pass optional `remote_url` and `api_key` through `podcastApi.transcribeEpisode` when remote mode is enabled.
- **Podcast Playlists + OPML (Mobile)**: mobile supports local playlist management at `apps/mobile/app/podcast/playlists.tsx` and `apps/mobile/app/podcast/playlist/[playlistId].tsx` (storage utility: `apps/mobile/src/utils/podcastPlaylists.ts`), and OPML import/export tools at `apps/mobile/app/podcast/opml.tsx`.
- **Unified Player Route (Mobile)**: mobile exposes `/player/[sourceType]/[contentId]` via `apps/mobile/app/player/[sourceType]/[contentId].tsx` to align deep-link shape with web unified player paths while delegating to platform-specific screens.
- **Mobile Debug Route Parity**: mobile exposes review debug routes `apps/mobile/app/performance/debug.tsx` and `apps/mobile/app/performance/memory-debug.tsx` with access from `apps/mobile/app/(tabs)/stats.tsx`.

## Skills (Detailed Tool Guides)

以下技能模块包含详细操作指南，需要时按需加载：

| Skill                        | 路径                                                                                       | 何时使用                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| **Enhanced API Client**      | [docs/skills/api-client.md](docs/skills/api-client.md)                                     | **HTTP 请求** - 便利方法、错误处理、流式响应、超时控制           |
| **Content Renderer**         | [docs/skills/content-renderer.md](docs/skills/content-renderer.md)                         | **内容渲染** - SentenceBlock、Collocation、Renderer 架构         |
| **Mobile Architecture**      | [docs/MOBILE_ARCHITECTURE_PLAN.md](docs/MOBILE_ARCHITECTURE_PLAN.md)                       | **移动端开发** - 跨端复用架构与迁移计划                          |
| **Mobile Dev Pitfalls**      | [docs/skills/mobile-dev-pitfalls.md](docs/skills/mobile-dev-pitfalls.md)                   | **移动端开发** - NativeWind 样式问题、Alpha 语法、条件 className |
| Mobile Quick Reference       | [docs/MOBILE_QUICK_REFERENCE.md](docs/MOBILE_QUICK_REFERENCE.md)                           | **移动端开发** - 快速参考与代码模板                              |
| Transcription Service        | [docs/transcription-service.md](docs/transcription-service.md)                             | **远程转写服务** - Client/Server 配置指南                        |
| User Administration          | [docs/skills/user-administration.md](docs/skills/user-administration.md)                   | **管理用户** - 创建、迁移数据、重置密码                          |
| Database Management          | [docs/skills/database-management.md](docs/skills/database-management.md)                   | **数据库维护** - Alembic 迁移命令                                |
| Dictionary Maintenance       | [docs/skills/dictionary-maintenance.md](docs/skills/dictionary-maintenance.md)             | **词典维护** - Parser Golden Standard 测试                       |
| Mobile Voice Debugging       | [docs/skills/mobile-voice-debugging.md](docs/skills/mobile-voice-debugging.md)             | **移动端调试** - HTTPS 证书与远程调试                            |
| Post-Change Verification     | [docs/skills/post-change-verification.md](docs/skills/post-change-verification.md)         | **代码变更后、通知用户前** - 自动验证变更是否有问题              |
| Local Deployment             | [docs/skills/local-deployment.md](docs/skills/local-deployment.md)                         | Docker 本地/内网部署                                             |
| Voice Integrations           | [docs/skills/voice-integrations.md](docs/skills/voice-integrations.md)                     | 调用 ElevenLabs/Deepgram/Gemini/Dashscope 语音 API               |
| AUI Streaming Protocol       | [docs/skills/aui-streaming-protocol.md](docs/skills/aui-streaming-protocol.md)             | 实现或调试 Agent 实时流式 UI 更新                                |
| Podcast Architecture         | [docs/skills/podcast-architecture.md](docs/skills/podcast-architecture.md)                 | **Podcast 开发** - Apple API 策略与缓存机制                      |
| SDK Debugging                | [docs/skills/sdk-debugging.md](docs/skills/sdk-debugging.md)                               | 第三方 SDK 调用失败的诊断方法                                    |
| API Docs Query               | [docs/skills/api-docs-query.md](docs/skills/api-docs-query.md)                             | 查询 ElevenLabs/Deepgram 离线 API 文档                           |
| Design Tokens Best Practices | [docs/skills/design-tokens-best-practices.md](docs/skills/design-tokens-best-practices.md) | **设计系统开发** - DTCG 标准、Style Dictionary、多平台输出       |
