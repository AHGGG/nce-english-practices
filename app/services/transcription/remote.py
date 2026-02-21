"""
Remote transcription engine implementation.

Delegates transcription to a remote server via HTTP API.
Useful for offloading heavy GPU processing to a dedicated worker.
"""

import logging
import time
import httpx
from typing import Optional
from pathlib import Path
from urllib.parse import urlparse

from .base import BaseTranscriptionEngine, TranscriptionError
from .schemas import AudioInput, TranscriptionResult

logger = logging.getLogger(__name__)


class RemoteTranscriptionEngine(BaseTranscriptionEngine):
    """
    Remote HTTP-based transcription engine.

    Sends audio file to a remote server and parses the JSON response.
    Expected Remote API:
    - POST /transcribe (or the configured URL)
    - Body: multipart/form-data with 'file' or 'audio_url' field
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
        self._poll_interval_seconds = 3.0
        self._max_wait_seconds = 3600.0

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
        source_url = audio.source_url
        if source_url:
            logger.info(
                "Sending audio URL to remote engine: %s (%s)",
                self.remote_url,
                source_url,
            )
        else:
            audio_path = audio.to_local_path()
            logger.info(
                "Sending audio file to remote engine: %s (%s)",
                self.remote_url,
                audio_path,
            )

        try:
            headers = {}
            if self.api_key:
                headers["x-api-key"] = self.api_key

            parsed = urlparse(self.remote_url)
            is_local_remote = (parsed.hostname or "").lower() in {
                "localhost",
                "127.0.0.1",
                "::1",
            }

            with httpx.Client(timeout=60.0, trust_env=not is_local_remote) as client:
                if source_url:
                    return self._transcribe_via_async_job(
                        client,
                        headers,
                        payload={"audio_url": source_url},
                    )

                audio_path = audio.to_local_path()
                with open(audio_path, "rb") as f:
                    files = {"file": (audio_path.name, f, "audio/mpeg")}
                    return self._transcribe_via_async_job(
                        client,
                        headers,
                        files=files,
                    )

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

    def _transcribe_via_async_job(
        self,
        client: httpx.Client,
        headers: dict[str, str],
        files: Optional[dict] = None,
        payload: Optional[dict[str, str]] = None,
    ) -> TranscriptionResult:
        """
        Prefer async job endpoints to avoid long-lived HTTP connections.

        Falls back to legacy sync endpoint for backward compatibility.
        """
        base_url = self.remote_url.rstrip("/")
        submit_url = f"{base_url}/jobs"

        if payload:
            submit_response = client.post(submit_url, data=payload, headers=headers)
        else:
            submit_response = client.post(submit_url, files=files, headers=headers)

        # Backward compatibility: old workers only expose POST /api/transcribe.
        if submit_response.status_code in (404, 405):
            if payload:
                legacy_response = client.post(
                    self.remote_url,
                    data=payload,
                    headers=headers,
                )
            else:
                file_tuple = files.get("file") if files else None
                if isinstance(file_tuple, tuple) and len(file_tuple) > 1:
                    try:
                        file_tuple[1].seek(0)
                    except Exception:
                        pass
                legacy_response = client.post(
                    self.remote_url,
                    files=files,
                    headers=headers,
                )
            if legacy_response.status_code != 200:
                raise TranscriptionError(
                    f"Remote server returned {legacy_response.status_code}: {legacy_response.text}",
                    engine=self.name,
                )
            return TranscriptionResult.from_dict(legacy_response.json())

        if submit_response.status_code != 200:
            raise TranscriptionError(
                f"Remote server returned {submit_response.status_code}: {submit_response.text}",
                engine=self.name,
            )

        submit_data = submit_response.json()
        job_id = submit_data.get("job_id")
        if not job_id:
            raise TranscriptionError(
                "Remote async job response missing job_id",
                engine=self.name,
            )

        deadline = time.monotonic() + self._max_wait_seconds
        status_url = f"{submit_url}/{job_id}"

        while time.monotonic() < deadline:
            poll_response = client.get(status_url, headers=headers)
            if poll_response.status_code != 200:
                raise TranscriptionError(
                    f"Remote job poll failed ({poll_response.status_code}): {poll_response.text}",
                    engine=self.name,
                )

            poll_data = poll_response.json()
            status = poll_data.get("status")

            if status == "completed":
                result_payload = poll_data.get("result") or poll_data
                return TranscriptionResult.from_dict(result_payload)

            if status == "failed":
                raise TranscriptionError(
                    f"Remote job failed: {poll_data.get('error', 'unknown error')}",
                    engine=self.name,
                )

            time.sleep(self._poll_interval_seconds)

        raise TranscriptionError(
            f"Remote job timed out after {int(self._max_wait_seconds)}s",
            engine=self.name,
        )

    def is_available(self) -> bool:
        """
        Check if remote server is reachable.
        """
        try:
            return bool(self.remote_url)
        except Exception:
            return False
