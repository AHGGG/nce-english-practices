"""
Remote transcription engine implementation.

Delegates transcription to a remote server via HTTP API.
Useful for offloading heavy GPU processing to a dedicated worker.
"""

import logging
import httpx
from typing import Optional
from pathlib import Path

from .base import BaseTranscriptionEngine, TranscriptionError
from .schemas import AudioInput, TranscriptionResult

logger = logging.getLogger(__name__)


class RemoteTranscriptionEngine(BaseTranscriptionEngine):
    """
    Remote HTTP-based transcription engine.

    Sends audio file to a remote server and parses the JSON response.
    Expected Remote API:
    - POST /transcribe (or the configured URL)
    - Body: multipart/form-data with 'file' field
    - Response: JSON matching TranscriptionResult.to_dict() structure
    """

    def __init__(self, remote_url: str, api_key: Optional[str] = None):
        """
        Initialize remote engine.

        Args:
            remote_url: Full URL of the transcription endpoint (e.g., "http://gpu-server:8000/transcribe")
            api_key: Optional API key for authentication (sent as x-api-key header)
        """
        self.remote_url = remote_url
        self.api_key = api_key

    @property
    def name(self) -> str:
        return f"remote-http[{self.remote_url}]"

    def transcribe(self, audio: AudioInput) -> TranscriptionResult:
        """
        Transcribe audio by sending to remote server.

        Args:
            audio: AudioInput instance

        Returns:
            TranscriptionResult from remote server
        """
        audio_path = audio.to_local_path()
        logger.info(f"Sending audio to remote engine: {self.remote_url} ({audio_path})")

        try:
            # Prepare file for upload
            # We use a synchronous request here because transcribe() is often run in a threadpool
            # by the caller (podcast.py _run_transcription uses run_in_threadpool).
            # However, httpx.Client is sync, so it blocks the thread (which is fine in threadpool).

            headers = {}
            if self.api_key:
                headers["x-api-key"] = self.api_key

            with open(audio_path, "rb") as f:
                files = {"file": (audio_path.name, f, "audio/mpeg")}

                # Use a long timeout for transcription (10 minutes)
                with httpx.Client(timeout=600.0) as client:
                    response = client.post(
                        self.remote_url, files=files, headers=headers
                    )

                    if response.status_code != 200:
                        raise TranscriptionError(
                            f"Remote server returned {response.status_code}: {response.text}",
                            engine=self.name,
                        )

                    data = response.json()
                    return TranscriptionResult.from_dict(data)

        except httpx.RequestError as e:
            raise TranscriptionError(
                f"Network error connecting to remote server: {e}",
                engine=self.name,
                cause=e,
            )
        except Exception as e:
            raise TranscriptionError(
                f"Remote transcription failed: {e}", engine=self.name, cause=e
            )

    def is_available(self) -> bool:
        """
        Check if remote server is reachable.
        """
        try:
            return bool(self.remote_url)
        except Exception:
            return False
