"""
Podcast API Router.
Endpoints for searching, subscribing, and managing podcasts.
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Request
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List, Optional

from app.api.routers.auth import get_current_user_id
from app.core.db import AsyncSessionLocal
from app.services.podcast_service import podcast_service

router = APIRouter(prefix="/api/podcast", tags=["podcast"])


# --- Pydantic Schemas ---


class ItunesSearchResult(BaseModel):
    itunes_id: Optional[int]
    title: str
    author: Optional[str]
    rss_url: Optional[str]
    artwork_url: Optional[str]
    genre: Optional[str]
    episode_count: Optional[int]


class SubscribeRequest(BaseModel):
    rss_url: str


class FeedResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    author: Optional[str]
    image_url: Optional[str]
    rss_url: str
    episode_count: Optional[int] = None

    class Config:
        from_attributes = True


class EpisodeResponse(BaseModel):
    id: int
    guid: str
    title: str
    description: Optional[str]
    audio_url: str
    duration_seconds: Optional[int]
    image_url: Optional[str]
    published_at: Optional[str]
    transcript_status: str
    # User state for resume playback
    current_position: float = 0.0
    is_finished: bool = False

    class Config:
        from_attributes = True


class FeedDetailResponse(BaseModel):
    feed: FeedResponse
    episodes: List[EpisodeResponse]


class ListeningSessionRequest(BaseModel):
    episode_id: int


class ListeningSessionUpdateRequest(BaseModel):
    session_id: int
    total_listened_seconds: int
    last_position_seconds: float


class OPMLImportResult(BaseModel):
    total: int
    imported: int
    skipped: int
    errors: List[dict]


# --- Endpoints ---


@router.get("/search")
async def search_podcasts(
    q: str,
    limit: int = 20,
    country: str = "US",
) -> List[ItunesSearchResult]:
    """Search podcasts via iTunes."""
    results = await podcast_service.search_itunes(q, limit=limit, country=country)
    return [ItunesSearchResult(**r) for r in results]


@router.post("/subscribe")
async def subscribe_to_podcast(
    req: SubscribeRequest,
    user_id: str = Depends(get_current_user_id),
) -> FeedResponse:
    """Subscribe to a podcast by RSS URL."""
    async with AsyncSessionLocal() as db:
        try:
            feed = await podcast_service.subscribe(db, user_id, req.rss_url)
            
            # Count episodes
            from sqlalchemy import select, func
            from app.models.podcast_orm import PodcastEpisode
            
            count_stmt = select(func.count(PodcastEpisode.id)).where(
                PodcastEpisode.feed_id == feed.id
            )
            count_result = await db.execute(count_stmt)
            episode_count = count_result.scalar_one()
            
            return FeedResponse(
                id=feed.id,
                title=feed.title,
                description=feed.description,
                author=feed.author,
                image_url=feed.image_url,
                rss_url=feed.rss_url,
                episode_count=episode_count,
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))


@router.delete("/feed/{feed_id}")
async def unsubscribe_from_podcast(
    feed_id: int,
    user_id: str = Depends(get_current_user_id),
):
    """Unsubscribe from a podcast."""
    async with AsyncSessionLocal() as db:
        success = await podcast_service.unsubscribe(db, user_id, feed_id)
        if not success:
            raise HTTPException(status_code=404, detail="Feed not found")
        return {"success": True}


@router.get("/feeds")
async def get_subscriptions(
    user_id: str = Depends(get_current_user_id),
) -> List[FeedResponse]:
    """Get all subscribed podcasts."""
    async with AsyncSessionLocal() as db:
        feeds = await podcast_service.get_subscriptions(db, user_id)
        
        # Get episode counts
        from sqlalchemy import select, func
        from app.models.podcast_orm import PodcastEpisode
        
        result = []
        for feed in feeds:
            count_stmt = select(func.count(PodcastEpisode.id)).where(
                PodcastEpisode.feed_id == feed.id
            )
            count_result = await db.execute(count_stmt)
            episode_count = count_result.scalar_one()
            
            result.append(FeedResponse(
                id=feed.id,
                title=feed.title,
                description=feed.description,
                author=feed.author,
                image_url=feed.image_url,
                rss_url=feed.rss_url,
                episode_count=episode_count,
            ))
        
        return result


@router.get("/feed/{feed_id}")
async def get_feed_detail(
    feed_id: int,
    user_id: str = Depends(get_current_user_id),
) -> FeedDetailResponse:
    """Get feed details with episodes (includes user state for resume)."""
    async with AsyncSessionLocal() as db:
        data = await podcast_service.get_feed_with_episodes(db, user_id, feed_id)
        if not data:
            raise HTTPException(status_code=404, detail="Feed not found")
        
        feed = data["feed"]
        episodes = data["episodes"]  # Now a list of dicts with user state
        
        return FeedDetailResponse(
            feed=FeedResponse(
                id=feed.id,
                title=feed.title,
                description=feed.description,
                author=feed.author,
                image_url=feed.image_url,
                rss_url=feed.rss_url,
                episode_count=len(episodes),
            ),
            episodes=[
                EpisodeResponse(
                    id=ep["id"],
                    guid=ep["guid"],
                    title=ep["title"],
                    description=ep["description"],
                    audio_url=ep["audio_url"],
                    duration_seconds=ep["duration_seconds"],
                    image_url=ep["image_url"],
                    published_at=ep["published_at"],
                    transcript_status=ep["transcript_status"],
                    current_position=ep["current_position"],
                    is_finished=ep["is_finished"],
                )
                for ep in episodes
            ],
        )


@router.post("/feed/{feed_id}/refresh")
async def refresh_feed(
    feed_id: int,
    user_id: str = Depends(get_current_user_id),
):
    """Refresh a feed to check for new episodes."""
    async with AsyncSessionLocal() as db:
        new_count = await podcast_service.refresh_feed(db, user_id, feed_id)
        return {"new_episodes": new_count}


# --- OPML ---


@router.post("/opml/import")
async def import_opml(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
) -> OPMLImportResult:
    """Import podcasts from OPML file."""
    content = await file.read()
    try:
        opml_text = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid file encoding")
    
    async with AsyncSessionLocal() as db:
        result = await podcast_service.import_opml(db, user_id, opml_text)
        return OPMLImportResult(**result)


@router.get("/opml/export")
async def export_opml(
    user_id: str = Depends(get_current_user_id),
):
    """Export subscriptions as OPML file."""
    async with AsyncSessionLocal() as db:
        opml_content = await podcast_service.export_opml(db, user_id)
        return Response(
            content=opml_content,
            media_type="application/xml",
            headers={
                "Content-Disposition": "attachment; filename=podcasts.opml"
            },
        )


# --- Listening Sessions ---


@router.post("/session/start")
async def start_session(
    req: ListeningSessionRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Start a listening session."""
    async with AsyncSessionLocal() as db:
        session = await podcast_service.start_listening_session(
            db, user_id, req.episode_id
        )
        return {
            "session_id": session.id,
            "started_at": session.started_at.isoformat(),
        }


