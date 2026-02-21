from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Integer,
    Text,
    Float,
    TIMESTAMP,
    JSON,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.core.db import Base


class VocabLearningLog(Base):
    """
    Records each word inspection with source context.
    Enables "Where did I learn this word?" during review.
    """

    __tablename__ = "vocab_learning_logs"
    __table_args__ = (
        Index("idx_vocab_log_user_word", "user_id", "word"),
        Index("idx_vocab_log_source", "source_type", "source_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(Text, default="default_user", index=True)
    word: Mapped[str] = mapped_column(Text, index=True)

    # Source context
    source_type: Mapped[str] = mapped_column(
        Text
    )  # epub | rss | podcast | plain_text | dictionary
    source_id: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # e.g., "epub:economist_2024_01"
    context_sentence: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # The sentence where word was encountered
    audio_timestamp: Mapped[Optional[float]] = mapped_column(
        Integer, nullable=True
    )  # For audio sources (seconds)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())


class UserComprehensionProfile(Base):
    """
    Stores a user's overall comprehension profile, derived from various learning activities.
    This profile can be used to personalize content difficulty, highlight suggestions,
    and diagnose learning gaps.
    """

    __tablename__ = "user_comprehension_profiles"
    __table_args__ = (Index("idx_comprehension_user", "user_id", unique=True),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(Text, default="default_user")

    # Overall proficiency scores (e.g., CEFR level, internal score)
    overall_score: Mapped[float] = mapped_column(Float, default=0.0)
    cefr_level: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # A1, A2, B1, B2, C1, C2

    # Detailed skill scores (e.g., grammar, vocabulary, listening, reading)
    grammar_score: Mapped[float] = mapped_column(Float, default=0.0)
    vocabulary_score: Mapped[float] = mapped_column(Float, default=0.0)
    reading_speed_wpm: Mapped[int] = mapped_column(Integer, default=0)
    listening_comprehension_score: Mapped[float] = mapped_column(Float, default=0.0)

    # Learning gap indicators (e.g., common grammar errors, weak vocabulary areas)
    common_grammar_gaps: Mapped[List[str]] = mapped_column(JSON, default=list)
    weak_vocabulary_topics: Mapped[List[str]] = mapped_column(JSON, default=list)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now()
    )


class ReadingSession(Base):
    """
    Tracks reading sessions with mixed signals for accurate input measurement.
    Uses time tracking, scroll behavior, and word clicks to validate reading quality.
    """

    __tablename__ = "reading_sessions"
    __table_args__ = (
        Index("idx_reading_sessions_user", "user_id"),
        Index("idx_reading_sessions_source", "source_type", "source_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(Text, default="default_user")
    source_type: Mapped[str] = mapped_column(Text)  # epub, rss
    source_id: Mapped[str] = mapped_column(Text)  # article identifier

    # Article metadata (cached at session start)
    article_title: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    total_word_count: Mapped[int] = mapped_column(Integer, default=0)
    total_sentences: Mapped[int] = mapped_column(Integer, default=0)

    # Session lifecycle
    started_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    ended_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)
    last_active_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now()
    )

    # Reading progress tracking
    max_sentence_reached: Mapped[int] = mapped_column(Integer, default=0)

    # Quality signals
    total_active_seconds: Mapped[int] = mapped_column(Integer, default=0)
    total_idle_seconds: Mapped[int] = mapped_column(Integer, default=0)
    word_click_count: Mapped[int] = mapped_column(Integer, default=0)
    scroll_jump_count: Mapped[int] = mapped_column(Integer, default=0)

    # Calculated results
    reading_quality: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # high/medium/low/skimmed
    validated_word_count: Mapped[int] = mapped_column(Integer, default=0)


class UserCalibration(Base):
    """
    Stores user's proficiency calibration level.
    Links to Reading Mode highlight suggestions.
    """

    __tablename__ = "user_calibrations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(
        Text, default="default_user", unique=True, index=True
    )
    level: Mapped[int] = mapped_column(Integer, default=0)  # 0-11 (12 levels)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now()
    )


class SentenceLearningRecord(Base):
    """Records user learning progress for each sentence in ASL (Adaptive Sentence Learning) mode."""

    __tablename__ = "sentence_learning_records"
    __table_args__ = (
        Index("idx_slr_user_source", "user_id", "source_type", "source_id"),
        Index("idx_slr_source_sentence", "source_id", "sentence_index"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(Text, default="default_user")

    # Sentence location (reference only, not storing full text)
    source_type: Mapped[str] = mapped_column(Text)  # epub, rss
    source_id: Mapped[str] = mapped_column(Text)  # e.g., "epub:file.epub:3"
    sentence_index: Mapped[int] = mapped_column(Integer)
    sentence_text: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # Store for review display

    # User interaction
    initial_response: Mapped[str] = mapped_column(Text)  # clear, unclear
    unclear_choice: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # vocabulary (words), grammar (structure), meaning (context), both (everything)
    simplified_response: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # got_it, still_unclear
    word_clicks: Mapped[List[str]] = mapped_column(JSON, default=list)
    phrase_clicks: Mapped[List[str]] = mapped_column(
        JSON, default=list
    )  # Collocation/phrase clicks
    dwell_time_ms: Mapped[int] = mapped_column(Integer, default=0)
    word_count: Mapped[int] = mapped_column(Integer, default=0)  # Words in the sentence

    # Diagnosis
    diagnosed_gap_type: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # vocabulary, structure, meaning, fundamental, collocation
    diagnosed_patterns: Mapped[List[str]] = mapped_column(JSON, default=list)
    interaction_log: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON, default=list
    )  # Added for storing detailed events
    confidence: Mapped[float] = mapped_column(
        Integer, default=0
    )  # SQLite doesn't have Float, use Integer

    # SRS scheduling (Phase 3)
    scheduled_review: Mapped[Optional[datetime]] = mapped_column(
        TIMESTAMP, nullable=True
    )
    review_count: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now()
    )


class StudyBasketState(Base):
    """Persisted intensive listening study basket per user/content scope."""

    __tablename__ = "study_basket_states"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "source_type",
            "content_id",
            name="uq_study_basket_scope",
        ),
        Index("idx_study_basket_user_updated", "user_id", "updated_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(Text, default="default_user", index=True)
    source_type: Mapped[str] = mapped_column(Text)
    content_id: Mapped[str] = mapped_column(Text)
    lookup_items: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    bookmarked_sentences: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON, default=list
    )

    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now()
    )
