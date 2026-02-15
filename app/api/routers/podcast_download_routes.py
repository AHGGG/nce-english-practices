from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user_id
from app.config import settings
from app.core.db import get_db
from app.services.podcast_service import podcast_service

from .podcast_common import BROWSER_USER_AGENT

router = APIRouter()


@router.head("/episode/{episode_id}/download")
async def download_episode_head(
    episode_id: int,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    _ = user_id
    import httpx

    audio_url = await podcast_service.get_episode_audio_url(db, episode_id)
    if not audio_url:
        raise HTTPException(status_code=404, detail="Episode not found")

    try:
        proxies = settings.PROXY_URL if settings.PROXY_URL else None
        headers = {"User-Agent": BROWSER_USER_AGENT}

        async with httpx.AsyncClient(
            timeout=10.0,
            follow_redirects=True,
            proxy=proxies,
            headers=headers,
        ) as client:
            head_response = await client.head(audio_url)
            content_length = head_response.headers.get("content-length", "0")
            content_type = head_response.headers.get("content-type", "audio/mpeg")
    except Exception:
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
    db: AsyncSession = Depends(get_db),
):
    _ = user_id
    import httpx

    audio_url = await podcast_service.get_episode_audio_url(db, episode_id)
    if not audio_url:
        raise HTTPException(status_code=404, detail="Episode not found")

    range_header = request.headers.get("range")
    headers_to_upstream = {"User-Agent": BROWSER_USER_AGENT}
    if range_header:
        headers_to_upstream["Range"] = range_header

    proxies = settings.PROXY_URL if settings.PROXY_URL else None
    client = httpx.AsyncClient(timeout=None, follow_redirects=True, proxy=proxies)
    req = client.build_request("GET", audio_url, headers=headers_to_upstream)
    upstream_response = await client.send(req, stream=True)

    async def iter_response():
        try:
            async for chunk in upstream_response.aiter_bytes(chunk_size=65536):
                yield chunk
        finally:
            await upstream_response.aclose()
            await client.aclose()

    response_headers = {
        "Content-Disposition": f'attachment; filename="episode_{episode_id}.mp3"',
        "Accept-Ranges": "bytes",
        "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
    }

    for key in ["Content-Length", "Content-Range", "Content-Type"]:
        if key in upstream_response.headers:
            response_headers[key] = upstream_response.headers[key]

    if "Content-Type" not in response_headers:
        content_type = "audio/mpeg"
        if audio_url.endswith(".m4a"):
            content_type = "audio/mp4"
        elif audio_url.endswith(".ogg"):
            content_type = "audio/ogg"
        response_headers["Content-Type"] = content_type

    return StreamingResponse(
        iter_response(),
        status_code=upstream_response.status_code,
        headers=response_headers,
        media_type=response_headers["Content-Type"],
    )