@router.post("/session/update")
async def update_session(
    req: ListeningSessionUpdateRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Update listening progress."""
    async with AsyncSessionLocal() as db:
        session = await podcast_service.update_listening_session(
            db,
            req.session_id,
            req.total_listened_seconds,
            req.last_position_seconds,
        )
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"success": True}


@router.post("/session/update-beacon")
async def update_session_beacon(
    request: Request,
):
    """
    Update listening progress via navigator.sendBeacon.
    This endpoint accepts text/plain JSON from sendBeacon for reliable save on page unload.
    Note: No auth since sendBeacon can't set headers - we rely on session_id validation.
    """
    import json
    
    try:
        body = await request.body()
        data = json.loads(body.decode("utf-8"))
        
        session_id = data.get("session_id")
        listened_seconds = data.get("listened_seconds", 0)
        position_seconds = data.get("position_seconds", 0)
        
        if not session_id:
            return {"success": False, "error": "Missing session_id"}
        
        async with AsyncSessionLocal() as db:
            session = await podcast_service.update_listening_session(
                db,
                session_id,
                listened_seconds,
                position_seconds,
            )
            return {"success": session is not None}
    except Exception as e:
        # Don't raise, just return error - beacon responses are typically ignored
        return {"success": False, "error": str(e)}


@router.post("/session/end")
async def end_session(
    req: ListeningSessionUpdateRequest,
    user_id: str = Depends(get_current_user_id),
):
    """End a listening session."""
    async with AsyncSessionLocal() as db:
        session = await podcast_service.end_listening_session(
            db,
            req.session_id,
            req.total_listened_seconds,
            req.last_position_seconds,
        )
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"success": True}


@router.get("/episode/{episode_id}/position")
async def get_episode_position(
    episode_id: int,
    user_id: str = Depends(get_current_user_id),
):
    """Get last playback position for resume."""
    async with AsyncSessionLocal() as db:
        position = await podcast_service.get_last_position(db, user_id, episode_id)
        return {"position_seconds": position}


# --- Recently Played ---


@router.get("/recently-played")
async def get_recently_played(
    limit: int = 10,
    user_id: str = Depends(get_current_user_id),
):
    """Get recently played episodes with resume positions."""
    async with AsyncSessionLocal() as db:
        return await podcast_service.get_recently_played(db, user_id, limit=limit)


# --- Download ---


@router.get("/episode/{episode_id}/download")
async def download_episode(
    episode_id: int,
    user_id: str = Depends(get_current_user_id),
):
    """
    Proxy download for an episode audio file.
    Streams the audio through the server for offline storage.
    Includes Content-Length header for progress tracking.
    """
    import httpx
    from fastapi.responses import StreamingResponse
    from sqlalchemy import select
    from app.models.podcast_orm import PodcastEpisode
    
    async with AsyncSessionLocal() as db:
        stmt = select(PodcastEpisode).where(PodcastEpisode.id == episode_id)
        result = await db.execute(stmt)
        episode = result.scalar_one_or_none()
        
        if not episode:
            raise HTTPException(status_code=404, detail="Episode not found")
        
        audio_url = episode.audio_url
    
    # First, make a HEAD request to get content-length for progress tracking
    content_length = None
    final_url = audio_url
    
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            head_response = await client.head(audio_url)
            if head_response.status_code == 200:
                content_length = head_response.headers.get("content-length")
                # Get final URL after redirects
                final_url = str(head_response.url)
    except Exception:
        # HEAD failed, proceed without content-length
        pass
    
    # Stream the audio file (follow_redirects=True for CDN 302s)
    async def stream_audio():
        async with httpx.AsyncClient(timeout=None, follow_redirects=True) as client:
            async with client.stream("GET", final_url) as response:
                response.raise_for_status()
                async for chunk in response.aiter_bytes(chunk_size=65536):
                    yield chunk
    
    # Guess content type from URL
    content_type = "audio/mpeg"
    if audio_url.endswith(".m4a"):
        content_type = "audio/mp4"
    elif audio_url.endswith(".ogg"):
        content_type = "audio/ogg"
    elif audio_url.endswith(".wav"):
        content_type = "audio/wav"
    
    # Generate filename
    filename = f"episode_{episode_id}.mp3"
    
    # Build headers
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Access-Control-Expose-Headers": "Content-Length",  # Allow frontend to read
    }
    if content_length:
        headers["Content-Length"] = content_length
    
    return StreamingResponse(
        stream_audio(),
        media_type=content_type,
        headers=headers,
    )


