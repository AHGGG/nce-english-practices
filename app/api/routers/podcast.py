"""
Podcast API Router.
Endpoints for searching, subscribing, and managing podcasts.
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Request
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import time

from app.api.routers.auth import get_current_user_id
from app.config import settings
from app.core.db import AsyncSessionLocal

from app.services.podcast_service import podcast_service

import logging

logger = logging.getLogger(__name__)

# Standard User-Agent to avoid blocking by CDNs (Cloudflare, etc.)
BROWSER_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"

router = APIRouter(prefix="/api/podcast", tags=["podcast"])

# --- Pydantic Schemas ---


class PositionSyncRequest(BaseModel):
    position: float
    is_finished: bool = False
    duration: Optional[int] = None
    timestamp: float  # Unix timestamp in milliseconds
    device_id: str
    device_type: Optional[str] = "web"
    playback_rate: float = 1.0


class PositionSyncResponse(BaseModel):
    success: bool
    position: float
    is_finished: bool = False
    server_timestamp: float
    conflict_resolved: bool
    message: Optional[str] = None


class DeviceInfo(BaseModel):
    device_id: str
    device_type: Optional[str]
    last_active: Optional[datetime]


class DeviceListResponse(BaseModel):
    devices: List[DeviceInfo]


class ItunesSearchResult(BaseModel):
    itunes_id: Optional[int] = None
    title: str
    author: Optional[str] = None
    rss_url: Optional[str] = None
    artwork_url: Optional[str] = None
    genre: Optional[str] = None
    episode_count: Optional[int] = None
    is_subscribed: bool = False


class Category(BaseModel):
    id: str
    name: str


class SubscribeRequest(BaseModel):
    rss_url: str


class PreviewRequest(BaseModel):
    rss_url: str


class FeedResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    author: Optional[str]
    image_url: Optional[str]
    rss_url: str
    episode_count: Optional[int] = None
    category: Optional[str] = None

    class Config:
        from_attributes = True


class EpisodeResponse(BaseModel):
    id: int
    guid: str
    title: str
    description: Optional[str]
    audio_url: str
    file_size: Optional[int]
    duration_seconds: Optional[int]
    chapters: Optional[List[dict]] = None
    image_url: Optional[str]
    published_at: Optional[str]
    transcript_status: str
    transcript_segments: Optional[List[dict]] = None  # Time-aligned segments
    # User state for resume playback
    current_position: float = 0.0
    is_finished: bool = False

    class Config:
        from_attributes = True


class FeedDetailResponse(BaseModel):
    feed: FeedResponse
    episodes: List[EpisodeResponse]
    is_subscribed: bool = False
    total_episodes: int = 0  # Added for pagination support


class ListeningSessionRequest(BaseModel):
    episode_id: int


class BatchEpisodesRequest(BaseModel):
    episode_ids: List[int]


class ListeningSessionUpdateRequest(BaseModel):
    session_id: int
    total_listened_seconds: int
    last_position_seconds: float
    is_finished: bool = False


class CheckSizeRequest(BaseModel):
    episode_ids: List[int]


class OPMLImportResult(BaseModel):
    total: int
    imported: int
    skipped: int
    errors: List[dict]


# --- Proxy Helpers ---


async def _proxy_image(url: str, filename: str = "image.jpg"):
    """
    Stream an image from a remote URL through the server.
    Caches the image locally to improve performance.
    """
    import httpx
    import mimetypes
    import hashlib
    from fastapi.responses import FileResponse
    from fastapi.concurrency import run_in_threadpool

    if not url:
        raise HTTPException(status_code=404, detail="No image URL")

    # Security: basic check to prevent local file access
    if not url.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid URL protocol")

    # Cache Configuration
    CACHE_DIR = settings.podcast_cache_dir

    # Generate Cache Key (Hash)
    url_hash = hashlib.md5(url.encode("utf-8")).hexdigest()

    # Check cache (Search for any extension with this hash)
    # This is more robust than checking a hardcoded list of extensions
    try:
        # Use iterator with next() for performance (stops at first match)
        candidate = next(CACHE_DIR.glob(f"{url_hash}.*"), None)
        if candidate and candidate.exists():
            # logger.debug(f"Cache HIT for {url} -> {candidate}")
            return FileResponse(
                path=candidate,
                filename=filename,
                headers={"Cache-Control": "public, max-age=604800, immutable"},
            )
    except Exception as e:
        logger.warning(f"Cache lookup failed for {url}: {e}")

    logger.info(f"Cache MISS for {url} - Fetching from upstream")

    # Cache Miss - Fetch from Upstream
    proxies = settings.PROXY_URL if settings.PROXY_URL else None

    headers = {"User-Agent": BROWSER_USER_AGENT}

    try:
        async with httpx.AsyncClient(
            timeout=10.0,
            follow_redirects=True,
            proxy=proxies,
            verify=False,
            headers=headers,
        ) as client:
            r = await client.get(url)

            if r.status_code != 200:
                logger.warning(f"Proxy upstream returned {r.status_code} for {url}")
                raise HTTPException(status_code=404, detail="Image not found upstream")

            # Determine extension
            content_type = r.headers.get("content-type", "image/jpeg")
            ext = mimetypes.guess_extension(content_type) or ".jpg"
            if ext == ".jpe":
                ext = ".jpg"

            save_path = CACHE_DIR / f"{url_hash}{ext}"
            content = r.content

            # Write to disk (in threadpool to avoid blocking event loop)
            def write_file():
                try:
                    with open(save_path, "wb") as f:
                        f.write(content)
                    logger.info(f"Saved to cache: {save_path}")
                except Exception as e:
                    logger.error(f"Failed to write cache file {save_path}: {e}")

            await run_in_threadpool(write_file)

            return FileResponse(
                path=save_path,
                media_type=content_type,
                filename=filename,
                headers={"Cache-Control": "public, max-age=604800, immutable"},
            )

    except HTTPException:
        raise
    except httpx.RequestError as e:
        logger.warning(f"Proxy fetch failed for {url}: {e}")
        raise HTTPException(
            status_code=502, detail=f"Failed to fetch upstream image: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Proxy unexpected error for {url}: {e}")
        # Return generic error
        raise HTTPException(status_code=500, detail="Internal proxy error")


# --- Signing Helper ---


def sign_url(url: str) -> str:
    """Sign a URL with HMAC-SHA256 for secure proxying."""
    import hmac
    import hashlib
    import base64

    if not url:
        return ""

    secret = settings.SECRET_KEY.encode("utf-8")
    msg = url.encode("utf-8")
    signature = hmac.new(secret, msg, hashlib.sha256).hexdigest()

    # URL-safe base64 encoding of the URL itself
    encoded_url = base64.urlsafe_b64encode(msg).decode("utf-8")

    return f"{encoded_url}.{signature}"


def verify_signed_url(signed_token: str) -> Optional[str]:
    """Verify and decode a signed URL token."""
    import hmac
    import hashlib
    import base64

    try:
        parts = signed_token.split(".")
        if len(parts) != 2:
            return None

        encoded_url, signature = parts

        # Decode URL
        url_bytes = base64.urlsafe_b64decode(encoded_url)
        url = url_bytes.decode("utf-8")

        # Verify signature
        secret = settings.SECRET_KEY.encode("utf-8")
        expected_signature = hmac.new(secret, url_bytes, hashlib.sha256).hexdigest()

        if not hmac.compare_digest(signature, expected_signature):
            return None

        return url
    except Exception:
        return None


# --- Endpoints ---


@router.get("/proxy/image")
async def proxy_external_image(token: str):
    """
    Proxy an arbitrary external image URL using a signed token.
    This allows frontend to load images from third-party domains (iTunes, etc)
    without CORS/Mixed Content issues, while preventing open relay abuse.
    """
    url = verify_signed_url(token)
    if not url:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    return await _proxy_image(url, filename="artwork.jpg")


@router.get("/feed/{feed_id}/image")
async def get_feed_image(feed_id: int):
    """Proxy feed image."""
    # Note: Public endpoint (no auth) to allow easy use in <img> tags
    async with AsyncSessionLocal() as db:
        from app.models.podcast_orm import PodcastFeed
        from sqlalchemy import select

        stmt = select(PodcastFeed.image_url).where(PodcastFeed.id == feed_id)
        result = await db.execute(stmt)
        image_url = result.scalar_one_or_none()

        if not image_url:
            # Return 404 so browser can show alt text or default
            raise HTTPException(status_code=404, detail="Feed has no image")

        return await _proxy_image(image_url, f"feed_{feed_id}.jpg")


@router.get("/episode/{episode_id}/image")
async def get_episode_image(episode_id: int):
    """Proxy episode image."""
    # Note: Public endpoint (no auth)
    async with AsyncSessionLocal() as db:
        from app.models.podcast_orm import PodcastEpisode
        from sqlalchemy import select

        stmt = select(PodcastEpisode.image_url).where(PodcastEpisode.id == episode_id)
        result = await db.execute(stmt)
        image_url = result.scalar_one_or_none()

        if not image_url:
            raise HTTPException(status_code=404, detail="Episode has no image")

        return await _proxy_image(image_url, f"episode_{episode_id}.jpg")


@router.get("/search")
async def search_podcasts(
    q: str,
    limit: int = 20,
    country: str = "US",
    user_id: str = Depends(get_current_user_id),
) -> List[ItunesSearchResult]:
    """
    Search podcasts via iTunes.
    Includes subscription status for the current user.
    """
    async with AsyncSessionLocal() as db:
        results = await podcast_service.search_itunes(
            db, q, user_id, limit=limit, country=country
        )

        # Return results directly (frontend handles images)
        return [ItunesSearchResult(**r) for r in results]


@router.get("/categories")
async def get_categories() -> List[Category]:
    """Get list of iTunes podcast categories for exploration."""
    return [
        Category(id="1301", name="Arts"),
        Category(id="1303", name="Comedy"),
        Category(id="1304", name="Education"),
        Category(id="1305", name="Kids & Family"),
        Category(id="1309", name="TV & Film"),
        Category(id="1310", name="Music"),
        Category(id="1311", name="News"),
        Category(id="1314", name="Religion & Spirituality"),
        Category(id="1315", name="Science"),
        Category(id="1316", name="Sports"),
        Category(id="1318", name="Technology"),
        Category(id="1321", name="Business"),
        Category(id="1323", name="Games"),
        Category(id="1324", name="Society & Culture"),
        Category(id="1325", name="Government"),
        Category(id="1482", name="Health & Fitness"),
        Category(id="1483", name="Fiction"),
        Category(id="1484", name="History"),
        Category(id="1486", name="True Crime"),
        Category(id="1487", name="Leisure"),
        Category(id="1488", name="Science Fiction"),
        Category(id="1489", name="Drama"),
    ]


@router.post("/preview")
async def preview_podcast(
    req: PreviewRequest,
    user_id: str = Depends(get_current_user_id),
) -> FeedDetailResponse:
    """
    Preview a podcast by RSS URL.
    Fetches and parses the feed, stores it in DB (for caching/proxy),
    and returns full details including episodes.
    Does NOT subscribe the user.
    """
    async with AsyncSessionLocal() as db:
        try:
            # Get or create feed (parses and saves episodes if new)
            feed = await podcast_service.preview_feed(db, req.rss_url)

            # Get full details (reuse get_feed_with_episodes logic)
            # This handles getting episodes with user state (if any)
            data = await podcast_service.get_feed_with_episodes(db, user_id, feed.id)

            if not data:
                # Should not happen as we just created it
                raise HTTPException(
                    status_code=404, detail="Feed not found after creation"
                )

            feed_obj = data["feed"]
            episodes = data["episodes"]
            is_subscribed = data["is_subscribed"]

            return FeedDetailResponse(
                feed=FeedResponse(
                    id=feed_obj.id,
                    title=feed_obj.title,
                    description=feed_obj.description,
                    author=feed_obj.author,
                    image_url=feed_obj.image_url,
                    rss_url=feed_obj.rss_url,
                    episode_count=len(episodes),
                    category=feed_obj.category,
                ),
                episodes=[
                    EpisodeResponse(
                        id=ep["id"],
                        guid=ep["guid"],
                        title=ep["title"],
                        description=ep["description"],
                        audio_url=ep["audio_url"],
                        file_size=ep.get("file_size"),
                        duration_seconds=ep["duration_seconds"],
                        chapters=ep.get("chapters"),
                        image_url=ep.get("image_url"),
                        published_at=ep["published_at"],
                        transcript_status=ep["transcript_status"],
                        current_position=ep["current_position"],
                        is_finished=ep["is_finished"],
                    )
                    for ep in episodes
                ],
                is_subscribed=is_subscribed,
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))


@router.get("/trending")
async def get_trending_podcasts(
    category: Optional[str] = None,
    limit: int = 20,
    user_id: str = Depends(get_current_user_id),
) -> List[ItunesSearchResult]:
    """
    Get trending podcasts from iTunes Top Charts.
    Includes subscription status for the current user.
    """
    async with AsyncSessionLocal() as db:
        results = await podcast_service.get_trending_podcasts(
            db, user_id, category, limit=limit
        )

        # Return results directly (frontend handles images)
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
                category=feed.category,
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
    """
    Get all subscribed podcasts.
    Optimized to fetch episode counts in a single query.
    """
    async with AsyncSessionLocal() as db:
        feeds = await podcast_service.get_subscriptions(db, user_id)

        # Service now returns dicts with episode_count included
        response_feeds = []
        for feed in feeds:
            response_feeds.append(FeedResponse(**feed))

        return response_feeds


@router.post("/episodes/batch")
async def get_episodes_batch(
    req: BatchEpisodesRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Get details for multiple episodes by ID.
    Used for efficient bulk loading (e.g., downloads page).
    """
    async with AsyncSessionLocal() as db:
        items = await podcast_service.get_episodes_batch(db, user_id, req.episode_ids)
        return items


