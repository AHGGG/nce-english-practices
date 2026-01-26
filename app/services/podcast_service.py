"""
Podcast Service.
Handles iTunes search, RSS feed parsing, subscriptions, and OPML import/export.

Uses the Shared Feed Model:
- PodcastFeed: Global feed metadata (no user_id)
- PodcastFeedSubscription: User <-> Feed many-to-many
- UserEpisodeState: User's playback position & finished status per episode
"""

import logging
import hashlib
from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple
from xml.etree import ElementTree as ET

import httpx
import feedparser

from sqlalchemy import select, func, and_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.podcast_orm import (
    PodcastFeed,
    PodcastFeedSubscription,
    PodcastEpisode,
    UserEpisodeState,
    PodcastListeningSession,
)

logger = logging.getLogger(__name__)

# iTunes Search API
ITUNES_SEARCH_URL = "https://itunes.apple.com/search"


class PodcastService:
    """Service for podcast management."""

    # --- Cache ---
    _trending_cache: Dict[str, Dict[str, Any]] = {}  # key -> {timestamp, data}
    CACHE_TTL = 12 * 3600  # 12 hours
    CACHE_SIZE = 100  # Safe limit for both V1 and V2 APIs (V2 fails at 200)

    # Categories for background refresh (ID only)
    CATEGORY_IDS = [
        "1301",
        "1303",
        "1304",
        "1305",
        "1309",
        "1310",
        "1311",
        "1314",
        "1315",
        "1316",
        "1318",
        "1321",
        "1323",
        "1324",
        "1325",
        "1482",
        "1483",
        "1484",
        "1486",
        "1487",
        "1488",
        "1489",
    ]

    # --- iTunes Search ---

    async def search_itunes(
        self,
        db: AsyncSession,
        query: str,
        user_id: Optional[str] = None,
        limit: int = 20,
        country: str = "US",
    ) -> List[Dict[str, Any]]:
        """
        Search podcasts via iTunes Search API.
        Returns a list of podcast results with rss_url, title, author, artwork,
        AND is_subscribed status if user_id and db are provided.
        """
        params = {
            "term": query,
            "media": "podcast",
            "entity": "podcast",
            "limit": limit,
            "country": country,
        }

        try:
            proxies = settings.PROXY_URL if settings.PROXY_URL else None
            async with httpx.AsyncClient(timeout=15.0, proxy=proxies) as client:
                response = await client.get(ITUNES_SEARCH_URL, params=params)
                response.raise_for_status()
                data = response.json()

            results = []
            rss_urls = []

            for item in data.get("results", []):
                rss_url = item.get("feedUrl")
                results.append(
                    {
                        "itunes_id": item.get("collectionId"),
                        "title": item.get("collectionName"),
                        "author": item.get("artistName"),
                        "rss_url": rss_url,
                        "artwork_url": item.get("artworkUrl600")
                        or item.get("artworkUrl100"),
                        "genre": item.get("primaryGenreName"),
                        "episode_count": item.get("trackCount"),
                        "is_subscribed": False,  # Default
                    }
                )
                if rss_url:
                    rss_urls.append(rss_url)

            # Enrich with subscription status if user_id is provided
            if user_id and rss_urls and db:
                # Find which of these RSS URLs are subscribed by the user
                stmt = (
                    select(PodcastFeed.rss_url)
                    .join(
                        PodcastFeedSubscription,
                        PodcastFeedSubscription.feed_id == PodcastFeed.id,
                    )
                    .where(
                        PodcastFeedSubscription.user_id == user_id,
                        PodcastFeed.rss_url.in_(rss_urls),
                    )
                )
                result = await db.execute(stmt)
                subscribed_urls = set(result.scalars().all())

                for r in results:
                    if r.get("rss_url") in subscribed_urls:
                        r["is_subscribed"] = True

            return results

        except Exception as e:
            logger.error(f"iTunes search failed: {e}")
            return []

    # --- Feed Parsing ---

    def _parse_duration(self, duration_str: Optional[str]) -> Optional[int]:
        """Parse iTunes duration string (HH:MM:SS or seconds) to total seconds."""
        if not duration_str:
            return None

        try:
            # If it's just a number, treat as seconds
            if duration_str.isdigit():
                return int(duration_str)

            # Parse HH:MM:SS or MM:SS
            parts = duration_str.split(":")
            if len(parts) == 3:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
            elif len(parts) == 2:
                return int(parts[0]) * 60 + int(parts[1])
            return None
        except (ValueError, TypeError):
            return None

    async def parse_feed(self, rss_url: str) -> Dict[str, Any]:
        """
        Fetch and parse an RSS feed.
        Returns feed metadata and list of episodes.
        """
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "Accept": "application/rss+xml, application/xml, application/atom+xml, text/xml;q=0.9, */*;q=0.8",
        }
        try:
            proxies = settings.PROXY_URL if settings.PROXY_URL else None
            content = None

            # Attempt 1: Standard compliant request
            try:
                # Use 45s timeout (safe margin below Nginx default 60s)
                async with httpx.AsyncClient(
                    timeout=45.0, follow_redirects=True, proxy=proxies
                ) as client:
                    response = await client.get(rss_url, headers=headers)
                    response.raise_for_status()
                    content = response.text
            except Exception as e:
                # Check if retryable (SSL, Timeout, or just connection issues common with proxies)
                is_ssl_error = (
                    "ssl" in str(e).lower() or "certificate" in str(e).lower()
                )
                is_conn_error = isinstance(
                    e,
                    (
                        httpx.ConnectError,
                        httpx.ReadTimeout,
                        httpx.ConnectTimeout,
                        httpx.NetworkError,
                    ),
                )

                # If using proxy, network errors are common, so we retry with verify=False might not help for network,
                # but sometimes it helps if the proxy itself has issues with strict SSL upstream.
                # However, usually verify=False is for the target server.

                if is_ssl_error or is_conn_error:
                    logger.warning(
                        f"Standard fetch failed for {rss_url}: {e}. Retrying with verify=False."
                    )
                    try:
                        # Attempt 2: Relaxed Security
                        async with httpx.AsyncClient(
                            timeout=45.0,
                            follow_redirects=True,
                            verify=False,
                            proxy=proxies,
                        ) as client:
                            response = await client.get(rss_url, headers=headers)
                            response.raise_for_status()
                            content = response.text
                    except Exception as e2:
                        logger.error(f"Fallback fetch failed for {rss_url}: {e2}")
                        raise ValueError(f"Failed to fetch feed: {e2}")
                else:
                    raise ValueError(f"Failed to fetch feed: {e}")

            feed = feedparser.parse(content)

            # Extract feed metadata
            feed_data = {
                "title": feed.feed.get("title", "Unknown Podcast"),
                "description": feed.feed.get("description")
                or feed.feed.get("subtitle"),
                "author": feed.feed.get("author") or feed.feed.get("itunes_author"),
                "image_url": None,
                "website_url": feed.feed.get("link"),
                "category": None,
            }

            # Try to get image from various sources
            if hasattr(feed.feed, "image") and feed.feed.image:
                feed_data["image_url"] = feed.feed.image.get("href")
            elif hasattr(feed.feed, "itunes_image"):
                feed_data["image_url"] = feed.feed.itunes_image.get("href")

            # Extract category (iTunes category often nested)
            if hasattr(feed.feed, "itunes_category"):
                # Handle single category or list
                cat = feed.feed.get("itunes_category")
                if isinstance(cat, dict):
                    feed_data["category"] = cat.get("text")
                elif isinstance(cat, list) and cat:
                    feed_data["category"] = (
                        cat[0].get("text") if isinstance(cat[0], dict) else str(cat[0])
                    )
            elif hasattr(feed.feed, "category"):
                feed_data["category"] = feed.feed.category

            # Extract episodes

            episodes = []
            for entry in feed.entries:
                # Find audio enclosure
                audio_url = None
                for link in entry.get("links", []):
                    if (
                        link.get("type", "").startswith("audio/")
                        or link.get("rel") == "enclosure"
                    ):
                        audio_url = link.get("href")
                        break

                # Also check enclosures list
                if not audio_url:
                    for enc in entry.get("enclosures", []):
                        if enc.get("type", "").startswith("audio/"):
                            audio_url = enc.get("href")
                            break

                if not audio_url:
                    continue  # Skip episodes without audio

                # Parse published date
                published_at = None
                if entry.get("published_parsed"):
                    try:
                        published_at = datetime(*entry.published_parsed[:6])
                    except Exception:
                        pass

                # Generate stable GUID
                guid = (
                    entry.get("id")
                    or entry.get("guid")
                    or hashlib.md5(audio_url.encode("utf-8")).hexdigest()
                )

                episodes.append(
                    {
                        "guid": guid,
                        "title": entry.get("title", "Untitled Episode"),
                        "description": entry.get("summary") or entry.get("description"),
                        "audio_url": audio_url,
                        "duration_seconds": self._parse_duration(
                            entry.get("itunes_duration")
                        ),
                        "image_url": entry.get("itunes_image", {}).get("href")
                        if isinstance(entry.get("itunes_image"), dict)
                        else None,
                        "published_at": published_at,
                    }
                )

            return {"feed": feed_data, "episodes": episodes}

        except Exception as e:
            logger.error(f"Feed parsing failed for {rss_url}: {e}")
            raise ValueError(f"Failed to parse feed: {e}")

    # --- Subscription Management (Shared Feed Model) ---

    async def get_or_create_feed(self, db: AsyncSession, rss_url: str) -> PodcastFeed:
        """
        Get existing feed or parse and create new one (Shared Feed Model).
        Does NOT create subscription.
        """
        # Check if feed exists globally
        stmt = select(PodcastFeed).where(PodcastFeed.rss_url == rss_url)
        result = await db.execute(stmt)
        feed = result.scalar_one_or_none()

        if not feed:
            # Parse the feed and create global record
            parsed = await self.parse_feed(rss_url)
            feed_data = parsed["feed"]
            episodes_data = parsed["episodes"]

            feed = PodcastFeed(
                rss_url=rss_url,
                title=feed_data["title"],
                description=feed_data["description"],
                author=feed_data["author"],
                image_url=feed_data["image_url"],
                website_url=feed_data["website_url"],
                category=feed_data["category"],
                last_fetched_at=datetime.utcnow(),
            )
            db.add(feed)
            await db.flush()  # Get feed.id

            # Add episodes
            for ep_data in episodes_data:
                episode = PodcastEpisode(
                    feed_id=feed.id,
                    guid=ep_data["guid"],
                    title=ep_data["title"],
                    description=ep_data["description"],
                    audio_url=ep_data["audio_url"],
                    duration_seconds=ep_data["duration_seconds"],
                    image_url=ep_data["image_url"],
                    published_at=ep_data["published_at"],
                )
                db.add(episode)

        return feed

    async def subscribe(
        self, db: AsyncSession, user_id: str, rss_url: str
    ) -> Tuple[PodcastFeed, bool]:
        """
        Subscribe to a podcast feed.
        Uses the Shared Feed Model:
        1. Get or create the global PodcastFeed
        2. Create a PodcastFeedSubscription for the user
        Returns (feed, is_new_subscription)
        """
        feed = await self.get_or_create_feed(db, rss_url)

        # Check if user is already subscribed
        sub_stmt = select(PodcastFeedSubscription).where(
            PodcastFeedSubscription.user_id == user_id,
            PodcastFeedSubscription.feed_id == feed.id,
        )
        sub_result = await db.execute(sub_stmt)
        existing_sub = sub_result.scalar_one_or_none()

        if existing_sub:
            # Already subscribed
            return feed, False

        # Create subscription
        subscription = PodcastFeedSubscription(
            user_id=user_id,
            feed_id=feed.id,
        )
        db.add(subscription)

        await db.commit()
        await db.refresh(feed)
        return feed, True

    async def preview_feed(self, db: AsyncSession, rss_url: str) -> PodcastFeed:
        """
        Preview a feed (fetch and store, but don't subscribe).
        Returns the feed object.
        """
        feed = await self.get_or_create_feed(db, rss_url)
        await db.commit()
        await db.refresh(feed)
        return feed

    async def unsubscribe(self, db: AsyncSession, user_id: str, feed_id: int) -> bool:
        """Remove user's subscription to a feed."""
        stmt = select(PodcastFeedSubscription).where(
            PodcastFeedSubscription.feed_id == feed_id,
            PodcastFeedSubscription.user_id == user_id,
        )
        result = await db.execute(stmt)
        subscription = result.scalar_one_or_none()

        if not subscription:
            return False

        await db.delete(subscription)
        await db.commit()
        return True

    async def get_subscriptions(
        self, db: AsyncSession, user_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get all feeds that user is subscribed to, with episode counts.
        Optimized to use a single query instead of N+1.
        """
        stmt = (
            select(PodcastFeed, func.count(PodcastEpisode.id).label("episode_count"))
            .join(
                PodcastFeedSubscription,
                PodcastFeedSubscription.feed_id == PodcastFeed.id,
            )
            .outerjoin(PodcastEpisode, PodcastEpisode.feed_id == PodcastFeed.id)
            .where(PodcastFeedSubscription.user_id == user_id)
            .group_by(PodcastFeed.id)
            .order_by(PodcastFeed.title)
        )

        result = await db.execute(stmt)
        rows = result.all()

        subscriptions = []
        for feed, count in rows:
            # Create a dict merging feed data with episode count
            feed_dict = {
                "id": feed.id,
                "title": feed.title,
                "description": feed.description,
                "author": feed.author,
                "image_url": feed.image_url,
                "rss_url": feed.rss_url,
                "episode_count": count,
            }
            subscriptions.append(feed_dict)

        return subscriptions

    async def get_episodes_batch(
        self, db: AsyncSession, user_id: str, episode_ids: List[int]
    ) -> List[Dict[str, Any]]:
        """
        Get details for multiple episodes by ID.
        Includes user state (playback position).
        Used for downloads page to fetch metadata efficiently.
        """
        if not episode_ids:
            return []

        stmt = (
            select(PodcastEpisode, PodcastFeed, UserEpisodeState)
            .join(PodcastFeed, PodcastEpisode.feed_id == PodcastFeed.id)
            .outerjoin(
                UserEpisodeState,
                and_(
                    UserEpisodeState.episode_id == PodcastEpisode.id,
                    UserEpisodeState.user_id == user_id,
                ),
            )
            .where(PodcastEpisode.id.in_(episode_ids))
        )

        result = await db.execute(stmt)
        rows = result.all()

        episodes = []
        for episode, feed, state in rows:
            ep_dict = {
                "episode": {
                    "id": episode.id,
                    "guid": episode.guid,
                    "title": episode.title,
                    "description": episode.description,
                    "audio_url": episode.audio_url,
                    "duration_seconds": episode.duration_seconds,
                    "image_url": episode.image_url,
                    "published_at": episode.published_at.isoformat()
                    if episode.published_at
                    else None,
                    "transcript_status": episode.transcript_status,
                    "current_position": state.current_position_seconds
                    if state
                    else 0.0,
                    "is_finished": state.is_finished if state else False,
                },
                "feed": {
                    "id": feed.id,
                    "title": feed.title,
                    "image_url": feed.image_url,
                },
                "last_position_seconds": state.current_position_seconds
                if state
                else 0.0,
            }
            episodes.append(ep_dict)

        return episodes

    async def get_feed_with_episodes(
        self,
        db: AsyncSession,
        user_id: str,
        feed_id: int,
        limit: int = 50,
        offset: int = 0,
    ) -> Optional[Dict[str, Any]]:
        """
        Get a feed with its episodes (paginated).
        Returns feed details, subscription status, and episodes with user state.
        """
        # Check if user is subscribed
        sub_stmt = select(PodcastFeedSubscription).where(
            PodcastFeedSubscription.feed_id == feed_id,
            PodcastFeedSubscription.user_id == user_id,
        )
        sub_result = await db.execute(sub_stmt)
        is_subscribed = sub_result.scalar_one_or_none() is not None

        # Get feed
        feed_stmt = select(PodcastFeed).where(PodcastFeed.id == feed_id)
        feed_result = await db.execute(feed_stmt)
        feed = feed_result.scalar_one_or_none()

        if not feed:
            return None

        # Get total episode count
        count_stmt = select(func.count(PodcastEpisode.id)).where(
            PodcastEpisode.feed_id == feed_id
        )
        count_result = await db.execute(count_stmt)
        total_episodes = count_result.scalar_one()

        # Get episodes with user states (Paginated)
        ep_stmt = (
            select(PodcastEpisode, UserEpisodeState)
            .outerjoin(
                UserEpisodeState,
                and_(
                    UserEpisodeState.episode_id == PodcastEpisode.id,
                    UserEpisodeState.user_id == user_id,
                ),
            )
            .where(PodcastEpisode.feed_id == feed_id)
            .order_by(PodcastEpisode.published_at.desc())
            .limit(limit)
            .offset(offset)
        )
        ep_result = await db.execute(ep_stmt)
        rows = ep_result.all()

        episodes = []
        for episode, state in rows:
            ep_dict = {
                "id": episode.id,
                "guid": episode.guid,
                "title": episode.title,
                "description": episode.description,
                "audio_url": episode.audio_url,
                "duration_seconds": episode.duration_seconds,
                "image_url": episode.image_url,
                "published_at": episode.published_at.isoformat()
                if episode.published_at
                else None,
                "transcript_status": episode.transcript_status,
                # User state
                "current_position": state.current_position_seconds if state else 0.0,
                "is_finished": state.is_finished if state else False,
            }
            episodes.append(ep_dict)

        return {
            "feed": feed,
            "is_subscribed": is_subscribed,
            "episodes": episodes,
            "total_episodes": total_episodes,
        }

    # --- Trending / Top Charts ---

    async def start_cache_refresher(self, initial_delay: int = 0):
        """Background task to refresh trending cache every 12 hours."""
        import asyncio

        if initial_delay > 0:
            logger.info(
                f"Podcast cache refresher: Waiting {initial_delay}s before first run..."
            )
            await asyncio.sleep(initial_delay)

        while True:
            try:
                logger.info(
                    f"Starting trending podcast cache refresh (Limit: {self.CACHE_SIZE})..."
                )
                await self.refresh_trending_cache()
                logger.info("Trending podcast cache refresh complete.")
            except Exception as e:
                logger.error(f"Error refreshing trending cache: {e}")

            # Sleep 12 hours
            await asyncio.sleep(12 * 3600)

    async def refresh_trending_cache(self):
        """Force refresh of all trending categories."""
        # Global
        await self._fetch_trending_upstream(
            category_id=None, limit=self.CACHE_SIZE, force_refresh=True
        )
        # Categories
        for cat_id in self.CATEGORY_IDS:
            # Add a small delay to be nice to the API
            import asyncio

            await asyncio.sleep(1.0)
            await self._fetch_trending_upstream(
                category_id=cat_id, limit=self.CACHE_SIZE, force_refresh=True
            )

    async def _fetch_trending_upstream(
        self,
        category_id: Optional[str] = None,
        limit: int = 20,
        force_refresh: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Fetch trending podcasts from upstream API (V1 for Genre, V2 for Top).
        Handles caching and slices results if larger cache exists.
        Returns raw list of results (without subscription status).
        """
        # Cache key is just the category (we store the 'max' version)
        cache_key = str(category_id) if category_id else "global"
        now = datetime.utcnow()

        # Check cache (if not forcing refresh)
        if not force_refresh and cache_key in self._trending_cache:
            entry = self._trending_cache[cache_key]
            # If cache is valid AND has enough items
            if (now - entry["timestamp"]).total_seconds() < self.CACHE_TTL:
                cached_data = entry["data"]
                if len(cached_data) >= limit:
                    return cached_data[:limit]
                # If we need more than cached, strictly speaking we should fetch,
                # but falling back to what we have might be acceptable behavior in some cases.
                # For now, let's fetch upstream if we need more than we have.

        proxies = settings.PROXY_URL if settings.PROXY_URL else None
        results = []

        try:
            if category_id and str(category_id).isdigit():
                # Use V1 API for Genre Filtering (V2 param is unreliable)
                # https://itunes.apple.com/us/rss/toppodcasts/limit=X/genre=Y/json
                url = f"https://itunes.apple.com/us/rss/toppodcasts/limit={limit}/genre={category_id}/json"

                async with httpx.AsyncClient(
                    timeout=15.0, proxy=proxies, follow_redirects=True, verify=False
                ) as client:
                    response = await client.get(url)
                    response.raise_for_status()
                    data = response.json()

                # Parse V1 Response
                feed = data.get("feed", {})
                entries = feed.get("entry", [])

                # Handle single entry edge case (dict instead of list)
                if isinstance(entries, dict):
                    entries = [entries]

                for entry in entries:
                    try:
                        # Safe extraction with defaults
                        im_name = entry.get("im:name", {})
                        title = (
                            im_name.get("label")
                            if isinstance(im_name, dict)
                            else im_name
                        )

                        im_artist = entry.get("im:artist", {})
                        author = (
                            im_artist.get("label")
                            if isinstance(im_artist, dict)
                            else im_artist
                        )

                        # Images: get the last one (largest)
                        images = entry.get("im:image", [])
                        artwork_url = None
                        if images and isinstance(images, list):
                            last_img = images[-1]
                            artwork_url = (
                                last_img.get("label")
                                if isinstance(last_img, dict)
                                else last_img
                            )

                        # ID
                        id_node = entry.get("id", {})
                        itunes_id = id_node.get("attributes", {}).get("im:id")

                        # Genre
                        cat_node = entry.get("category", {})
                        genre = cat_node.get("attributes", {}).get("label")

                        if itunes_id:
                            results.append(
                                {
                                    "itunes_id": itunes_id,
                                    "title": title,
                                    "author": author,
                                    "rss_url": None,  # V1 doesn't provide RSS URL
                                    "artwork_url": artwork_url,
                                    "genre": genre,
                                    "is_subscribed": False,
                                }
                            )
                    except Exception as e:
                        logger.warning(f"Failed to parse V1 entry: {e}")
                        continue

            else:
                # Use V2 API for Global Top Charts
                # https://rss.applemarketingtools.com/api/v2/us/podcasts/top/{limit}/podcasts.json
                url = f"https://rss.applemarketingtools.com/api/v2/us/podcasts/top/{limit}/podcasts.json"

                async with httpx.AsyncClient(
                    timeout=10.0, proxy=proxies, follow_redirects=True, verify=False
                ) as client:
                    response = await client.get(url)
                    response.raise_for_status()
                    data = response.json()

                feed = data.get("feed", {})
                for item in feed.get("results", []):
                    genres = item.get("genres", [])
                    primary_genre = genres[0].get("name") if genres else None

                    results.append(
                        {
                            "itunes_id": item.get("id"),
                            "title": item.get("name"),
                            "author": item.get("artistName"),
                            "rss_url": None,
                            "artwork_url": item.get("artworkUrl100"),
                            "genre": primary_genre,
                            "is_subscribed": False,
                        }
                    )

            # Common: Lookup RSS URLs for all results
            # Both V1 and V2 Top Charts APIs often omit the direct RSS feed URL.
            # We must lookup by ID to get the feedUrl.
            if results:
                ids = [r["itunes_id"] for r in results if r.get("itunes_id")]
                if ids:
                    # Batch lookup (iTunes allows ~200 IDs per request, but let's be safe with 150)
                    chunk_size = 150
                    id_map = {}

                    for i in range(0, len(ids), chunk_size):
                        chunk = ids[i : i + chunk_size]
                        ids_str = ",".join(chunk)
                        lookup_url = f"https://itunes.apple.com/lookup?id={ids_str}"

                        try:
                            async with httpx.AsyncClient(
                                timeout=20.0, proxy=proxies, verify=False
                            ) as client:
                                l_res = await client.get(lookup_url)
                                if l_res.status_code == 200:
                                    l_data = l_res.json()
                                    # Merge into main map
                                    for item in l_data.get("results", []):
                                        c_id = str(item.get("collectionId"))
                                        if item.get("feedUrl"):
                                            id_map[c_id] = item.get("feedUrl")
                        except Exception as e:
                            logger.warning(f"Failed to lookup feed URLs batch {i}: {e}")

                    # Update results from map
                    for r in results:
                        if r.get("itunes_id") in id_map:
                            r["rss_url"] = id_map[r.get("itunes_id")]

            # Update Cache
            # Only update cache if we fetched a significant amount (e.g. >= 20)
            # This prevents a small ad-hoc query from overwriting a large background cache
            if limit >= 20:
                self._trending_cache[cache_key] = {"timestamp": now, "data": results}

            return results

        except Exception as e:
            logger.error(f"Trending fetch failed: {e}")
            # Return stale cache if available?
            # Return slice of cache if it exists, even if stale or smaller?
            if cache_key in self._trending_cache:
                cached = self._trending_cache[cache_key]["data"]
                return cached[:limit]
            return []

    async def get_trending_podcasts(
        self,
        db: AsyncSession,
        user_id: Optional[str] = None,
        category_id: Optional[str] = None,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        """
        Get trending podcasts.
        """
        # Fetch raw data (cached)
        results = await self._fetch_trending_upstream(category_id, limit)

        # Deep copy to avoid modifying cache when adding is_subscribed
        # or just create new list of dicts
        final_results = [r.copy() for r in results]

        # Enrich with subscription status if user_id is provided
        if user_id and db and final_results:
            rss_urls = [r["rss_url"] for r in final_results if r.get("rss_url")]
            if rss_urls:
                try:
                    stmt = (
                        select(PodcastFeed.rss_url)
                        .join(
                            PodcastFeedSubscription,
                            PodcastFeedSubscription.feed_id == PodcastFeed.id,
                        )
                        .where(
                            PodcastFeedSubscription.user_id == user_id,
                            PodcastFeed.rss_url.in_(rss_urls),
                        )
                    )
                    result = await db.execute(stmt)
                    subscribed_urls = set(result.scalars().all())

                    for r in final_results:
                        if r.get("rss_url") in subscribed_urls:
                            r["is_subscribed"] = True
                except Exception as e:
                    logger.error(f"Failed to check subscription status: {e}")

        return final_results

    async def refresh_feed(self, db: AsyncSession, user_id: str, feed_id: int) -> int:
        """
        Refresh a feed to check for new episodes.
        Returns the number of new episodes added.
        """
        # Verify user is subscribed
        sub_stmt = select(PodcastFeedSubscription).where(
            PodcastFeedSubscription.feed_id == feed_id,
            PodcastFeedSubscription.user_id == user_id,
        )
        sub_result = await db.execute(sub_stmt)
        if not sub_result.scalar_one_or_none():
            return 0

        # Get feed
        stmt = select(PodcastFeed).where(PodcastFeed.id == feed_id)
        result = await db.execute(stmt)
        feed = result.scalar_one_or_none()

        if not feed:
            return 0

        # Parse the feed again
        parsed = await self.parse_feed(feed.rss_url)
        episodes_data = parsed["episodes"]

        # Get existing GUIDs
        guid_stmt = select(PodcastEpisode.guid).where(PodcastEpisode.feed_id == feed_id)
        guid_result = await db.execute(guid_stmt)
        existing_guids = set(guid_result.scalars().all())

        # Add new episodes
        new_count = 0
        for ep_data in episodes_data:
            if ep_data["guid"] not in existing_guids:
                episode = PodcastEpisode(
                    feed_id=feed.id,
                    guid=ep_data["guid"],
                    title=ep_data["title"],
                    description=ep_data["description"],
                    audio_url=ep_data["audio_url"],
                    duration_seconds=ep_data["duration_seconds"],
                    image_url=ep_data["image_url"],
                    published_at=ep_data["published_at"],
                )
                db.add(episode)
                new_count += 1

        feed.last_fetched_at = datetime.utcnow()
        await db.commit()
        return new_count

    # --- OPML Import/Export ---

    def parse_opml(self, opml_content: str) -> List[Dict[str, str]]:
        """
        Parse OPML file content and extract podcast feeds.
        Returns list of {title, rss_url}.
        """
        feeds = []
        try:
            root = ET.fromstring(opml_content)
            for outline in root.iter("outline"):
                xml_url = outline.get("xmlUrl")
                if xml_url:
                    feeds.append(
                        {
                            "title": outline.get("text")
                            or outline.get("title")
                            or "Unknown",
                            "rss_url": xml_url,
                        }
                    )
        except ET.ParseError as e:
            logger.error(f"OPML parse error: {e}")
            raise ValueError(f"Invalid OPML format: {e}")

        return feeds

    async def import_opml(
        self, db: AsyncSession, user_id: str, opml_content: str
    ) -> Dict[str, Any]:
        """
        Import podcasts from OPML file.
        Returns summary of imported/skipped feeds.
        """
        feeds = self.parse_opml(opml_content)

        imported = 0
        skipped = 0
        errors = []

        for feed_info in feeds:
            try:
                # We can safely discard the return value here as we just want to subscribe
                await self.subscribe(db, user_id, feed_info["rss_url"])
                imported += 1
            except Exception as e:
                errors.append(
                    {
                        "title": feed_info["title"],
                        "error": str(e),
                        "rss_url": feed_info["rss_url"],
                    }
                )
                skipped += 1

        return {
            "total": len(feeds),
            "imported": imported,
            "skipped": skipped,
            "errors": errors,
        }

    async def export_opml(self, db: AsyncSession, user_id: str) -> str:
        """Generate OPML file content from user's subscriptions."""
        feeds = await self.get_subscriptions(db, user_id)

        root = ET.Element("opml", version="2.0")
        head = ET.SubElement(root, "head")
        title = ET.SubElement(head, "title")
        title.text = "Podcast Subscriptions"

        body = ET.SubElement(root, "body")
        for feed in feeds:
            ET.SubElement(
                body,
                "outline",
                type="rss",
                text=feed.title,
                title=feed.title,
                xmlUrl=feed.rss_url,
            )

        return ET.tostring(root, encoding="unicode", xml_declaration=True)

    # --- User Episode State (Resume Playback) ---

    async def update_episode_state(
        self,
        db: AsyncSession,
        user_id: str,
        episode_id: int,
        position: float,
        is_finished: bool = False,
    ) -> UserEpisodeState:
        """
        Update or create user's episode state (UPSERT).
        Used for resume playback functionality.
        """
        stmt = pg_insert(UserEpisodeState).values(
            user_id=user_id,
            episode_id=episode_id,
            current_position_seconds=position,
            is_finished=is_finished,
            listened_at=datetime.utcnow(),
        )
        stmt = stmt.on_conflict_do_update(
            constraint="uq_user_episode_state",
            set_={
                "current_position_seconds": position,
                # Make is_finished sticky: once true, stays true (unless we add specific un-finish logic later)
                # This prevents playback updates (is_finished=False) from overwriting "Played" status
                "is_finished": func.greatest(
                    UserEpisodeState.is_finished, stmt.excluded.is_finished
                ),
                "listened_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            },
        )
        await db.execute(stmt)
        await db.commit()

        # Return the state
        state_stmt = select(UserEpisodeState).where(
            UserEpisodeState.user_id == user_id,
            UserEpisodeState.episode_id == episode_id,
        )
        result = await db.execute(state_stmt)
        return result.scalar_one()

    async def get_episode_state(
        self, db: AsyncSession, user_id: str, episode_id: int
    ) -> Optional[UserEpisodeState]:
        """Get user's episode state for resume."""
        stmt = select(UserEpisodeState).where(
            UserEpisodeState.user_id == user_id,
            UserEpisodeState.episode_id == episode_id,
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_last_position(
        self, db: AsyncSession, user_id: str, episode_id: int
    ) -> float:
        """Get the last playback position for resume."""
        state = await self.get_episode_state(db, user_id, episode_id)
        return state.current_position_seconds if state else 0.0

    # --- Listening Session (Analytics) ---

    async def start_listening_session(
        self, db: AsyncSession, user_id: str, episode_id: int
    ) -> PodcastListeningSession:
        """Start a new listening session."""
        session = PodcastListeningSession(
            user_id=user_id,
            episode_id=episode_id,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return session

    async def update_listening_session(
        self,
        db: AsyncSession,
        session_id: int,
        total_listened_seconds: int,
        last_position_seconds: float,
        is_finished: bool = False,
    ) -> Optional[PodcastListeningSession]:
        """Update listening session with progress."""
        stmt = select(PodcastListeningSession).where(
            PodcastListeningSession.id == session_id
        )
        result = await db.execute(stmt)
        session = result.scalar_one_or_none()

        if not session:
            return None

        session.total_listened_seconds = total_listened_seconds
        session.last_position_seconds = last_position_seconds
        await db.commit()
        await db.refresh(session)

        # Also update user episode state
        await self.update_episode_state(
            db,
            session.user_id,
            session.episode_id,
            last_position_seconds,
            is_finished=is_finished,
        )

        return session

    async def end_listening_session(
        self,
        db: AsyncSession,
        session_id: int,
        total_listened_seconds: int,
        last_position_seconds: float,
        is_finished: bool = False,
    ) -> Optional[PodcastListeningSession]:
        """End a listening session."""
        stmt = select(PodcastListeningSession).where(
            PodcastListeningSession.id == session_id
        )
        result = await db.execute(stmt)
        session = result.scalar_one_or_none()

        if not session:
            return None

        session.ended_at = datetime.utcnow()
        session.total_listened_seconds = total_listened_seconds
        session.last_position_seconds = last_position_seconds
        await db.commit()
        await db.refresh(session)

        # Also update user episode state
        await self.update_episode_state(
            db,
            session.user_id,
            session.episode_id,
            last_position_seconds,
            is_finished=is_finished,
        )

        return session

    async def get_recently_played(
        self, db: AsyncSession, user_id: str, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get recently played episodes with their last position.
        Based on UserEpisodeState.listened_at (most recent first).
        """
        stmt = (
            select(PodcastEpisode, PodcastFeed, UserEpisodeState)
            .join(PodcastFeed, PodcastEpisode.feed_id == PodcastFeed.id)
            .join(UserEpisodeState, UserEpisodeState.episode_id == PodcastEpisode.id)
            .where(
                UserEpisodeState.user_id == user_id,
                UserEpisodeState.is_finished == False,  # noqa: E712
            )
            .order_by(UserEpisodeState.listened_at.desc())
            .limit(limit)
        )

        result = await db.execute(stmt)
        rows = result.all()

        recently_played = []
        for episode, feed, state in rows:
            recently_played.append(
                {
                    "episode": {
                        "id": episode.id,
                        "title": episode.title,
                        "audio_url": episode.audio_url,
                        "duration_seconds": episode.duration_seconds,
                        "image_url": episode.image_url,
                    },
                    "feed": {
                        "id": feed.id,
                        "title": feed.title,
                        "image_url": feed.image_url,
                    },
                    "last_position_seconds": state.current_position_seconds,
                    "last_played_at": state.listened_at.isoformat()
                    if state.listened_at
                    else None,
                }
            )

        return recently_played


# Global singleton
podcast_service = PodcastService()
