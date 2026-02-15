import asyncio
import logging
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user_id
from app.config import settings
from app.core.db import AsyncSessionLocal, get_db
from app.models.podcast_orm import PodcastEpisode
from app.models.podcast_schemas import TranscribeRequest, TranscribeResponse
from app.services.podcast_service import podcast_service
from app.services.transcription import AudioInput

from .podcast_common import BROWSER_USER_AGENT

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/episode/{episode_id}/transcribe", response_model=TranscribeResponse)
async def transcribe_episode(
    episode_id: int,
    req: Optional[TranscribeRequest] = None,
    force: bool = False,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    _ = user_id

    should_force = force
    remote_url = None
    api_key = None

    if req:
        should_force = req.force or force
        remote_url = req.remote_url
        api_key = req.api_key

    episode = await db.get(PodcastEpisode, episode_id)
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")

    if episode.transcript_status in ("processing", "pending") and not should_force:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Transcription already {episode.transcript_status}. "
                "Use force=true to restart."
            ),
        )

    if episode.transcript_status in ("processing", "pending") and should_force:
        logger.warning(
            "Force restarting transcription for episode %s (was %s)",
            episode_id,
            episode.transcript_status,
        )

    episode.transcript_status = "pending"
    await db.commit()

    asyncio.create_task(
        _run_transcription(episode_id, episode.audio_url, remote_url, api_key)
    )

    return TranscribeResponse(
        status="pending",
        message="Transcription started. Check episode status for progress.",
    )


async def _run_transcription(
    episode_id: int,
    audio_url: str,
    remote_url: Optional[str] = None,
    api_key: Optional[str] = None,
):
    import httpx
    from urllib.parse import urlparse

    logger.info("Starting transcription for episode %s", episode_id)

    try:
        async with AsyncSessionLocal() as db:
            await db.execute(
                update(PodcastEpisode)
                .where(PodcastEpisode.id == episode_id)
                .values(transcript_status="processing")
            )
            await db.commit()

        if remote_url:
            audio_input = AudioInput.from_url(audio_url)
            temp_dir = None
        else:
            temp_dir = Path(tempfile.mkdtemp(prefix="podcast_transcribe_"))
            parsed_url = urlparse(audio_url)
            original_ext = Path(parsed_url.path).suffix or ".mp3"
            audio_path = temp_dir / f"audio{original_ext}"

            proxies = settings.PROXY_URL if settings.PROXY_URL else None
            async with httpx.AsyncClient(
                timeout=300.0,
                follow_redirects=True,
                proxy=proxies,
                headers={"User-Agent": BROWSER_USER_AGENT},
            ) as client:
                response = await client.get(audio_url)
                response.raise_for_status()
                with open(audio_path, "wb") as file_obj:
                    file_obj.write(response.content)

            audio_input = AudioInput.from_file(audio_path)

        def do_transcription():
            from app.services.transcription import get_default_engine

            engine = get_default_engine(remote_url=remote_url, api_key=api_key)
            return engine.transcribe(audio_input)

        result = await run_in_threadpool(do_transcription)
        segments_data = [segment.to_dict() for segment in result.segments]

        async with AsyncSessionLocal() as db:
            await db.execute(
                update(PodcastEpisode)
                .where(PodcastEpisode.id == episode_id)
                .values(
                    transcript_status="completed",
                    transcript_text=result.full_text,
                    transcript_segments=segments_data,
                )
            )
            await db.commit()

        try:
            audio_input.cleanup()
            if temp_dir and temp_dir.exists():
                temp_dir.rmdir()
        except Exception as exc:
            logger.warning("Failed to cleanup temp files: %s", exc)

    except Exception as exc:
        import traceback

        logger.error(
            "Transcription failed for episode %s: %s\n%s",
            episode_id,
            exc,
            traceback.format_exc(),
        )
        try:
            async with AsyncSessionLocal() as db:
                await db.execute(
                    update(PodcastEpisode)
                    .where(PodcastEpisode.id == episode_id)
                    .values(transcript_status="failed")
                )
                await db.commit()
        except Exception as db_exc:
            logger.error("Failed to update status to failed: %s", db_exc)
