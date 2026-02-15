"""
Transcription Service API Router.

Exposes endpoints to accept transcription requests from remote clients.
This instance can act as a GPU worker for other instances.
"""

import asyncio
import logging
import shutil
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated, Any, Optional
from uuid import uuid4

from fastapi import (
    APIRouter,
    Header,
    HTTPException,
    UploadFile,
    File,
    Depends,
    Form,
)
from fastapi.concurrency import run_in_threadpool

from app.config import settings
from app.services.transcription import (
    AudioInput,
    get_default_engine,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/transcribe", tags=["transcription"])

# Keep finished jobs for a limited time for client polling.
JOB_TTL = timedelta(hours=6)


class _JobStatus:
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


_jobs: dict[str, dict[str, Any]] = {}
_jobs_lock = asyncio.Lock()


async def _cleanup_expired_jobs() -> None:
    cutoff = datetime.now(timezone.utc) - JOB_TTL
    async with _jobs_lock:
        expired_job_ids: list[str] = []
        for job_id, payload in _jobs.items():
            timestamp = payload.get("updated_at", payload.get("created_at"))
            if not isinstance(timestamp, datetime):
                continue
            if timestamp < cutoff:
                expired_job_ids.append(job_id)
        for job_id in expired_job_ids:
            _jobs.pop(job_id, None)


async def _set_job_state(job_id: str, **updates: Any) -> None:
    async with _jobs_lock:
        if job_id not in _jobs:
            return
        _jobs[job_id].update(updates)
        _jobs[job_id]["updated_at"] = datetime.now(timezone.utc)


async def _run_job(job_id: str, audio_input: AudioInput) -> None:
    await _set_job_state(job_id, status=_JobStatus.PROCESSING)

    try:

        def do_transcription():
            # Force use of local engine (no remote_url).
            engine = get_default_engine(remote_url=None)

            if not engine.is_available():
                raise RuntimeError(
                    "Transcription service unavailable on this host (missing dependencies?)"
                )

            result = engine.transcribe(audio_input)
            return result.to_dict()

        result = await run_in_threadpool(do_transcription)
        await _set_job_state(
            job_id, status=_JobStatus.COMPLETED, result=result, error=None
        )
    except Exception as e:
        logger.error("Remote transcription job failed (%s): %s", job_id, e)
        await _set_job_state(
            job_id,
            status=_JobStatus.FAILED,
            result=None,
            error=str(e),
        )
    finally:
        audio_input.cleanup()


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
    file: UploadFile | None = File(None),
    audio_url: Annotated[Optional[str], Form()] = None,
    api_key: str = Depends(verify_api_key),
):
    """
    Accept an audio file and return transcription results.

    This endpoint is designed to be called by other instances of this application
    configured with RemoteTranscriptionEngine.
    """
    requested_audio_url = audio_url

    if file and requested_audio_url:
        raise HTTPException(
            status_code=400,
            detail="Provide exactly one input: file or audio_url",
        )
    if not file and not requested_audio_url:
        raise HTTPException(
            status_code=400,
            detail="Missing input. Provide file (multipart) or audio_url",
        )

    source_label = "audio_url"
    if file:
        temp_dir = Path(tempfile.mkdtemp(prefix="remote_transcribe_"))
        safe_name = Path(file.filename or "audio.bin").name
        audio_path = temp_dir / safe_name

        try:
            with open(audio_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            audio_input = AudioInput(_local_path=audio_path, _is_temp=True)
            source_label = safe_name
        except Exception:
            try:
                if audio_path.exists():
                    audio_path.unlink()
                temp_dir.rmdir()
            except Exception:
                pass
            raise HTTPException(status_code=500, detail="Failed to save uploaded audio")
    else:
        try:
            source_audio_url = requested_audio_url
            if source_audio_url is None:
                raise ValueError("Missing audio_url")
            audio_input = AudioInput.from_url(source_audio_url)
            source_label = source_audio_url
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    try:
        logger.info(
            "Received remote transcription request: %s (Key: %s...)",
            source_label,
            api_key[:4],
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
        audio_input.cleanup()


@router.post("/jobs", response_model=None)
async def submit_transcription_job(
    file: UploadFile | None = File(None),
    audio_url: Annotated[Optional[str], Form()] = None,
    api_key: str = Depends(verify_api_key),
):
    """
    Submit an async transcription job.

    Returns quickly with a job_id. Clients should poll GET /api/transcribe/jobs/{job_id}.
    """
    await _cleanup_expired_jobs()

    requested_audio_url = audio_url

    if file and requested_audio_url:
        raise HTTPException(
            status_code=400,
            detail="Provide exactly one input: file or audio_url",
        )
    if not file and not requested_audio_url:
        raise HTTPException(
            status_code=400,
            detail="Missing input. Provide file (multipart) or audio_url",
        )

    source_label = "audio_url"
    if file:
        temp_dir = Path(tempfile.mkdtemp(prefix="remote_transcribe_job_"))
        safe_name = Path(file.filename or "audio.bin").name
        audio_path = temp_dir / safe_name
        try:
            with open(audio_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            audio_input = AudioInput(_local_path=audio_path, _is_temp=True)
            source_label = safe_name
        except Exception:
            try:
                if audio_path.exists():
                    audio_path.unlink()
                temp_dir.rmdir()
            except Exception:
                pass
            raise HTTPException(status_code=500, detail="Failed to save uploaded audio")
    else:
        try:
            source_audio_url = requested_audio_url
            if source_audio_url is None:
                raise ValueError("Missing audio_url")
            audio_input = AudioInput.from_url(source_audio_url)
            source_label = source_audio_url
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    job_id = uuid4().hex
    now = datetime.now(timezone.utc)

    async with _jobs_lock:
        _jobs[job_id] = {
            "job_id": job_id,
            "status": _JobStatus.PENDING,
            "result": None,
            "error": None,
            "created_at": now,
            "updated_at": now,
        }

    logger.info(
        "Accepted async transcription job %s: %s (Key: %s...)",
        job_id,
        source_label,
        api_key[:4],
    )
    asyncio.create_task(_run_job(job_id, audio_input))

    return {"job_id": job_id, "status": _JobStatus.PENDING}


@router.get("/jobs/{job_id}", response_model=None)
async def get_transcription_job_status(
    job_id: str,
    api_key: str = Depends(verify_api_key),
):
    """
    Poll an async transcription job status.

    Returns one of: pending, processing, completed, failed.
    """
    del api_key  # Auth is enforced by dependency.
    await _cleanup_expired_jobs()

    async with _jobs_lock:
        payload = _jobs.get(job_id)

    if not payload:
        raise HTTPException(status_code=404, detail="Job not found")

    response = {
        "job_id": payload["job_id"],
        "status": payload["status"],
    }

    if payload["status"] == _JobStatus.COMPLETED:
        response["result"] = payload["result"]
    elif payload["status"] == _JobStatus.FAILED:
        response["error"] = payload["error"] or "Transcription failed"

    return response
