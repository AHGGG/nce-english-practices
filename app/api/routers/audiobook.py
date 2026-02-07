"""
Audiobook API Router.
Endpoints for browsing and streaming audiobooks with subtitle sync.
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from typing import List

from app.services.content_service import content_service
from app.services.content_providers.audiobook_provider import AudiobookProvider
from app.models.content_schemas import SourceType

router = APIRouter(prefix="/api/content/audiobook", tags=["audiobook"])


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
