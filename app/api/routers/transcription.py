"""
Transcription Service API Router.

Exposes an endpoint to accept transcription requests from remote clients.
This allows this instance to act as a GPU worker for other instances.
"""

import logging
from typing import Annotated, Optional

from fastapi import APIRouter, Header, HTTPException, UploadFile, File, Depends
from fastapi.concurrency import run_in_threadpool

from app.config import settings
from app.services.transcription import (
    AudioInput,
    TranscriptionResult,
    get_default_engine,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/transcribe", tags=["transcription"])


async def verify_api_key(x_api_key: Annotated[Optional[str], Header()] = None) -> str:
    """
    Verify the API key provided in the header.
    """
    allowed_keys = settings.TRANSCRIPTION_SERVICE_API_KEYS

    # If no keys configured, service is disabled (or open if we wanted, but safer to default closed)
    if not allowed_keys or (
        len(allowed_keys) == 1 and allowed_keys[0] == "change-me-to-a-secure-random-key"
    ):
        # Allow the default key only for dev convenience, but warn.
        # Better security: require user to change it.
        pass

    if not x_api_key:
        raise HTTPException(status_code=401, detail="Missing API Key")

    if x_api_key not in allowed_keys:
        raise HTTPException(status_code=403, detail="Invalid API Key")

    return x_api_key


@router.post("", response_model=None)
async def transcribe_audio(
    file: UploadFile = File(...),
    api_key: str = Depends(verify_api_key),
):
    """
    Accept an audio file and return transcription results.

    This endpoint is designed to be called by other instances of this application
    configured with RemoteTranscriptionEngine.
    """
    import tempfile
    import shutil
    from pathlib import Path

    # Create temp file
    temp_dir = Path(tempfile.mkdtemp(prefix="remote_transcribe_"))
    audio_path = temp_dir / file.filename

    try:
        # Save uploaded file
        with open(audio_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        logger.info(
            f"Received remote transcription request: {file.filename} (Key: {api_key[:4]}...)"
        )

        # Run transcription in thread pool (CPU/GPU bound)
        def do_transcription():
            # Force use of local engine (no remote_url)
            # This instance acts as the server
            engine = get_default_engine(remote_url=None)

            # Check availability
            if not engine.is_available():
                raise HTTPException(
                    status_code=503,
                    detail="Transcription service unavailable on this host (missing dependencies?)",
                )

            audio_input = AudioInput.from_file(audio_path)
            result = engine.transcribe(audio_input)
            return result.to_dict()

        result = await run_in_threadpool(do_transcription)
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Remote transcription failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Cleanup
        try:
            if audio_path.exists():
                audio_path.unlink()
            temp_dir.rmdir()
        except Exception:
            pass
