import json
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user_id
from app.core.db import get_db
from app.models.podcast_schemas import (
    BatchEpisodesRequest,
    Category,
    CheckSizeRequest,
    FavoriteEpisodeIdsResponse,
    FavoriteEpisodeItem,
    FavoriteToggleResponse,
    FeedDetailResponse,
    FeedResponse,
    ItunesSearchResult,
    OPMLImportResult,
    PreviewRequest,
    SubscribeRequest,
)
from app.services.podcast_service import podcast_service

from .podcast_common import (
    PODCAST_CATEGORIES,
    build_feed_detail_response,
    proxy_image,
    verify_signed_url,
)

router = APIRouter()


@router.get("/proxy/image")
async def proxy_external_image(token: str):
    url = verify_signed_url(token)
    if not url:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    return await proxy_image(url, filename="artwork.jpg")


@router.get("/feed/{feed_id}/image")
async def get_feed_image(feed_id: int, db: AsyncSession = Depends(get_db)):
    image_url = await podcast_service.get_feed_image_url(db, feed_id)
    if not image_url:
        raise HTTPException(status_code=404, detail="Feed has no image")
    return await proxy_image(image_url, f"feed_{feed_id}.jpg")


@router.get("/episode/{episode_id}/image")
async def get_episode_image(episode_id: int, db: AsyncSession = Depends(get_db)):
    image_url = await podcast_service.get_episode_image_url(db, episode_id)
    if not image_url:
        raise HTTPException(status_code=404, detail="Episode has no image")
    return await proxy_image(image_url, f"episode_{episode_id}.jpg")


