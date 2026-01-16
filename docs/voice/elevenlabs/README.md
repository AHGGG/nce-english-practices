# ElevenLabs API Documentation Index

This directory contains the scraped markdown documentation for the ElevenLabs API given that the official docs require a login or are an SPA.

## 🚀 Key Endpoints for NCE English Practices

### Text to Speech (TTS)
*   **[Convert Text to Audio](text-to-speech/convert.md)** (`POST /v1/text-to-speech/{voice_id}`)
    *   *The core function for generating audio from text.*
*   **[Convert with Timestamps](text-to-speech/convert-with-timestamps.md)**
    *   *Useful if we need word-level alignment for the UI.*

### Speech to Text (STT) - Scribe
*   **[Realtime WebSocket](speech-to-text/v-1-speech-to-text-realtime.md)** (`wss://api.elevenlabs.io/v1/speech-to-text/realtime`)
    *   *For the "Voice Conversation" mode. Handles bi-directional streaming.*
*   **[Transcribe File](speech-to-text/convert.md)**
    *   *For asynchronous transcription if we upload audio data.*

### Voices & Models
*   **[Get All Voices](voices/get.md)** (`GET /v1/voices`)
    *   *List available voices to populate the Voice Picker.*
*   **[Get Models](models/get.md)** (`GET /v1/models`)
    *   *List available models (e.g., `eleven_turbo_v2_5`, `eleven_multilingual_v2`).*

### Streaming
*   **[Streaming Guide](streaming.md)**
    *   *General concepts on latency optimization.*

## Verified SDK Usage (Python v3)

**TTS (Stream)**
```python
from elevenlabs import ElevenLabs

client = ElevenLabs(api_key="...")
audio_stream = client.text_to_speech.convert(
    voice_id="...",
    text="Hello",
    model_id="eleven_multilingual_v2",
    stream=True
)
# returns a generator
```

**STT (Realtime)**
See the [Deepgram/ElevenLabs unified implementation](../../app/services/voice_lab.py) or `realtime` docs.
