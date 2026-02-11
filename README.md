# NCE English Practice

Full-stack English learning platform focused on reading, listening, and voice training.

## Core Features

| Module                      | Description                                                           |
| --------------------------- | --------------------------------------------------------------------- |
| **Dictionary**              | Collins COBUILD / LDOCE6++ MDX dictionaries with structured parsing   |
| **Podcast**                 | RSS subscriptions, AI transcription, timeline subtitle playback       |
| **Voice Lab**               | Real-time voice conversation (Deepgram STT + Gemini TTS)              |
| **Sentence Study**          | Contextual sentence analysis and practice                             |
| **Proficiency Calibration** | LLM-generated calibration sentences for vocabulary/grammar assessment |
| **Review System**           | SM-2 spaced repetition algorithm powered review queue                 |
| **Agent Mode**              | Context-aware AI coach with tool calling support                      |
| **Audiobook**               | Subtitle-synced local audiobook playback                              |

## Tech Stack

**Backend**

- FastAPI + SQLAlchemy 2.0 (async)
- PostgreSQL + Alembic migrations
- LLM: DeepSeek + Gemini Native Audio

**Frontend**

- React 19 + Vite (Web)
- React Native + Expo (Mobile)
- Zustand state management + TanStack Query

**Architecture**

- Monorepo: pnpm workspaces + Turborepo
- Shared: API client, Hooks, Design Tokens

## Quick Start

```bash
# Install dependencies
pnpm install
uv sync

# Configure environment
cp .env.example .env

# Run full stack
pnpm turbo dev

# Web: http://localhost:5173
# API: http://localhost:8000
```

## Project Structure

```
├── apps/
│   ├── web/           # React Vite frontend
│   ├── mobile/        # Expo mobile app
│   └── backend/       # Proxy configuration
├── packages/
│   ├── api/           # Shared API client
│   ├── shared/        # Shared hooks/utils
│   ├── store/         # Zustand store
│   └── ui-tokens/     # Design tokens
├── app/               # Python backend
│   ├── api/routers/   # FastAPI routes
│   ├── services/      # Business logic
│   └── models/        # ORM/Pydantic models
├── resources/         # Dictionary/audio resources
├── docs/skills/       # Detailed development guides
└── tests/             # Test suite
```

## Development Commands

```bash
pnpm turbo dev          # Full stack development
pnpm turbo lint         # Lint code
uv run pytest tests -v  # Run tests
```

## Documentation

- [CLAUDE.md](CLAUDE.md) - AI assistant development guide
- [AGENTS.md](AGENTS.md) - Agent system documentation
- `docs/skills/` - Detailed module documentation
