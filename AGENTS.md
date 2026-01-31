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
│   ├── mobile/             # Expo React Native (Android/iOS/Web)
│   └── backend/            # Logical proxy for Python backend
├── packages/
│   ├── api/                # Shared API Logic (Auth, Types, Client)
│   ├── shared/             # Shared Hooks, Utils, Stores (Zustand)
│   └── ui-tokens/          # Shared Design Tokens (colors, typography)
│   └── store/              # (Planned) Zustand global state
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
- **Pattern**: Tool-Using Agent. The LLM decides _which_ UI component to show (Vocab, Story, Drill) by calling tools.
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
- **Stage 2 (Content)**: Generate sentences/stories using _only_ the specific vocabulary from Stage 1.

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

- **No Global Base URL**: We do _not_ use `<base>` tags in the frontend.
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

### Mobile Development Pitfalls (2026-01)

This section documents issues encountered while setting up NativeWind v4 and React Native development.

#### 1. React Version Conflicts in Monorepo

- **Symptom**: "Invalid hook call" runtime error when running mobile app
- **Root Cause**: Multiple React versions (19.1.0 vs 19.2.4) in the monorepo workspace due to nested dependencies
- **Fix**: Add `react` and `react-dom` as devDependencies in `packages/shared/package.json`:
  ```json
  "devDependencies": {
    "react": "19.1.0",
    "react-dom": "19.1.0"
  }
  ```
- **Alternative**: Use pnpm overrides in root `package.json`:
  ```json
  "overrides": {
    "react": "19.1.0",
    "react-dom": "19.1.0"
  }
  ```

#### 2. NativeWind CSS Not Applied (White Screen)

- **Symptom**: App renders with no styles - white background, unstyled text
- **Root Cause**: Mobile's `tailwind.config.js` had no custom color tokens defined, so classes like `bg-bg-base`, `text-text-primary` were ignored
- **Fix**:
  1. Add Cyber-Noir design tokens to `apps/mobile/global.css` (same as web `index.css`)
  2. Configure color tokens in `tailwind.config.js`:
     ```js
     theme: {
       extend: {
         colors: {
           bg: { base: 'var(--color-bg-base)' },
           text: { primary: 'var(--color-text-primary)' },
           // ... all other tokens
         }
       }
     }
     ```
  3. Add NativeWind preset to `tailwind.config.js`:
     ```js
     presets: [require("nativewind/preset")];
     ```
  4. Configure Metro in `metro.config.cjs`:
     ```js
     const { withNativeWind } = require("nativewind/metro");
     module.exports = withNativeWind(config, { input: "./global.css" });
     ```

#### 3. Android Emulator Crash - SafeAreaView edges Prop

- **Symptom**: App loads, shows splash, then immediately crashes on Android emulator
- **Log Error**: Native crash in `libreact_codegen_safeareacontext.so` at `RNCSafeAreaViewShadowNode::adjustLayoutWithState()`
- **Root Cause**: The `edges` prop on `SafeAreaView` (e.g., `edges={["top"]}`) causes a native crash in React Native 0.81.5 / Expo SDK 54
- **Fix**: Remove all `edges` props from SafeAreaView components:

  ```jsx
  // BEFORE (crashes)
  <SafeAreaView className="flex-1" edges={["top"]}>

  // AFTER (works)
  <SafeAreaView className="flex-1">
  ```

- **Affected Files**: All screens using SafeAreaView with edges prop

#### 4. expo-notifications Removed from Expo Go SDK 53+

- **Symptom**: App crashes on startup with "expo-notifications: Android Push notifications functionality provided by expo-notifications was removed from Expo Go"
- **Root Cause**: Expo Go SDK 53+ removed expo-notifications support
- **Fix**:
  1. Comment out the import and usage in `app/_layout.tsx`:
     ```tsx
     // NOTE: expo-notifications removed from Expo Go in SDK 53+
     // import { notificationService } from "../src/services/NotificationService";
     ```
  2. In `app/settings.tsx`, replace notification toggle with an alert:
     ```tsx
     const toggleNotifications = async (value: boolean) => {
       Alert.alert(
         "Not Available",
         "Push notifications require a Development Build. This feature is disabled in Expo Go.",
       );
       setNotificationsEnabled(false);
     };
     ```
  3. Re-enable when using Development Build (APK via `expo run:android`)

#### 5. Missing react-native-safe-area-context

- **Symptom**: SafeAreaView renders but app crashes when navigating to screens using it
- **Root Cause**: The package was only installed as a transitive dependency, not explicitly in `package.json`
- **Fix**: Add explicit dependency to `apps/mobile/package.json`:
  ```json
  "react-native-safe-area-context": "~5.6.0"
  ```
