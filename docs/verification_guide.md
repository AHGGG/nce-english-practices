# Voice Verification Guide

This guide explains how to run the automated verification suite for Voice Features (TTS, STT, Realtime).

## Prerequisites

1. **Environment Variables**: Ensure your `.env` file contains valid API keys for:
   - `GEMINI_API_KEY` (Required for Realtime & Google Voice)
   - `AZURE_SPEECH_KEY` & `AZURE_SPEECH_REGION` (Optional)
   - `DEEPGRAM_API_KEY` (Optional)
   - `ELEVENLABS_API_KEY` (Optional)

2. **Runtests**:
   The verification tests are located in `tests/verification/`.

## Running the Verification Suite

Run the following command in your terminal:

```bash
uv run pytest tests/verification/ -v --capture=no
```

### What happens?

1. **Utils**: The test suite checks for `tests/verification/reference.wav`. If missing, it attempts to generate it using one of the available TTS providers (Bootstrap).
2. **TTS Verification**: It calls the `tts` method for every configured provider in `VoiceLab` and checks if valid audio headers/bytes are returned.
3. **STT Verification**: It sends the `reference.wav` to every STT provider and checks if the transcription matches the expected text ("This is a verification test").
4. **Realtime Verification**: It connects to the `/ws/voice` WebSocket, performs the handshake, sends the audio file, and waits for a valid response (Transcript or Audio) from the Gemini Live API.

## Troubleshooting

- **"Could not generate reference audio"**: Ensure at least one TTS provider (Google or Azure) is correctly configured in `.env`.
- **403/401 Errors**: Check your API keys.
- **WebSocket Timeout**: The Gemini Live API might be busy or the network connection is checking. Retry.

## Cost Warning

Running these tests **consumes real API credits**. Run them only when necessary to verify integration health, not on every commit.
