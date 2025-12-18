# Deepgram API Documentation Index

This directory contains the scraped markdown documentation for the Deepgram API.

## 🚀 Key Endpoints for NCE English Practices

### Text to Speech (TTS) - "Speak"
*   **[Stream Text to Audio](reference-text-to-speech-speak-streaming.md)** (`wss://api.deepgram.com/v1/speak`)
    *   *Realtime TTS via WebSocket. This is the primary method for low-latency voice bots.*
*   **[REST Text to Audio](reference-text-to-speech-speak-request.md)** (`POST /v1/speak`)
    *   *Standard HTTP endpoint for generating audio files.*

### Speech to Text (STT) - "Listen"
*   **[Realtime Transcription](reference-speech-to-text-listen-streaming.md)** (`wss://api.deepgram.com/v1/listen`)
    *   *Realtime STT via WebSocket. Used for the user's voice input.*
*   **[Pre-recorded Audio](reference-speech-to-text-listen-pre-recorded.md)** (`POST /v1/listen`)
    *   *For transcribing uploaded files or buffers.*

### Managing Models (Voices)
*   **[List Models](reference-manage-models-list.md)** (`GET /v1/models`)
    *   *Retrieve available models, including **Aura** voices (TTS) and **Nova** models (STT).*

## Verified SDK Usage (Python v3)

*Note: Deepgram SDK v3 uses a unified client structure.*

**TTS (Stream)**
```python
from deepgram import DeepgramClient, SpeakOptions

deepgram = DeepgramClient("API_KEY")

options = SpeakOptions(
    model="aura-asteria-en",
    encoding="linear16",
    sample_rate=24000
)

# Returns a generator if configured for streaming, or bytes
response = deepgram.speak.v("1").stream(
    {"text": "Hello world"},
    options
)
```

**STT (Realtime)**
```python
# See app/services/voice_lab.py for full implementation
options = LiveOptions(
    model="nova-2",
    language="en-US",
    smart_format=True
)
dg_connection = deepgram.listen.live.v("1")
dg_connection.start(options)
```