- **Important**: After changing dependencies, run `npx expo prebuild --clean` to regenerate native code, then rebuild with `npx expo run:android`

#### 6. pnpm Temp Directory Issues (Windows)

- **Symptom**: `pnpm install` fails with `ENOENT: no such file or directory, scandir 'node_modules/react-native-css-interop_tmp_***/node_modules'`
- **Root Cause**: NativeWind's postinstall script creates temp directories that conflict with Windows file locking
- **Fix**:

  ```powershell
  # Clear problematic temp directories
  rm -rf node_modules/react-native-css-interop_tmp_*

  # Retry install (packages still install despite errors)
  pnpm install
  ```

#### 7. Metro Bundler Cache Issues

- **Symptom**: Changes to `tailwind.config.js` or `global.css` not reflected in app
- **Fix**: Always clear Metro cache after config changes:
  ```bash
  npx expo start --clear
  # or manually delete node_modules/.cache
  ```

#### 8. Android Emulator Instability

- **Symptom**: App crashes, freezes, or shows black screen on Android emulator
- **Context**: Android x86 emulators are known to be unstable, especially with native modules and GPU rendering
- **Workaround**: Use a real physical device for development
  - Connect via USB with USB debugging enabled
  - Run `npx expo start` and press `a` to open on connected device
  - Or use `adb connect <device-ip>` for wireless debugging

#### 9. Development Build vs Expo Go

| Feature                          | Expo Go            | Development Build     |
| -------------------------------- | ------------------ | --------------------- |
| Native modules (not in Expo SDK) | ❌ No              | ✅ Yes                |
| Background audio                 | ❌ No              | ✅ Yes                |
| Push notifications               | ❌ Removed SDK 53+ | ✅ Yes                |
| Build speed                      | Instant (download) | 3-10 minutes          |
| Debugging                        | Limited            | Full native debugging |

**Recommendation**: For production features requiring native code, always use Development Build (`npx expo run:android`). Use Expo Go only for rapid prototyping of pure JS/React features.

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

## Mobile Architecture & Guidelines (2025)

The mobile app (`apps/mobile`) shares 95% of its business logic with the web app (`apps/web`) via `@nce/shared` and `@nce/store`.

### 1. Audio & Background Tasks (Crucial)

- **Expo Go Limitation**: Background audio (e.g., Podcast playback while screen off) **DOES NOT WORK** in the standard Expo Go client. You MUST use a **Development Build**.
- **Configuration**:
  - **iOS**: `UIBackgroundModes: ["audio"]` in `app.json`.
  - **Android**: `FOREGROUND_SERVICE` & `FOREGROUND_SERVICE_MEDIA_PLAYBACK` permissions (Android 14+ requirement).
- **Service Pattern**: Use `staysActiveInBackground: true` in `Audio.setAudioModeAsync()`. Ideally, migrate to `react-native-track-player` for native Lock Screen controls.

### 2. WebView Bridge Strategy

For heavy data transfer (like passing a 2MB book content to the Reader):

- **Data Transfer**: Use `postMessage` (Native -> Web). It is more performant than `injectJavaScript` for large JSON payloads.
- **State Updates**: Use `injectJavaScript` for small, frequent updates (e.g., toggling highlights).
- **Android Limit**: Be aware of string length limits in older Android WebViews.

### 3. Voice Implementation (Push-to-Talk)

- **Architecture**: We use a **Push-to-Talk (PTT)** model for stability on Expo.
  - **Input**: Record AAC (Android) or WAV (iOS) via `expo-av`.
  - **Transport**: Send Base64 encoded audio chunks over WebSocket to `app/services/voice_session.py`.
  - **Output**: Receive PCM, wrap in WAV header (using `audioUtils.ts`), and play via `expo-av` queue.
- **MIME Types**: The backend supports dynamic `mime_type` ("audio/aac", "audio/wav") to handle cross-platform formats without transcoding on the client.

### 4. Shared State Persistence

- **Pattern**: Zustand with `persist` middleware.
- **Adapter**: You MUST use `createJSONStorage(() => AsyncStorage)` adapter in `apps/mobile`. Standard `localStorage` will fail.
- **Initialization**: Mobile app initializes platform adapters in `src/lib/platform-init.ts` called from `_layout.tsx`.

### 5. React Native SSE Streaming (2026-01-30)

**核心教训**: 后端必须使用 `stream=True` 才能真正流式发送数据。仅包装一个 `StreamingResponse` 但内部调用同步方法不会产生任何效果。

**解决方案**:

