import logging
from typing import Any, Optional

from fastapi import HTTPException

from app.config import settings
from app.models.podcast_schemas import (
    Category,
    EpisodeResponse,
    FeedDetailResponse,
    FeedResponse,
)

logger = logging.getLogger(__name__)

# Standard User-Agent to avoid blocking by CDNs (Cloudflare, etc.)
BROWSER_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"

PODCAST_CATEGORIES = [
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


def build_feed_response(feed: Any, episode_count: int) -> FeedResponse:
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


def build_episode_response(ep: dict) -> EpisodeResponse:
    return EpisodeResponse(
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


def build_feed_detail_response(data: dict) -> FeedDetailResponse:
    feed = data["feed"]
    episodes = data["episodes"]
    total_episodes = data.get("total_episodes", len(episodes))
    return FeedDetailResponse(
        feed=build_feed_response(feed, total_episodes),
        episodes=[build_episode_response(ep) for ep in episodes],
        is_subscribed=data.get("is_subscribed", False),
        total_episodes=total_episodes,
    )


async def proxy_image(url: str, filename: str = "image.jpg"):
    """Stream an image from a remote URL through the server with cache."""
    import hashlib
    import mimetypes

    import httpx
    from fastapi.concurrency import run_in_threadpool
    from fastapi.responses import FileResponse

    if not url:
        raise HTTPException(status_code=404, detail="No image URL")

    if not url.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid URL protocol")

    cache_dir = settings.podcast_cache_dir
    url_hash = hashlib.md5(url.encode("utf-8")).hexdigest()

    try:
        candidate = next(cache_dir.glob(f"{url_hash}.*"), None)
        if candidate and candidate.exists():
            return FileResponse(
                path=candidate,
                filename=filename,
                headers={"Cache-Control": "public, max-age=604800, immutable"},
            )
    except Exception as exc:
        logger.warning("Cache lookup failed for %s: %s", url, exc)

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
            response = await client.get(url)

            if response.status_code != 200:
                logger.warning(
                    "Proxy upstream returned %s for %s", response.status_code, url
                )
                raise HTTPException(status_code=404, detail="Image not found upstream")

            content_type = response.headers.get("content-type", "image/jpeg")
            ext = mimetypes.guess_extension(content_type) or ".jpg"
            if ext == ".jpe":
                ext = ".jpg"

            save_path = cache_dir / f"{url_hash}{ext}"
            content = response.content

            def write_file() -> None:
                with open(save_path, "wb") as file_obj:
                    file_obj.write(content)

            await run_in_threadpool(write_file)

            return FileResponse(
                path=save_path,
                media_type=content_type,
                filename=filename,
                headers={"Cache-Control": "public, max-age=604800, immutable"},
            )
    except HTTPException:
        raise
    except httpx.RequestError as exc:
        logger.warning("Proxy fetch failed for %s: %s", url, exc)
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch upstream image: {str(exc)}",
        ) from exc
    except Exception as exc:
        logger.error("Proxy unexpected error for %s: %s", url, exc)
        raise HTTPException(status_code=500, detail="Internal proxy error") from exc


def sign_url(url: str) -> str:
    """Sign a URL with HMAC-SHA256 for secure proxying."""
    import base64
    import hashlib
    import hmac

    if not url:
        return ""

    secret = settings.SECRET_KEY.encode("utf-8")
    message = url.encode("utf-8")
    signature = hmac.new(secret, message, hashlib.sha256).hexdigest()
    encoded_url = base64.urlsafe_b64encode(message).decode("utf-8")
    return f"{encoded_url}.{signature}"


def verify_signed_url(signed_token: str) -> Optional[str]:
    """Verify and decode a signed URL token."""
    import base64
    import hashlib
    import hmac

    try:
        parts = signed_token.split(".")
        if len(parts) != 2:
            return None

        encoded_url, signature = parts
        url_bytes = base64.urlsafe_b64decode(encoded_url)
        url = url_bytes.decode("utf-8")

        secret = settings.SECRET_KEY.encode("utf-8")
        expected_signature = hmac.new(secret, url_bytes, hashlib.sha256).hexdigest()

        if not hmac.compare_digest(signature, expected_signature):
            return None

        return url
    except Exception:
        return None
