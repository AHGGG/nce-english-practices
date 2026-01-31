# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

This is a comprehensive English learning platform combining:

1. **Tense Practice**: 16 tense variations with LLM generation
2. **Hybrid Dictionary**: MDX/MDD format with definitions, audio, images
3. **Scenario Roleplay**: Real-time AI chat for grammar practice
4. **Voice Practice**: Real-time voice using Gemini Native Audio API

**Stack**: FastAPI (Python) + React SPA (Vite) + React Native (Expo)

## Quick Start

```bash
# Install (Root)
pnpm install && uv sync

# Run Full Stack
pnpm turbo dev

# Run specific parts
pnpm turbo dev --filter=@nce/web      # Web only
pnpm turbo dev --filter=@nce/backend  # Backend only
```

## Architecture (Monorepo)

```
/
├── apps/web/           # React Vite App
├── apps/mobile/        # Expo React Native
├── apps/backend/       # Logical proxy for Python
├── packages/
│   ├── api/            # Shared API (Auth, Types, Client)
│   └── shared/         # Shared Hooks, Utils, Stores
└── app/                # Python Backend (FastAPI)
```

## Critical Patterns

### 1. Type Safety Contract

1. Update Pydantic models in `app/models/`
2. Run `pnpm turbo gen:types`
3. Frontend imports from `@nce/api/src/schema.d.ts`

### 2. Async Authentication (CRITICAL)

`AuthService` methods are **ASYNC**. Always `await` token retrieval:

```javascript
// BAD
const token = getAccessToken(); // "[object Promise]" -> 401

// GOOD
const token = await getAccessToken();
```

### 3. LLM Service Pattern

Use the `llm_service` singleton in `app/services/llm.py`:

- `llm_service.sync_client` for blocking operations
- `llm_service.async_client` for async endpoints
- `llm_service.voice_client` for Gemini Live API

### 4. Dictionary Service

- Source: `resources/dictionaries/` (recursive scan at startup)
- Assets: Rewritten to absolute `/dict-assets/{subdir}/...` paths
- No global `<base>` tag to prevent CSS/JS conflicts

## Shortcuts (Windows)

```powershell
./scripts/dev.ps1        # Start Server (HTTP)
./scripts/dev.ps1 -Https # Start Server (HTTPS)
./scripts/test.ps1       # Run All Tests
```

## Environment Setup

Create `.env` in project root:

```env
# LLM (Required)
DEEPSEEK_API_KEY=your_key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
MODEL_NAME=deepseek-chat

# Voice (Required)
GEMINI_API_KEY=your_key
DASHSCOPE_API_KEY=your_key

# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/nce_practice

# Auth
SECRET_KEY=your-32-byte-hex-secret-key
ALLOW_REGISTRATION=true
```

## Testing

```bash
uv run pytest tests -v
uv run pytest tests/test_voice_lab_integration.py -v
uv run pytest tests/test_deepgram_websocket.py -v
```

## Mobile Development

### Key Constraints (NativeWind v4)

- **Alpha syntax NOT supported**: Use inline `style={{ backgroundColor: "rgba(0,0,0,0.5)" }}`
- **Template strings fail**: Use `style={{ backgroundColor: "rgb(var(--color-accent-...))" }}`
- **Conditional className triggers warnings**: Use explicit styles or separate render logic
- **bg-inherit/bg-current are web-only**: Use explicit colors

### Shared State Persistence

Use `createJSONStorage(() => AsyncStorage)` adapter in `apps/mobile`.

## Skills (Detailed Guides)

> Load skills on-demand when working on specific features.

| Category      | Skill                | Path                                                                               | When to Use                 |
| ------------- | -------------------- | ---------------------------------------------------------------------------------- | --------------------------- |
| **Mobile**    | Mobile Architecture  | [docs/MOBILE_ARCHITECTURE_PLAN.md](docs/MOBILE_ARCHITECTURE_PLAN.md)               | Cross-platform architecture |
|               | Mobile Dev Pitfalls  | [docs/skills/mobile-dev-pitfalls.md](docs/skills/mobile-dev-pitfalls.md)           | NativeWind issues           |
|               | Mobile Quick Ref     | [docs/MOBILE_QUICK_REFERENCE.md](docs/MOBILE_QUICK_REFERENCE.md)                   | Code templates              |
| **Backend**   | Backend Architecture | [docs/skills/backend-architecture.md](docs/skills/backend-architecture.md)         | Service patterns            |
|               | Database Mgmt        | [docs/skills/database-management.md](docs/skills/database-management.md)           | Alembic migrations          |
|               | Dictionary Mgmt      | [docs/skills/dictionary-maintenance.md](docs/skills/dictionary-maintenance.md)     | Parser testing              |
| **Voice**     | Voice Integrations   | [docs/skills/voice-integrations.md](docs/skills/voice-integrations.md)             | TTS/STT/ASR APIs            |
|               | Mobile Voice Debug   | [docs/skills/mobile-voice-debugging.md](docs/skills/mobile-voice-debugging.md)     | HTTPS/troubleshooting       |
| **Ops**       | User Admin           | [docs/skills/user-administration.md](docs/skills/user-administration.md)           | User management             |
|               | Local Deployment     | [docs/skills/local-deployment.md](docs/skills/local-deployment.md)                 | Docker setup                |
|               | Post-Change Verify   | [docs/skills/post-change-verification.md](docs/skills/post-change-verification.md) | CI/CD checks                |
| **Protocols** | AUI Streaming        | [docs/skills/aui-streaming-protocol.md](docs/skills/aui-streaming-protocol.md)     | Agent UI updates            |
|               | Podcast Arch         | [docs/skills/podcast-architecture.md](docs/skills/podcast-architecture.md)         | RSS/Apple API               |
