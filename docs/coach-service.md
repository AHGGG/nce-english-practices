# Coach Service (Agentic)

## Overview

Central orchestrator for the "Neural Link" mode. A tool-using agent that decides which UI component to show based on user context.

## Pattern

Tool-Using Agent. The LLM decides which UI component to show (Vocab, Story, Drill) by calling tools.

## Key Components

- **DSML Parser**: Handles DeepSeek's custom XML-style tool calls (`<｜DSML｜invoke>`)
- **Service**: `app/services/coach_service.py`

## Data Flow

```
User Input → LLM → Tool Call → Backend Execution (e.g., Generate Story)
→ Result Re-injection → Final Response → Frontend Render
```

## Voice Integration

### Endpoint

`/ws/voice` (requires HTTPS on mobile browsers)

### Protocol

1. Client connects and sends config (voice name, system instruction)
2. Server connects to Gemini Live API
3. Bidirectional streaming: Client sends PCM audio, server streams back audio + transcriptions

### Transcriptions

Both user input and AI output are transcribed and sent separately as JSON messages.

## Related Documentation

- [AUI Streaming Protocol Skill](docs/skills/aui-streaming-protocol.md) - Real-time Agent-to-UI streaming
