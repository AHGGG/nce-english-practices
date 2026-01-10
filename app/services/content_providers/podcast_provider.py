from typing import Any
from app.models.content_schemas import ContentBundle, ContentSentence, SourceType
from app.services.content_providers.rss_provider import RssProvider


class PodcastProvider(RssProvider):
    """
    Provider for Podcast RSS Feeds.
    Inherits from RssProvider to reuse sentence extraction logic and caching.
    """

    @property
    def source_type(self) -> SourceType:
        return SourceType.PODCAST

    def _extract_audio_url(self, entry: Any) -> str:
        """Find the first audio enclosure."""
        for link in entry.get("links", []):
            if (
                link.get("type", "").startswith("audio/")
                or link.get("rel") == "enclosure"
            ):
                return link.get("href")
        return None

    async def fetch(
        self, feed_url: str, episode_index: int = 0, **kwargs: Any
    ) -> ContentBundle:
        """
        Fetch a specific podcast episode.
        """
        # Use inherited cached fetcher
        feed = await self._get_feed(feed_url)

        if not feed.entries:
            raise ValueError(f"No episodes found in Podcast feed: {feed_url}")

        if episode_index < 0 or episode_index >= len(feed.entries):
            raise IndexError(
                f"Episode index {episode_index} out of range (Total: {len(feed.entries)})"
            )

        entry = feed.entries[episode_index]
        audio_url = self._extract_audio_url(entry)

        # Extract sentences from Show Notes / Description
        description = (
            entry.get("summary", "")
            or entry.get("description", "")
            or entry.get("content", [{}])[0].get("value", "")
        )

        # Use inherited _extract_sentences
        sentences = self._extract_sentences(description)

        content_sentences = [ContentSentence(text=s) for s in sentences]

        import hashlib

        entry_hash = (
            hashlib.md5(entry.link.encode("utf-8")).hexdigest()
            if entry.get("link")
            else "no_link"
        )

        return ContentBundle(
            id=f"podcast:{entry_hash}",
            source_type=SourceType.PODCAST,
            title=entry.title,
            sentences=content_sentences,
            audio_url=audio_url,
            source_url=entry.link,
            metadata={
                "podcast_title": feed.feed.get("title", ""),
                "episode_index": episode_index,
                "total_episodes": len(feed.entries),
                "duration": entry.get("itunes_duration", "unknown"),
            },
        )
