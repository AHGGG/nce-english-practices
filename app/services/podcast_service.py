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

    # --- iTunes Search ---

    async def search_itunes(
        self, query: str, limit: int = 20, country: str = "US"
    ) -> List[Dict[str, Any]]:
        """
        Search podcasts via iTunes Search API.
        Returns a list of podcast results with rss_url, title, author, artwork.
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
            for item in data.get("results", []):
                results.append(
                    {
                        "itunes_id": item.get("collectionId"),
                        "title": item.get("collectionName"),
                        "author": item.get("artistName"),
                        "rss_url": item.get("feedUrl"),
                        "artwork_url": item.get("artworkUrl600")
                        or item.get("artworkUrl100"),
                        "genre": item.get("primaryGenreName"),
                        "episode_count": item.get("trackCount"),
                    }
                )
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
            }

            # Try to get image from various sources
            if hasattr(feed.feed, "image") and feed.feed.image:
                feed_data["image_url"] = feed.feed.image.get("href")
            elif hasattr(feed.feed, "itunes_image"):
                feed_data["image_url"] = feed.feed.itunes_image.get("href")

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
    ) -> List[PodcastFeed]:
        """Get all feeds that user is subscribed to."""
        stmt = (
            select(PodcastFeed)
            .join(
                PodcastFeedSubscription,
                PodcastFeedSubscription.feed_id == PodcastFeed.id,
            )
            .where(PodcastFeedSubscription.user_id == user_id)
            .order_by(PodcastFeed.title)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_feed_with_episodes(
        self, db: AsyncSession, user_id: str, feed_id: int
    ) -> Optional[Dict[str, Any]]:
        """Get a feed with its episodes (only if user is subscribed)."""
        # Verify user is subscribed
        sub_stmt = select(PodcastFeedSubscription).where(
            PodcastFeedSubscription.feed_id == feed_id,
            PodcastFeedSubscription.user_id == user_id,
        )
        sub_result = await db.execute(sub_stmt)
        if not sub_result.scalar_one_or_none():
            return None

        # Get feed
        feed_stmt = select(PodcastFeed).where(PodcastFeed.id == feed_id)
        feed_result = await db.execute(feed_stmt)
        feed = feed_result.scalar_one_or_none()

        if not feed:
            return None

        # Get episodes with user states
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
            "episodes": episodes,
        }

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
                "is_finished": is_finished,
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