@router.get("/feed/{feed_id}")
async def get_feed_detail(
    feed_id: int,
    limit: int = 50,
    offset: int = 0,
    user_id: str = Depends(get_current_user_id),
) -> FeedDetailResponse:
    """Get feed details with episodes (includes user state for resume)."""
    async with AsyncSessionLocal() as db:
        data = await podcast_service.get_feed_with_episodes(
            db, user_id, feed_id, limit=limit, offset=offset
        )
        if not data:
            raise HTTPException(status_code=404, detail="Feed not found")

        feed = data["feed"]
        episodes = data["episodes"]  # Now a list of dicts with user state
        is_subscribed = data["is_subscribed"]
        total_episodes = data.get("total_episodes", len(episodes))

        return FeedDetailResponse(
            feed=FeedResponse(
                id=feed.id,
                title=feed.title,
                description=feed.description,
                author=feed.author,
                image_url=feed.image_url,
                rss_url=feed.rss_url,
                episode_count=total_episodes,
                category=feed.category,
            ),
            episodes=[
                EpisodeResponse(
                    id=ep["id"],
                    guid=ep["guid"],
                    title=ep["title"],
                    description=ep["description"],
                    audio_url=ep["audio_url"],
                    file_size=ep.get("file_size"),
                    duration_seconds=ep["duration_seconds"],
                    chapters=ep.get("chapters"),
                    image_url=ep.get("image_url"),
                    published_at=ep["published_at"],
                    transcript_status=ep["transcript_status"],
                    current_position=ep["current_position"],
                    is_finished=ep["is_finished"],
                )
                for ep in episodes
            ],
            is_subscribed=is_subscribed,
            total_episodes=total_episodes,
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


@router.post("/episodes/check-size")
async def check_episode_sizes(
    data: CheckSizeRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Check and update file sizes for specified episodes.
    """
    async with AsyncSessionLocal() as db:
        updated = await podcast_service.update_episode_sizes(db, data.episode_ids)
        return {"updated": updated}


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
        failed = 0

        # Optimization: Pre-fetch existing subscriptions to skip DB calls for duplicates
        # This makes re-importing identical files instant.
        existing_urls = set()
        all_rss_urls = [f.get("rss_url") for f in feeds if f.get("rss_url")]

        if all_rss_urls:
            async with AsyncSessionLocal() as db:
                from sqlalchemy import select
                from app.models.podcast_orm import PodcastFeed, PodcastFeedSubscription

                # Query all RSS URLs that this user is already subscribed to
                stmt = (
                    select(PodcastFeed.rss_url)
                    .join(
                        PodcastFeedSubscription,
                        PodcastFeedSubscription.feed_id == PodcastFeed.id,
                    )
                    .where(
                        PodcastFeedSubscription.user_id == user_id,
                        PodcastFeed.rss_url.in_(all_rss_urls),
                    )
                )
                result = await db.execute(stmt)
                existing_urls = set(result.scalars().all())

        async with AsyncSessionLocal() as db:
            for i, feed_info in enumerate(feeds):
                title = feed_info.get("title", "Unknown")
                rss_url = feed_info.get("rss_url", "")

                # Progress event
                yield f"data: {json.dumps({'type': 'progress', 'current': i + 1, 'total': len(feeds), 'title': title, 'rss_url': rss_url})}\n\n"

                # Check cache first (Optimization)
                if rss_url in existing_urls:
                    skipped += 1
                    yield f"data: {json.dumps({'type': 'result', 'success': True, 'title': title, 'status': 'skipped'})}\n\n"
                    continue

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
                    failed += 1
                    yield f"data: {json.dumps({'type': 'result', 'success': False, 'title': title, 'error': str(e), 'rss_url': rss_url})}\n\n"

        # Complete event
        yield f"data: {json.dumps({'type': 'complete', 'imported': imported, 'skipped': skipped, 'failed': failed, 'total': len(feeds)})}\n\n"

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

        is_finished = data.get("is_finished", False)

        async with AsyncSessionLocal() as db:
            session = await podcast_service.update_listening_session(
                db,
                session_id,
                listened_seconds,
                position_seconds,
                is_finished=is_finished,
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


@router.post("/episode/{episode_id}/position/sync")
async def sync_position(
    episode_id: int,
    request: PositionSyncRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Sync position from a device with conflict detection."""
    async with AsyncSessionLocal() as db:
        timestamp = datetime.fromtimestamp(request.timestamp / 1000)

        # Try to update
        result = await podcast_service.update_episode_state(
            db,
            user_id,
            episode_id,
            request.position,
            is_finished=request.is_finished,
            duration=request.duration,
            device_id=request.device_id,
            device_type=request.device_type,
            timestamp=timestamp,
            playback_rate=request.playback_rate,
        )

        if result is None:
            # Conflict! Fetch current state to return
            current_state = await podcast_service.get_episode_state(
                db, user_id, episode_id
            )
            server_ts = (
                current_state.last_synced_at.timestamp() * 1000
                if current_state and current_state.last_synced_at
                else time.time() * 1000
            )
            position = current_state.current_position_seconds if current_state else 0.0
            is_finished = current_state.is_finished if current_state else False

            return PositionSyncResponse(
                success=True,
                position=position,
                is_finished=is_finished,
                server_timestamp=server_ts,
                conflict_resolved=True,
                message="Position not updated (server has newer data)",
            )

        return PositionSyncResponse(
            success=True,
            position=request.position,
            server_timestamp=time.time() * 1000,
            conflict_resolved=False,
        )


@router.get("/devices")
async def list_devices(user_id: str = Depends(get_current_user_id)):
    """List all devices for the current user."""
    async with AsyncSessionLocal() as db:
        devices = await podcast_service.list_devices(db, user_id)
        return DeviceListResponse(devices=[DeviceInfo(**d) for d in devices])


@router.post("/episode/{episode_id}/position/resolve")
async def resolve_position(
    episode_id: int,
    request: PositionSyncRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Get latest position with conflict resolution (Client vs Server)."""
    async with AsyncSessionLocal() as db:
        current_state = await podcast_service.get_episode_state(db, user_id, episode_id)

        if not current_state:
            # No server state, trust client
            return PositionSyncResponse(
                success=True,
                position=request.position,
                server_timestamp=time.time() * 1000,
                conflict_resolved=False,
                message="No server state found",
            )

        server_ts = (
            current_state.last_synced_at.timestamp() * 1000
            if current_state.last_synced_at
            else 0
        )

        if request.timestamp > server_ts:
            # Client is newer
            return PositionSyncResponse(
                success=True,
                position=request.position,
                is_finished=False,  # Resolve usually triggered on play, so start with false or known?
                # Client data doesn't have is_finished in request yet.
                # But we can assume if they are resolving, it's not finished.
                server_timestamp=server_ts,
                conflict_resolved=False,
                message="Client is newer",
            )
        else:
            # Server is newer
            return PositionSyncResponse(
                success=True,
                position=current_state.current_position_seconds,
                is_finished=current_state.is_finished,
                server_timestamp=server_ts,
                conflict_resolved=True,
                message="Server is newer",
            )


# --- Recently Played ---


@router.get("/recently-played")
async def get_recently_played(
    limit: int = 10,
    user_id: str = Depends(get_current_user_id),
):
    """Get recently played episodes with resume positions."""
    async with AsyncSessionLocal() as db:
        items = await podcast_service.get_recently_played(db, user_id, limit=limit)
        return items


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
        proxies = settings.PROXY_URL if settings.PROXY_URL else None
        headers = {"User-Agent": BROWSER_USER_AGENT}

        async with httpx.AsyncClient(
            timeout=10.0, follow_redirects=True, proxy=proxies, headers=headers
        ) as client:
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
    headers_to_upstream = {"User-Agent": BROWSER_USER_AGENT}
    if range_header:
        headers_to_upstream["Range"] = range_header

    # Stream the audio file
    # RE-IMPLEMENTATION with efficient header forwarding
    proxies = settings.PROXY_URL if settings.PROXY_URL else None
    client = httpx.AsyncClient(timeout=None, follow_redirects=True, proxy=proxies)
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


# --- Transcription API ---


class TranscribeResponse(BaseModel):
    status: str
    message: str


class TranscribeRequest(BaseModel):
    force: bool = False
    remote_url: Optional[str] = None
    api_key: Optional[str] = None


@router.post("/episode/{episode_id}/transcribe", response_model=TranscribeResponse)
async def transcribe_episode(
    episode_id: int,
    req: Optional[TranscribeRequest] = None,
    force: bool = False,  # Keep query param for backward compatibility
    user_id: str = Depends(get_current_user_id),
):
    """
    Trigger AI transcription for a podcast episode.

    This endpoint starts a background transcription job.
    Supports local SenseVoice (default) or Remote Transcription (via config).

    Args:
        req: JSON body with options (recommended)
        force: Query param (legacy)
    """
    from sqlalchemy import select, update
    from app.models.podcast_orm import PodcastEpisode
    from fastapi import BackgroundTasks
    from fastapi.concurrency import run_in_threadpool

    # Merge options
    should_force = force
    remote_url = None
    api_key = None

    if req:
        should_force = req.force or force
        remote_url = req.remote_url
        api_key = req.api_key

    async with AsyncSessionLocal() as db:
        # Get episode

        stmt = select(PodcastEpisode).where(PodcastEpisode.id == episode_id)
        result = await db.execute(stmt)
        episode = result.scalar_one_or_none()

        if not episode:
            raise HTTPException(status_code=404, detail="Episode not found")

        # Check current status
        if episode.transcript_status in ("processing", "pending"):
            if not should_force:
                raise HTTPException(
                    status_code=409,
                    detail=f"Transcription already {episode.transcript_status}. Use force=true to restart.",
                )
            # Force mode: log and continue
            logger.warning(
                f"Force restarting transcription for episode {episode_id} (was {episode.transcript_status})"
            )

        # Update status to pending
        await db.execute(
            update(PodcastEpisode)
            .where(PodcastEpisode.id == episode_id)
            .values(transcript_status="pending")
        )
        await db.commit()

        # Get audio URL for background task
        audio_url = episode.audio_url

    # Start background transcription task
    import asyncio

    asyncio.create_task(
        _run_transcription(episode_id, audio_url, remote_url, api_key)
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
    """
    Background task to run transcription.

    Downloads audio, runs Engine (Local or Remote), and saves results to database.
    """

    import tempfile
    import httpx

    from pathlib import Path
    from sqlalchemy import update
    from app.models.podcast_orm import PodcastEpisode
    from fastapi.concurrency import run_in_threadpool

    logger.info(f"Starting transcription for episode {episode_id}")

    try:
        # Update status to processing
        async with AsyncSessionLocal() as db:
            await db.execute(
                update(PodcastEpisode)
                .where(PodcastEpisode.id == episode_id)
                .values(transcript_status="processing")
            )
            await db.commit()

        # Download audio to temp file
        temp_dir = Path(tempfile.mkdtemp(prefix="podcast_transcribe_"))

        # Preserve original extension from URL
        from urllib.parse import urlparse

        parsed_url = urlparse(audio_url)
        original_ext = Path(parsed_url.path).suffix or ".mp3"
        audio_path = temp_dir / f"audio{original_ext}"

        logger.info(f"Downloading audio from {audio_url}")

        proxies = settings.PROXY_URL if settings.PROXY_URL else None
        async with httpx.AsyncClient(
            timeout=300.0,  # 5 minutes for large files
            follow_redirects=True,
            proxy=proxies,
            headers={"User-Agent": BROWSER_USER_AGENT},
        ) as client:
            response = await client.get(audio_url)
            response.raise_for_status()

            with open(audio_path, "wb") as f:
                f.write(response.content)

        logger.info(f"Audio downloaded to {audio_path}")

        # Run transcription in thread pool (CPU-bound)
        # Note: utils._load_audio_flexible handles format conversion internally
        def do_transcription():
            from app.services.transcription import AudioInput, get_default_engine

            engine = get_default_engine(remote_url=remote_url, api_key=api_key)
            audio_input = AudioInput.from_file(audio_path)
            result = engine.transcribe(audio_input)
            return result

        result = await run_in_threadpool(do_transcription)


        logger.info(f"Transcription complete: {len(result.segments)} segments")

        # Save results to database
        segments_data = [seg.to_dict() for seg in result.segments]

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

        logger.info(f"Transcription saved for episode {episode_id}")

        # Cleanup temp files
        try:
            audio_path.unlink()
            temp_dir.rmdir()
        except Exception as e:
            logger.warning(f"Failed to cleanup temp files: {e}")

    except Exception as e:
        import traceback

        logger.error(
            f"Transcription failed for episode {episode_id}: {e}\n{traceback.format_exc()}"
        )

        # Update status to failed
        try:
            async with AsyncSessionLocal() as db:
                await db.execute(
                    update(PodcastEpisode)
                    .where(PodcastEpisode.id == episode_id)
                    .values(transcript_status="failed")
                )
                await db.commit()
        except Exception as db_error:
            logger.error(f"Failed to update status to failed: {db_error}")
