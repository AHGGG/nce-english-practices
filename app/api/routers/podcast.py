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
    is_finished: bool = False


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
            feed, is_new = await podcast_service.subscribe(db, user_id, req.rss_url)

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

            result.append(
                FeedResponse(
                    id=feed.id,
                    title=feed.title,
                    description=feed.description,
                    author=feed.author,
                    image_url=feed.image_url,
                    rss_url=feed.rss_url,
                    episode_count=episode_count,
                )
            )

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


@router.post("/opml/import/stream")
async def import_opml_streaming(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    """
    Import podcasts from OPML file with SSE streaming progress.

    Yields JSON events:
    - {"type": "start", "total": N} - Import started with N feeds
    - {"type": "progress", "current": i, "total": N, "title": "...", "rss_url": "..."} - Processing feed i
    - {"type": "result", "success": true/false, "title": "...", "error": "...", "status": "imported|skipped"} - Feed result
    - {"type": "complete", "imported": X, "skipped": Y, "total": N} - Import complete
    """
    from fastapi.responses import StreamingResponse
    import json

    content = await file.read()
    try:
        opml_text = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid file encoding")

    # Parse OPML to get feeds list
    feeds = podcast_service.parse_opml(opml_text)

    import asyncio  # Needed for wait_for

    async def event_generator():
        """Generate SSE events for import progress."""
        # Start event
        yield f"data: {json.dumps({'type': 'start', 'total': len(feeds)})}\n\n"

        imported = 0
        skipped = 0

        async with AsyncSessionLocal() as db:
            for i, feed_info in enumerate(feeds):
                title = feed_info.get("title", "Unknown")
                rss_url = feed_info.get("rss_url", "")

                # Progress event
                yield f"data: {json.dumps({'type': 'progress', 'current': i + 1, 'total': len(feeds), 'title': title, 'rss_url': rss_url})}\n\n"

                try:
                    # Run subscription with heartbeat to keep Nginx connection alive
                    # If it takes long, we send ": keep-alive" comments
                    task = asyncio.create_task(
                        podcast_service.subscribe(db, user_id, rss_url)
                    )

                    while not task.done():
                        done, _ = await asyncio.wait([task], timeout=2.0)
                        if not done:
                            yield ": keep-alive\n\n"

                    # Get result (or raise exception)
                    feed, is_new = task.result()

                    if is_new:
                        imported += 1
                        yield f"data: {json.dumps({'type': 'result', 'success': True, 'title': title, 'status': 'imported'})}\n\n"
                    else:
                        skipped += 1
                        yield f"data: {json.dumps({'type': 'result', 'success': True, 'title': title, 'status': 'skipped'})}\n\n"
                except Exception as e:
                    skipped += 1
                    yield f"data: {json.dumps({'type': 'result', 'success': False, 'title': title, 'error': str(e), 'rss_url': rss_url})}\n\n"

        # Complete event
        yield f"data: {json.dumps({'type': 'complete', 'imported': imported, 'skipped': skipped, 'total': len(feeds)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )


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
            headers={"Content-Disposition": "attachment; filename=podcasts.opml"},
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
            req.is_finished,
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
                # Beacon updates are rarely "finished" updates, but we could support it if needed.
                # Default to False for beacon.
                False,
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
            req.is_finished,
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


@router.head("/episode/{episode_id}/download")
async def download_episode_head(
    episode_id: int,
    user_id: str = Depends(get_current_user_id),
):
    """
    HEAD request to get Content-Length for progress tracking.
    Returns headers only, no body.
    """
    import httpx
    from fastapi.responses import Response
    from sqlalchemy import select
    from app.models.podcast_orm import PodcastEpisode

    async with AsyncSessionLocal() as db:
        stmt = select(PodcastEpisode).where(PodcastEpisode.id == episode_id)
        result = await db.execute(stmt)
        episode = result.scalar_one_or_none()

        if not episode:
            raise HTTPException(status_code=404, detail="Episode not found")

        audio_url = episode.audio_url

    # Make a HEAD request to the upstream to get Content-Length
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            head_response = await client.head(audio_url)
            content_length = head_response.headers.get("content-length", "0")
            content_type = head_response.headers.get("content-type", "audio/mpeg")
    except Exception:
        # If HEAD fails, return 0 (frontend will handle gracefully)
        content_length = "0"
        content_type = "audio/mpeg"

    return Response(
        content=b"",
        status_code=200,
        headers={
            "Content-Length": content_length,
            "Content-Type": content_type,
            "Accept-Ranges": "bytes",
            "Access-Control-Expose-Headers": "Content-Length, Accept-Ranges",
        },
    )


@router.get("/episode/{episode_id}/download")
async def download_episode(
    episode_id: int,
    request: Request,
    user_id: str = Depends(get_current_user_id),
):
    """
    Proxy download for an episode audio file.
    Streams the audio through the server for offline storage.
    Supports Range requests for resumable downloads.
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

    # Check for Range header
    range_header = request.headers.get("range")
    headers_to_upstream = {}
    if range_header:
        headers_to_upstream["Range"] = range_header

    # Stream the audio file
    async def stream_audio():
        async with httpx.AsyncClient(timeout=None, follow_redirects=True) as client:
            # We use stream() context manager, which will be closed when this generator closes
            async with client.stream(
                "GET", audio_url, headers=headers_to_upstream
            ) as response:
                # Check if upstream accepted the range
                status_code = response.status_code
                response_headers = response.headers

                # Yield initial status and headers for custom handling if needed,
                # but FastAPI StreamingResponse expects just body bytes.
                # So we just forward the chunks.
                # However, we need to set the response status code and headers BEFORE yielding.
                # LIMITATION: In FastAPI/Starlette, we can't easily change status code of StreamingResponse
                # after it starts. But here we are inside the generator.

                # Actually, capturing headers here is tricky because StreamingResponse takes headers in __init__.
                # BETTER APPROACH: Do a HEAD first to get size, OR start the stream and inspect before returning StreamingResponse.
                # But to fully stream, we should just return the StreamingResponse that iterates this.
                # The issue is passing the upstream status code (206 vs 200) to the client.

                # Let's pivot: We will initiate the request BEFORE creating StreamingResponse.
                pass

    # RE-IMPLEMENTATION with efficient header forwarding
    client = httpx.AsyncClient(timeout=None, follow_redirects=True)
    req = client.build_request("GET", audio_url, headers=headers_to_upstream)
    r = await client.send(req, stream=True)

    async def iter_response():
        try:
            async for chunk in r.aiter_bytes(chunk_size=65536):
                yield chunk
        finally:
            await r.aclose()
            await client.aclose()

    # Forward relevant headers
    response_headers = {
        "Content-Disposition": f'attachment; filename="episode_{episode_id}.mp3"',
        "Accept-Ranges": "bytes",
        "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
    }

    # Forward upstream headers if present
    for key in ["Content-Length", "Content-Range", "Content-Type"]:
        if key in r.headers:
            response_headers[key] = r.headers[key]

    # If no content type, guess it
    if "Content-Type" not in response_headers:
        content_type = "audio/mpeg"
        if audio_url.endswith(".m4a"):
            content_type = "audio/mp4"
        elif audio_url.endswith(".ogg"):
            content_type = "audio/ogg"
        response_headers["Content-Type"] = content_type

    return StreamingResponse(
        iter_response(),
        status_code=r.status_code,
        headers=response_headers,
        media_type=response_headers["Content-Type"],
    )
