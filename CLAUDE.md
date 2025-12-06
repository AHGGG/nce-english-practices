# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

This is a comprehensive English learning platform that combines:
1. **Tense Practice**: Interactive exercises across 16 tense variations using LLM generation.
2. **Hybrid Dictionary**: Multi-dictionary support (MDX format) with rich definitions, audio, and images.
3. **Scenario Roleplay**: Real-time AI chat for practicing specific grammar points in realistic contexts.

The backend is built with **FastAPI** and the frontend uses standard HTML/JS with Jinja2 templates.

## Development Setup

```bash
# Install dependencies
uv sync

# Run the Web Application
uv run python -m app.main

# Or using uvicorn directly
uv run uvicorn app.main:app --reload

# Legacy TUI (Deprecated)
uv run python legacy/tui_app.py
```

## Environment Configuration

Create a `.env` file in the project root:

```env
DEEPSEEK_API_KEY=your_key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
MODEL_NAME=deepseek-chat
```

## Architecture

### Package Structure (`app/`)

The project follows a modular package structure:

- **`app/main.py`**: Application entry point and API routes.
- **`app/core/`**: Core logic for practice grading and feedback.
- **`app/services/`**: Infrastructure services.
  - `dictionary.py`: MDX/MDD parsing and multi-dictionary management.
  - `chat.py`: LLM chat session management.
- **`app/generators/`**: Content generation logic.
  - `theme.py`, `sentence.py`, `story.py`, `quiz.py`, `scenario.py`
- **`app/models.py`**: Pydantic models and data structures.
- **`app/database.py`**: SQLite database interface for history and analytics.

### Dictionary Service

The application supports loading multiple MDX dictionaries simultaneously.
- **Source**: `resources/dictionaries/` (recursive scan).
- **Backend**: `app.services.dictionary` loads MDX (definitions) and MDD (resources) into memory/cache.
- **Asset Serving**: 
  - Definitions are rewritten to use absolute proxy paths (`/dict-assets/{subdir}/...`) for CSS/JS.
  - Binary assets (images/audio) are served via `/dict/resource` tunnel.

## Key Design Patterns

### 1. Two-Stage LLM Generation
- **Stage 1 (Theme)**: Generate vocabulary slots first.
- **Stage 2 (Content)**: Generate sentences/stories using *only* the specific vocabulary from Stage 1.

### 2. Multi-Dictionary Isolation
To support multiple dictionaries (e.g., Collins + LDOCE) in one view:
- **No Global Base URL**: We do *not* use `<base>` tags in the frontend.
- **Path Rewriting**: The backend rewrites all relative asset links in the HTML execution time to point to their specific dictionary subdirectory.

## File Locations

**Source Code**:
- `app/` - Main application package
- `static/` - Frontend assets (JS/CSS)
- `templates/` - Jinja2 HTML templates
- `resources/dictionaries/` - MDX/MDD dictionary files
- `legacy/` - Deprecated scripts (`tui_app.py`, etc.)

**User Data**:
- `~/.english_tense_practice/` - Storage for cached themes, sentences, and the SQLite database (`practice.db`).