- **前端**: 使用 `react-native-sse` 库（基于 XMLHttpRequest，可正确处理 SSE）
- **后端**: 必须直接对 LLM 使用 `stream=True`，不能先调用同步方法再 yield

**关键文件**:

- `apps/mobile/src/hooks/useWordExplainer.ts`
- `app/services/sentence_study_service.py` (函数 `stream_word_explanation`)

**依赖变更**: 用 `react-native-sse@^1.2.1` 替换 `react-native-fetch-api`

**常见问题**:

1. **跨平台 Hook 冲突**: 移动端导入 `@nce/shared` 中的 Web hooks 会失败
   - **症状**: SSE 连接建立但无数据流入，或直接报错
   - **修复**: 移动端必须使用本地 `apps/mobile/src/hooks/` 中的专用 hooks（使用 `react-native-sse`）

2. **对象数据调用字符串方法**: 后端返回对象但前端误当作字符串处理
   - **症状**: `TypeError: xxx.substring is not a function`
   - **示例**: `parsed.overview` 是 `{summary_en, summary_zh, ...}`，不能调用 `.substring()`
   - **修复**: 检查数据类型，使用正确的访问方式（如 `parsed.overview.summary_en`）

3. **SSE 异常后 Loading 卡死**: Parse 错误后 `setIsLoading(false)` 未调用
   - **修复**: 在 `catch` 块和 `error` 事件中确保调用 `setIsLoading(false)`
   - **最佳实践**: SSE 完成后主动关闭连接 `eventSourceRef.current.close()`

4. **状态未重置导致残留**: 切换到下一项时，上一项的状态（如简化文本）仍然显示
   - **症状**: 点击 "Clear" 进入下一句，上一句的解释仍在界面
   - **修复**: 在 `advance/handleClear` 时调用 `reset()` 清空本地 hook 状态
   - **关键**: 移动端可能使用独立的 streaming hooks，需单独重置

### Voice on Mobile

> See [Mobile Voice Debugging Skill](docs/skills/mobile-voice-debugging.md) for HTTPS setup and troubleshooting.

## Skills (Detailed Tool Guides)

以下技能模块包含详细操作指南，需要时按需加载：

| Skill                    | 路径                                                                               | 何时使用                                            |
| ------------------------ | ---------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Mobile Architecture**  | [docs/MOBILE_ARCHITECTURE_PLAN.md](docs/MOBILE_ARCHITECTURE_PLAN.md)               | **移动端开发** - 跨端复用架构与迁移计划             |
| Mobile Quick Reference   | [docs/MOBILE_QUICK_REFERENCE.md](docs/MOBILE_QUICK_REFERENCE.md)                   | **移动端开发** - 快速参考与代码模板                 |
| User Administration      | [docs/skills/user-administration.md](docs/skills/user-administration.md)           | **管理用户** - 创建、迁移数据、重置密码             |
| Database Management      | [docs/skills/database-management.md](docs/skills/database-management.md)           | **数据库维护** - Alembic 迁移命令                   |
| Dictionary Maintenance   | [docs/skills/dictionary-maintenance.md](docs/skills/dictionary-maintenance.md)     | **词典维护** - Parser Golden Standard 测试          |
| Mobile Voice Debugging   | [docs/skills/mobile-voice-debugging.md](docs/skills/mobile-voice-debugging.md)     | **移动端调试** - HTTPS 证书与远程调试               |
| Post-Change Verification | [docs/skills/post-change-verification.md](docs/skills/post-change-verification.md) | **代码变更后、通知用户前** - 自动验证变更是否有问题 |
| Local Deployment         | [docs/skills/local-deployment.md](docs/skills/local-deployment.md)                 | Docker 本地/内网部署                                |
| Voice Integrations       | [docs/skills/voice-integrations.md](docs/skills/voice-integrations.md)             | 调用 ElevenLabs/Deepgram/Gemini/Dashscope 语音 API  |
| AUI Streaming Protocol   | [docs/skills/aui-streaming-protocol.md](docs/skills/aui-streaming-protocol.md)     | 实现或调试 Agent 实时流式 UI 更新                   |
| Podcast Architecture     | [docs/skills/podcast-architecture.md](docs/skills/podcast-architecture.md)         | **Podcast 开发** - Apple API 策略与缓存机制         |
| SDK Debugging            | [docs/skills/sdk-debugging.md](docs/skills/sdk-debugging.md)                       | 第三方 SDK 调用失败的诊断方法                       |
| API Docs Query           | [docs/skills/api-docs-query.md](docs/skills/api-docs-query.md)                     | 查询 ElevenLabs/Deepgram 离线 API 文档              |

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
