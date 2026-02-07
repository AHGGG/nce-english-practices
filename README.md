# NCE English Practice (Universal App)

An interactive English tense practice application powered by LLMs (DeepSeek/OpenAI).
Built with **FastAPI**, **React**, and **Monorepo Architecture** (Web + Mobile ready).

## Features

- **AI-Powered Vocabulary**: Generates context-aware vocabulary based on your chosen topic.
- **Tense Matrix**: Automatically generates sentences across 4 time layers and 4 aspects.
- **Interactive Practice**: Type your answers and get AI feedback.
- **Hybrid Dictionary**: MDX dictionary support with images and audio.
- **Voice Conversation**: Real-time voice practice with Gemini.
- **Remote Transcription**: Offload heavy AI transcription tasks to a dedicated GPU server.

## Setup & Run

The project uses `pnpm` workspaces and `Turborepo`.

1. **Install Dependencies**:

   ```bash
   # Standard install (lightweight, supports Remote Transcription client)
   pnpm install
   uv sync

   # Full install (includes local GPU transcription support)
   uv sync --extra local-asr
   ```

2. **Configuration**:

   Create a `.env` file in the root (see `.env.example` or CLAUDE.md).

3. **Run Full Stack**:

   ```bash
   pnpm turbo dev
   ```

   - Frontend: http://localhost:5173
   - Backend: http://localhost:8000

## Project Structure

- `apps/web`: React Frontend (Vite)
- `apps/backend`: Proxy for Python Backend
- `packages/shared`: Shared Business Logic & Hooks
- `packages/api`: Shared API Client & Auth
- `app/`: Python Backend Source Code
