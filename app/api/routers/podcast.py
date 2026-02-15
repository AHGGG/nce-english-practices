"""
Podcast API Router.

Split into focused route modules to keep this file as router composition only.
"""

from fastapi import APIRouter

from app.models.podcast_schemas import PositionSyncRequest

from .podcast_common import proxy_image as _proxy_image
from .podcast_common import sign_url, verify_signed_url
from .podcast_download_routes import (
    download_episode,
    download_episode_head,
    router as download_router,
)
from .podcast_feed_routes import router as feed_router
from .podcast_session_routes import router as session_router
from .podcast_transcription_routes import (
    _run_transcription,
    router as transcription_router,
)

router = APIRouter(prefix="/api/podcast", tags=["podcast"])
router.include_router(feed_router)
router.include_router(session_router)
router.include_router(download_router)
router.include_router(transcription_router)

__all__ = [
    "router",
    "_proxy_image",
    "sign_url",
    "verify_signed_url",
    "download_episode",
    "download_episode_head",
    "_run_transcription",
    "PositionSyncRequest",
]
