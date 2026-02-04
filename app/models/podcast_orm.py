"""
Podcast ORM Models.
Stores podcast feeds, episodes, subscriptions, user states, and listening sessions.

Schema Design (2026-01-22):
- PodcastFeed: Global feed metadata (no user_id)
- PodcastFeedSubscription: User <-> Feed many-to-many
- PodcastEpisode: Episodes belong to Feed
- UserEpisodeState: User's playback position & finished status per episode
- PodcastListeningSession: Analytics logs for listening history
"""

from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    String,
    Integer,
    Text,
    Boolean,
    TIMESTAMP,
    ForeignKey,
    Index,
    Float,
    UniqueConstraint,
    JSON,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.db import Base


class PodcastFeed(Base):
    """
    A podcast feed (RSS). Shared across all users.
    """

    __tablename__ = "podcast_feeds"
    __table_args__ = (Index("idx_podcast_feed_url", "rss_url"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Feed metadata
    rss_url: Mapped[str] = mapped_column(Text, unique=True)
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    author: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    website_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    itunes_id: Mapped[Optional[int]] = mapped_column(
        Integer, unique=True, nullable=True
    )

    # Cache control

    etag: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    last_fetched_at: Mapped[Optional[datetime]] = mapped_column(
        TIMESTAMP, nullable=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    episodes: Mapped[List["PodcastEpisode"]] = relationship(
        "PodcastEpisode", back_populates="feed", cascade="all, delete-orphan"
    )
    subscriptions: Mapped[List["PodcastFeedSubscription"]] = relationship(
        "PodcastFeedSubscription", back_populates="feed", cascade="all, delete-orphan"
    )


class PodcastFeedSubscription(Base):
    """
    User subscription to a podcast feed.
    Many-to-many relationship between User and Feed.
    """

    __tablename__ = "podcast_feed_subscriptions"
    __table_args__ = (Index("idx_pfs_user", "user_id"),)

    user_id: Mapped[str] = mapped_column(Text, primary_key=True)
    feed_id: Mapped[int] = mapped_column(
        ForeignKey("podcast_feeds.id"), primary_key=True
    )
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())

    # Relationships
    feed: Mapped["PodcastFeed"] = relationship(
        "PodcastFeed", back_populates="subscriptions"
    )


class PodcastEpisode(Base):
    """
    A single episode within a podcast feed.
    """

    __tablename__ = "podcast_episodes"
    __table_args__ = (
        Index("idx_podcast_episode_feed", "feed_id"),
        Index("idx_podcast_episode_guid", "guid"),
        Index("idx_podcast_episode_pub", "published_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    feed_id: Mapped[int] = mapped_column(ForeignKey("podcast_feeds.id"))

    # Episode metadata
    guid: Mapped[str] = mapped_column(Text)  # Unique ID from RSS
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    audio_url: Mapped[str] = mapped_column(Text)
    file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # Bytes
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    chapters: Mapped[Optional[List[dict]]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=True
    )
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)

    # Transcription (On-Demand)
    transcript_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    transcript_status: Mapped[str] = mapped_column(
        String(20), default="none"
    )  # none, pending, completed, failed

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())

    # Relationships
    feed: Mapped["PodcastFeed"] = relationship("PodcastFeed", back_populates="episodes")
    user_states: Mapped[List["UserEpisodeState"]] = relationship(
        "UserEpisodeState", back_populates="episode", cascade="all, delete-orphan"
    )
    listening_sessions: Mapped[List["PodcastListeningSession"]] = relationship(
        "PodcastListeningSession",
        back_populates="episode",
        cascade="all, delete-orphan",
    )


class UserEpisodeState(Base):
    """
    User's playback state for an episode.
    Used for resume playback and "recently played" feature.
    """

    __tablename__ = "user_episode_states"
    __table_args__ = (
        UniqueConstraint("user_id", "episode_id", name="uq_user_episode_state"),
        Index("idx_ues_user_listened", "user_id", "listened_at"),
        Index("ix_user_episode_device", "user_id", "episode_id", "device_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(Text)
    episode_id: Mapped[int] = mapped_column(ForeignKey("podcast_episodes.id"))

    # Playback state
    current_position_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    is_finished: Mapped[bool] = mapped_column(Boolean, default=False)

    # Device awareness
    device_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    device_type: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )  # 'web', 'ios', 'android'

    # Sync metadata
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)
    local_version: Mapped[int] = mapped_column(Integer, default=0)

    # Playback context
    playback_rate: Mapped[float] = mapped_column(Float, default=1.0)

    # Timestamps
    listened_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now()
    )  # For "Recently Played" sorting
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    episode: Mapped["PodcastEpisode"] = relationship(
        "PodcastEpisode", back_populates="user_states"
    )


class PodcastListeningSession(Base):
    """
    Tracks listening sessions for performance metrics and analytics.
    Similar to ReadingSession and VoiceSession.
    """

    __tablename__ = "podcast_listening_sessions"
    __table_args__ = (Index("idx_pls_user_started", "user_id", "started_at"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(Text)
    episode_id: Mapped[int] = mapped_column(ForeignKey("podcast_episodes.id"))

    # Session timing
    started_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    ended_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)
    total_listened_seconds: Mapped[int] = mapped_column(Integer, default=0)

    # Playback position at end of session
    last_position_seconds: Mapped[float] = mapped_column(Float, default=0.0)

    # Relationships
    episode: Mapped["PodcastEpisode"] = relationship(
        "PodcastEpisode", back_populates="listening_sessions"
    )
