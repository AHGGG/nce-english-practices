# Transcription Service

This project supports a **Distributed Transcription Architecture** to allow low-power devices (like MacBooks or basic VPS) to offload heavy GPU-based transcription tasks (SenseVoice) to a dedicated high-performance server.

## Architecture

The system operates in two modes:

1.  **Local Mode (Default)**: Runs transcription on the same machine using the local GPU/CPU.
2.  **Remote Mode (Client-Server)**: Sends audio files to a remote instance for processing.

### Why Remote Mode?

- **Save Local Resources**: Running SenseVoice/FunASR locally requires significant RAM and GPU VRAM.
- **Battery Life**: Offloading to a desktop/server saves battery on laptops.
- **Centralized Compute**: One powerful server can transcribe for multiple client devices (mobile, laptop).

---

## Configuration

### 1. Server Configuration (The GPU Worker)

To set up an instance as a Transcription Server:

1.  **Install Full Dependencies**:
    You must install the `local-asr` optional dependencies to enable the local engine.

    ```bash
    uv sync --extra local-asr
    # or
    pip install ".[local-asr]"
    ```

2.  **Configure API Keys**:
    Set the `TRANSCRIPTION_SERVICE_API_KEYS` environment variable in your `.env` file. You can provide multiple keys separated by commas.

    ```env
    # .env
    TRANSCRIPTION_SERVICE_API_KEYS=client-laptop-key,client-mobile-key,admin-secret-123
    ```

3.  **Start the Server**:
    Run the application normally. It will listen on `POST /api/transcribe`.
    ```bash
    ./scripts/dev.ps1
    ```

### 2. Client Configuration (The User Interface)

To configure a client instance (e.g., your laptop) to use the remote server:

1.  **Install Lightweight Dependencies**:
    You do NOT need the heavy `local-asr` dependencies.

    ```bash
    uv sync
    # or
    pip install .
    ```

2.  **Configure in UI**:
    1.  Open the Web App.
    2.  Go to **Settings** -> **Transcription Service**.
    3.  Enable **"Remote Transcription"**.
    4.  **Server URL**: Enter the full URL to the transcription endpoint.
        - Example: `http://192.168.1.100:8000/api/transcribe`
        - Example (Public HTTPS): `https://my-gpu-server.com/api/transcribe`
    5.  **API Key**: Enter one of the keys you configured on the server (e.g., `client-laptop-key`).

---

## API Reference

### POST `/api/transcribe`

**Headers**:

- `x-api-key`: Required. Must match one of the keys in `TRANSCRIPTION_SERVICE_API_KEYS`.

**Body**:

- `file`: The audio file to transcribe (multipart/form-data).

**Response**:
Returns a JSON object matching the `TranscriptionResult` schema.

```json
{
  "full_text": "Hello world.",
  "duration": 1.5,
  "language": "en",
  "segments": [
    {
      "start_time": 0.0,
      "end_time": 1.5,
      "text": "Hello world."
    }
  ]
}
```
