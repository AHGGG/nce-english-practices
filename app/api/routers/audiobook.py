"""
Audiobook API Router.
Endpoints for browsing and streaming audiobooks with subtitle sync.
"""

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks, Depends
from fastapi.responses import FileResponse
from fastapi.concurrency import run_in_threadpool
from typing import List, Optional
from pydantic import BaseModel
import logging
from pathlib import Path

from app.api.deps.auth import get_current_user_id
from app.services.content_service import content_service
from app.services.content_providers.audiobook_provider import AudiobookProvider
from app.models.content_schemas import SourceType
from app.services.transcription import AudioInput, get_default_engine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/content/audiobook", tags=["audiobook"])


class TranscribeRequest(BaseModel):
    force: bool = False
    remote_url: Optional[str] = None
    api_key: Optional[str] = None


def get_audiobook_provider() -> AudiobookProvider:
    """Get the AudiobookProvider instance from content_service."""
    provider = content_service._providers.get(SourceType.AUDIOBOOK)
    if not isinstance(provider, AudiobookProvider):
        raise HTTPException(500, "AudiobookProvider not registered")
    return provider


@router.get("/")
async def list_audiobooks():
    """List all available audiobooks."""
    provider = get_audiobook_provider()
    return provider.list_audiobooks()


@router.get("/{book_id}")
async def get_audiobook(book_id: str, track: int = Query(0, ge=0)):
    """Get audiobook content with subtitle segments for a specific track."""
    try:
        bundle = await content_service.get_content(
            SourceType.AUDIOBOOK,
            book_id=book_id,
            track_index=track,
        )
        return bundle.model_dump()
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))


@router.get("/{book_id}/tracks")
async def get_tracks(book_id: str):
    """Get list of tracks for an audiobook."""
    provider = get_audiobook_provider()
    tracks = provider.get_tracks(book_id)
    if not tracks:
        raise HTTPException(404, f"Audiobook not found: {book_id}")
    return tracks


@router.get("/{book_id}/audio")
async def get_audio(book_id: str, track: int = Query(0, ge=0)):
    """Stream the audio file for a specific track."""
    provider = get_audiobook_provider()
    result = provider.get_audio_file(book_id, track)

    if not result:
        raise HTTPException(404, f"Audio not found: {book_id}")

    audio_path, mime_type = result
    return FileResponse(
        audio_path,
        media_type=mime_type,
        filename=audio_path.name,
    )


@router.head("/{book_id}/audio")
async def head_audio(book_id: str, track: int = Query(0, ge=0)):
    """HEAD request for audio file (for range request support)."""
    provider = get_audiobook_provider()
    result = provider.get_audio_file(book_id, track)

    if not result:
        raise HTTPException(404, f"Audio not found: {book_id}")

    audio_path, mime_type = result
    file_size = audio_path.stat().st_size

    return FileResponse(
        audio_path,
        media_type=mime_type,
        headers={
            "Content-Length": str(file_size),
            "Accept-Ranges": "bytes",
        },
    )


# --- Transcription Helper Functions ---


def _format_timestamp(seconds: float) -> str:
    """Convert seconds to SRT timestamp format (HH:MM:SS,mmm)."""
    whole_seconds = int(seconds)
    milliseconds = int((seconds - whole_seconds) * 1000)

    hours = whole_seconds // 3600
    minutes = (whole_seconds % 3600) // 60
    secs = whole_seconds % 60

    return f"{hours:02d}:{minutes:02d}:{secs:02d},{milliseconds:03d}"


def _segments_to_srt(segments: list) -> str:
    """Convert transcription segments to SRT format."""
    srt_parts = []
    for i, seg in enumerate(segments, 1):
        if isinstance(seg, dict):
            start = seg.get("start_time", 0.0)
            end = seg.get("end_time", 0.0)
            text = seg.get("text", "")
        else:
            start = seg.start_time
            end = seg.end_time
            text = seg.text

        srt_parts.append(f"{i}")
        srt_parts.append(f"{_format_timestamp(start)} --> {_format_timestamp(end)}")
        srt_parts.append(f"{text}\n")

    return "\n".join(srt_parts)


async def _run_audiobook_transcription(
    book_id: str,
    track_index: int,
    audio_path: Path,
    subtitle_path: Path,
    remote_url: Optional[str] = None,
    api_key: Optional[str] = None,
):
    """Background task to run transcription for an audiobook track."""
    logger.info(f"Starting audiobook transcription for {book_id} track {track_index}")

    try:
        # Run transcription in thread pool (CPU/GPU bound)
        def do_transcription():
            # Get engine (Local or Remote)
            engine = get_default_engine(remote_url=remote_url, api_key=api_key)

            # Load audio
            audio_input = AudioInput.from_file(audio_path)

            # Transcribe
            result = engine.transcribe(audio_input)
            return result

        result = await run_in_threadpool(do_transcription)

        logger.info(f"Transcription complete: {len(result.segments)} segments")

        # Convert to SRT format
        srt_content = _segments_to_srt(result.segments)

        # Write to file (blocking I/O in threadpool)
        def write_file():
            subtitle_path.write_text(srt_content, encoding="utf-8")

        await run_in_threadpool(write_file)

        logger.info(f"Saved subtitles to {subtitle_path}")

    except Exception as e:
        import traceback

        logger.error(
            f"Audiobook transcription failed for {book_id}: {e}\n{traceback.format_exc()}"
        )


@router.post("/{book_id}/transcribe")
async def transcribe_audiobook(
    book_id: str,
    background_tasks: BackgroundTasks,
    track: int = Query(0, ge=0),
    req: Optional[TranscribeRequest] = None,
    user_id: str = Depends(get_current_user_id),
):
    """
    Trigger AI transcription for an audiobook track.
    Generates an SRT subtitle file in the book's directory.
    """
    provider = get_audiobook_provider()

    # Get audio file path
    result = provider.get_audio_file(book_id, track)
    if not result:
        raise HTTPException(404, f"Audio track {track} not found for book: {book_id}")

    audio_path, _ = result

    # Determine subtitle path (same name as audio but with .srt extension)
    # Note: Audio path might be "chapter1.mp3", so we want "chapter1.srt"
    subtitle_path = audio_path.with_suffix(".srt")

    # Check if subtitle already exists
    should_force = req.force if req else False

    if subtitle_path.exists() and not should_force:
        raise HTTPException(
            status_code=409,
            detail="Subtitle file already exists. Use force=true to overwrite.",
        )

    # Parse options
    remote_url = req.remote_url if req else None
    api_key = req.api_key if req else None

    # Start background task
    background_tasks.add_task(
        _run_audiobook_transcription,
        book_id,
        track,
        audio_path,
        subtitle_path,
        remote_url,
        api_key,
    )

    return {
        "status": "pending",
        "message": "Transcription started in background",
        "audio_file": audio_path.name,
        "target_subtitle": subtitle_path.name,
    }