@router.get("/search")
async def search_podcasts(
    q: str,
    limit: int = 20,
    country: str = "US",
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> List[ItunesSearchResult]:
    results = await podcast_service.search_itunes(
        db,
        q,
        user_id,
        limit=limit,
        country=country,
    )
    return [ItunesSearchResult(**item) for item in results]


@router.get("/categories")
async def get_categories() -> List[Category]:
    return PODCAST_CATEGORIES


@router.post("/preview")
async def preview_podcast(
    req: PreviewRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> FeedDetailResponse:
    try:
        feed = await podcast_service.preview_feed(db, req.rss_url)
        data = await podcast_service.get_feed_with_episodes(db, user_id, feed.id)
        if not data:
            raise HTTPException(status_code=404, detail="Feed not found after creation")
        return build_feed_detail_response(data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/trending")
async def get_trending_podcasts(
    category: Optional[str] = None,
    limit: int = 20,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> List[ItunesSearchResult]:
    results = await podcast_service.get_trending_podcasts(
        db,
        user_id,
        category,
        limit=limit,
    )
    return [ItunesSearchResult(**item) for item in results]


@router.post("/subscribe")
async def subscribe_to_podcast(
    req: SubscribeRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> FeedResponse:
    try:
        feed, _ = await podcast_service.subscribe(db, user_id, req.rss_url)
        episode_count = await podcast_service.get_feed_episode_count(db, feed.id)
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
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/feed/{feed_id}")
async def unsubscribe_from_podcast(
    feed_id: int,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    success = await podcast_service.unsubscribe(db, user_id, feed_id)
    if not success:
        raise HTTPException(status_code=404, detail="Feed not found")
    return {"success": True}


@router.get("/feeds")
async def get_subscriptions(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> List[FeedResponse]:
    feeds = await podcast_service.get_subscriptions(db, user_id)
    return [FeedResponse(**feed) for feed in feeds]


@router.post("/episodes/batch")
async def get_episodes_batch(
    req: BatchEpisodesRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await podcast_service.get_episodes_batch(db, user_id, req.episode_ids)


@router.get("/feed/{feed_id}")
async def get_feed_detail(
    feed_id: int,
    limit: int = 50,
    offset: int = 0,
    q: Optional[str] = None,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> FeedDetailResponse:
    data = await podcast_service.get_feed_with_episodes(
        db,
        user_id,
        feed_id,
        limit=limit,
        offset=offset,
        query=q,
    )
    if not data:
        raise HTTPException(status_code=404, detail="Feed not found")
    return build_feed_detail_response(data)


@router.post("/feed/{feed_id}/refresh")
async def refresh_feed(
    feed_id: int,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    new_count = await podcast_service.refresh_feed(db, user_id, feed_id)
    return {"new_episodes": new_count}


@router.post("/episodes/check-size")
async def check_episode_sizes(
    data: CheckSizeRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    _ = user_id
    updated = await podcast_service.update_episode_sizes(db, data.episode_ids)
    return {"updated": updated}


@router.post("/opml/import")
async def import_opml(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> OPMLImportResult:
    content = await file.read()
    try:
        opml_text = content.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid file encoding") from exc

    result = await podcast_service.import_opml(db, user_id, opml_text)
    return OPMLImportResult(**result)


@router.post("/opml/import/stream")
async def import_opml_streaming(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    try:
        opml_text = content.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid file encoding") from exc

    feeds = podcast_service.parse_opml(opml_text)

    async def event_generator():
        yield f"data: {json.dumps({'type': 'start', 'total': len(feeds)})}\n\n"

        imported = 0
        skipped = 0
        failed = 0

        existing_urls = set()
        all_rss_urls = [feed.get("rss_url") for feed in feeds if feed.get("rss_url")]
        if all_rss_urls:
            subscriptions = await podcast_service.get_subscriptions(db, user_id)
            existing_urls = {
                item.get("rss_url")
                for item in subscriptions
                if item.get("rss_url") in all_rss_urls
            }

        for index, feed_info in enumerate(feeds):
            title = feed_info.get("title", "Unknown")
            rss_url = feed_info.get("rss_url", "")

            yield (
                "data: "
                + json.dumps(
                    {
                        "type": "progress",
                        "current": index + 1,
                        "total": len(feeds),
                        "title": title,
                        "rss_url": rss_url,
                    }
                )
                + "\n\n"
            )

            if rss_url in existing_urls:
                skipped += 1
                yield (
                    "data: "
                    + json.dumps(
                        {
                            "type": "result",
                            "success": True,
                            "title": title,
                            "status": "skipped",
                        }
                    )
                    + "\n\n"
                )
                continue

            try:
                feed, is_new = await podcast_service.subscribe(db, user_id, rss_url)
                _ = feed
                if is_new:
                    imported += 1
                    status = "imported"
                else:
                    skipped += 1
                    status = "skipped"

                yield (
                    "data: "
                    + json.dumps(
                        {
                            "type": "result",
                            "success": True,
                            "title": title,
                            "status": status,
                        }
                    )
                    + "\n\n"
                )
            except Exception as exc:  # pragma: no cover - network dependent branch
                failed += 1
                yield (
                    "data: "
                    + json.dumps(
                        {
                            "type": "result",
                            "success": False,
                            "title": title,
                            "error": str(exc),
                            "rss_url": rss_url,
                        }
                    )
                    + "\n\n"
                )

        yield (
            "data: "
            + json.dumps(
                {
                    "type": "complete",
                    "imported": imported,
                    "skipped": skipped,
                    "failed": failed,
                    "total": len(feeds),
                }
            )
            + "\n\n"
        )

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/opml/export")
async def export_opml(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    opml_content = await podcast_service.export_opml(db, user_id)
    return Response(
        content=opml_content,
        media_type="application/xml",
        headers={"Content-Disposition": "attachment; filename=podcasts.opml"},
    )


@router.get("/recently-played")
async def get_recently_played(
    limit: int = 10,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await podcast_service.get_recently_played(db, user_id, limit=limit)


@router.get("/favorites")
async def get_favorites(
    limit: int = 50,
    offset: int = 0,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> List[FavoriteEpisodeItem]:
    items = await podcast_service.get_favorite_episodes(
        db,
        user_id,
        limit=limit,
        offset=offset,
    )
    return [FavoriteEpisodeItem(**item) for item in items]


@router.get("/favorites/ids")
async def get_favorite_ids(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> FavoriteEpisodeIdsResponse:
    episode_ids = await podcast_service.get_favorite_episode_ids(db, user_id)
    return FavoriteEpisodeIdsResponse(episode_ids=episode_ids)


@router.post("/episode/{episode_id}/favorite")
async def add_episode_favorite(
    episode_id: int,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> FavoriteToggleResponse:
    success = await podcast_service.set_episode_favorite(db, user_id, episode_id)
    if not success:
        raise HTTPException(status_code=404, detail="Episode not found")
    return FavoriteToggleResponse(success=True, episode_id=episode_id, is_favorite=True)


@router.delete("/episode/{episode_id}/favorite")
async def remove_episode_favorite(
    episode_id: int,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> FavoriteToggleResponse:
    await podcast_service.remove_episode_favorite(db, user_id, episode_id)
    return FavoriteToggleResponse(
        success=True, episode_id=episode_id, is_favorite=False
    )
