from datetime import datetime
from typing import List, Optional
from sqlalchemy import Integer, Text, Boolean, TIMESTAMP, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.core.db import Base


class VoiceSession(Base):
    """
    Tracks voice learning sessions in VoiceMode/NegotiationInterface.
    Similar to ReadingSession but for voice practice.
    """

    __tablename__ = "voice_sessions"
    __table_args__ = (Index("idx_vs_user_started", "user_id", "started_at"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(Text, default="default_user")

    # Session timing
    started_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    ended_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)
    total_active_seconds: Mapped[int] = mapped_column(Integer, default=0)

    # Content source (if studying from specific content)
    source_type: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # epub, rss, wordbook
    source_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Interaction metrics
    word_lookup_count: Mapped[int] = mapped_column(
        Integer, default=0
    )  # HUH? button clicks
    words_looked_up: Mapped[List[str]] = mapped_column(JSON, default=list)
    got_it_count: Mapped[int] = mapped_column(
        Integer, default=0
    )  # Got It button clicks
    example_navigation_count: Mapped[int] = mapped_column(
        Integer, default=0
    )  # Arrow navigation

    # Audio metrics
    audio_play_count: Mapped[int] = mapped_column(Integer, default=0)  # TTS plays

    # Session state
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class WordProficiency(Base):
    """
    Tracks word-level proficiency for the Voice CI Interface.
    Records HUH? events and calculates difficulty based on interaction history.
    """

    __tablename__ = "word_proficiency"
    __table_args__ = (
        Index("idx_proficiency_user_word", "user_id", "word"),
        Index("idx_proficiency_difficulty", "difficulty_score"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(Text, default="default_user")
    word: Mapped[str] = mapped_column(Text, index=True)

    # Interaction stats
    exposure_count: Mapped[int] = mapped_column(
        Integer, default=0
    )  # How many times encountered
    huh_count: Mapped[int] = mapped_column(
        Integer, default=0
    )  # How many times HUH? was clicked
    continue_count: Mapped[int] = mapped_column(
        Integer, default=0
    )  # How many times CONTINUE was clicked

    # Calculated metrics
    difficulty_score: Mapped[float] = mapped_column(
        Integer, default=0.0
    )  # huh_count / exposure_count
    status: Mapped[str] = mapped_column(
        Text, default="new"
    )  # new / learning / mastered

    # Timestamps
    first_seen_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now()
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now()
    )
