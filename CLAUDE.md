# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

This is a comprehensive English learning platform that combines:
1. **Tense Practice**: Interactive exercises across 16 tense variations using LLM generation.
2. **Hybrid Dictionary**: Multi-dictionary support (MDX format) with rich definitions, audio, and images.
3. **Scenario Roleplay**: Real-time AI chat for practicing specific grammar points in realistic contexts.
4. **Voice Practice**: Real-time voice conversation using Gemini Native Audio API.

The backend is built with **FastAPI** and the frontend uses standard HTML/JS with Jinja2 templates.

## Development Setup

```bash
# Install dependencies
uv sync

# Run the Web Application
uv run python -m app.main

# Or using uvicorn directly
uv run uvicorn app.main:app --reload

# For HTTPS (mobile voice requires HTTPS)
uv run python generate_cert.py  # Generate self-signed cert
uv run python -m app.main       # Auto-detects cert.pem/key.pem
```

## Testing

```bash
# Run Frontend E2E Tests (Playwright)
uv run pytest tests/e2e

# Run Backend Unit Tests (Run separately to avoid event loop conflicts)
uv run pytest tests/test_*.py

# Setup for E2E Tests (First time only)
uv run playwright install

# Run specific test file
uv run pytest tests/test_chat_db.py -v

# Run single test
uv run pytest tests/test_basics.py::test_theme_generation -v
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
```

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
- **`app/generators/`**: Content generation logic.
  - `theme.py`, `sentence.py`, `story.py`, `quiz.py`, `scenario.py`, `coach.py`
- **`app/models.py`**: Pydantic models for API requests/responses.
- **`app/db_models.py`**: SQLAlchemy ORM models.
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

All generators and routes use this service rather than creating clients directly.

### Dictionary Service

The application supports loading multiple MDX dictionaries simultaneously.
- **Source**: `resources/dictionaries/` (recursive scan at startup).
- **Backend**: `app.services.dictionary.dict_manager` loads MDX (definitions) and MDD (resources).
- **Asset Serving**:
  - Definitions are rewritten to use absolute proxy paths (`/dict-assets/{subdir}/...`) for CSS/JS.
  - Binary assets (images/audio) are served via `/dict-assets/{path}` tunnel.
  - Falls back to MDD cache if file not found on disk.

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
- This ensures vocabulary consistency across all practice modes.

### 2. Multi-Dictionary Isolation
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
- `static/` - Frontend assets (JS/CSS)
- `templates/` - Jinja2 HTML templates
- `resources/dictionaries/` - MDX/MDD dictionary files
- `alembic/` - Database migrations

**User Data**:
- `~/.english_tense_practice/` - Storage for cached themes (legacy file-based cache).
- **PostgreSQL**: Primary storage for sessions, stories, attempts, and chat history.

## Common Pitfalls

### Event Loop Conflicts
- **Problem**: Running E2E tests (Playwright) with backend tests causes `RuntimeError: Event loop is closed`.
- **Solution**: Run E2E tests separately: `pytest tests/e2e/` and `pytest tests/test_*.py`.

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
