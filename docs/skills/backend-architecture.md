# Backend Architecture

## App Structure (`app/`)

```
app/
├── main.py, config.py          # Entry & Config
├── core/db.py                  # SQLAlchemy async session
├── services/                   # Business Logic
│   ├── llm.py                  # DeepSeek + Gemini Client
│   ├── dictionary.py           # MDX/MDD Dictionary Manager
│   ├── auth.py                 # Authentication service
│   └── ...
├── api/routers/                # FastAPI Routers
└── models/                     # Pydantic & ORM Models
```

## Authentication System

Multi-user authentication with JWT tokens.

**Backend Components**:

- **Model**: `app/models/orm.py::User` - User accounts with email, password hash, roles
- **Schemas**: `app/models/auth_schemas.py` - Registration, login, token DTOs
- **Service**: `app/services/auth.py` - Password hashing, JWT creation/verification
- **Router**: `app/api/routers/auth.py` - REST API endpoints

**API Endpoints**:

| Endpoint                     | Method | Description                |
| ---------------------------- | ------ | -------------------------- |
| `/api/auth/register`         | POST   | Create new account         |
| `/api/auth/login`            | POST   | Login, returns JWT tokens  |
| `/api/auth/refresh`          | POST   | Refresh access token       |
| `/api/auth/logout`           | POST   | Clear refresh token cookie |
| `/api/auth/me`               | GET    | Get current user profile   |
| `/api/auth/change-password`  | POST   | Update password            |
| `/api/auth/admin/users`      | GET    | List users (admin only)    |
| `/api/auth/admin/users/{id}` | DELETE | Delete user (admin only)   |

## Voice Services

### TTS (Edge-TTS)

- **Library**: `edge-tts` (Official Microsoft Edge TTS API wrapper)
- **Voice**: `en-US-AndrewMultilingualNeural`
- **Flow**: Backend streams bytes -> Frontend plays Blob via Web Audio API

### Voice Lab (ElevenLabs + Deepgram)

**Endpoints**:

| Endpoint                  | Method    | Description                 |
| ------------------------- | --------- | --------------------------- |
| `/api/voice-lab/voices`   | GET       | List available voices       |
| `/api/voice-lab/generate` | POST      | Generate TTS audio          |
| `/api/voice-lab/stt`      | POST      | Transcribe audio (Deepgram) |
| `/api/voice-lab/stream`   | WebSocket | Real-time voice session     |

**Features**:

- **ElevenLabs**: TTS/STT/SFX/STS via `app/services/voice_lab.py`
- **Deepgram**: TTS/STT + WebSocket proxy via `app/api/routers/deepgram/`
- **Gemini**: Official SDK Live API
- **Dashscope**: Alibaba Cloud Qwen3-TTS/ASR

> See [Voice Integrations Skill](voice-integrations.md) for API details.

## Sentence Study Service

The core feature for learning English through sentences.

**Flow**:

1. **Overview**: Generate summary (LLM) for the article
2. **Iterate**: For each sentence:
   - User marks "Clear" or "Unclear"
   - "Unclear": LLM simplifies the sentence
   - User interacts with simplified version
3. **Progress**: Track completion status in database

**Key Files**:

- `app/services/sentence_study_service.py` - Core logic
- `app/api/routers/sentence_study.py` - REST API
- `app/api/routers/negotiation.py` - Sentence negotiation/simplification

**Database Tables**:

- `sentence_learning_records` - Per-sentence study data
- `reading_sessions` - Reading session tracking

## Content Service

Handles EPUB parsing and article retrieval.

**EPUB Provider** (`app/services/content_providers/epub_provider.py`):

- Parses EPUB files into structured articles
- Module-level caching (`_epub_cache`) for performance
- Block-based sentence extraction for consistent counting

**Key Methods**:

- `_load_epub(filename)` - Load and cache EPUB
- `_extract_structured_blocks(soup)` - Parse HTML into blocks
- `_split_sentences_lenient(text)` - Fallback sentence splitting

> See [Dictionary Maintenance Skill](dictionary-maintenance.md) for MDX/MDD parsing.

## LLM Service (`app/services/llm.py`)

Uses DeepSeek Chat for most tasks.

**Configuration**:

- `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, `MODEL_NAME`
- Fallback to OpenAI-compatible endpoints

**Usage**:

```python
from app.services.llm import llm_service

# Async (preferred)
response = await llm_service.async_client.chat.completions.create(
    messages=[{"role": "user", "content": "Hello"}],
    model="deepseek-chat"
)

# Sync (for short tasks)
response = llm_service.sync_client.chat.completions.create(
    messages=[{"role": "user", "content": "Hello"}],
    model="deepseek-chat"
)
```
