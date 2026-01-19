from datetime import datetime
import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    String,
    Integer,
    Text,
    Boolean,
    TIMESTAMP,
    ForeignKey,
    JSON,
    Index,
    Float,
    LargeBinary,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.db import Base


class User(Base):
    """
    User account for authentication.
    Designed with future public deployment in mind.
    """

    __tablename__ = "users"
    __table_args__ = (
        Index("idx_users_email", "email", unique=True),
        Index("idx_users_username", "username"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    username: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Role and permissions
    role: Mapped[str] = mapped_column(String(20), default="user")  # user, admin

    # Account status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)  # Email verified

    # Security tracking
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now()
    )
    last_login_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)

    # Soft delete
    deleted_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)

    @property
    def user_id_str(self) -> str:
        """Return string user_id for compatibility with existing code."""
        return str(self.id)

class Story(Base):
    """
    Generated Stories cache.
    Previously table 'stories'.
    """

    __tablename__ = "stories"
    __table_args__ = (Index("idx_story_topic_tense", "topic", "target_tense"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    topic: Mapped[str] = mapped_column(Text)
    target_tense: Mapped[str] = mapped_column(Text)
    title: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    highlights: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON, default=list
    )  # Renamed from highlights_json
    grammar_notes: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON, default=list
    )  # Renamed from notes_json
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())


class Attempt(Base):
    """
    User practice attempts/results.
    Previously table 'attempts'.
    """

    __tablename__ = "attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    activity_type: Mapped[str] = mapped_column(
        Text, index=True
    )  # 'quiz', 'scenario', 'mission'
    topic: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tense: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    input_data: Mapped[Dict[str, Any]] = mapped_column(JSON)
    user_response: Mapped[Dict[str, Any]] = mapped_column(JSON)

    is_pass: Mapped[bool] = mapped_column(Boolean)
    xp_earned: Mapped[int] = mapped_column(Integer, default=0)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now(), index=True
    )


class ContextResource(Base):
    """
    Unified context resource storage.
    Supports multiple context types: dictionary examples, stories, audio clips, etc.
    """

    __tablename__ = "context_resources"
    __table_args__ = (
        Index("idx_context_word", "word"),
        Index("idx_context_type", "context_type"),
        Index("idx_context_word_type", "word", "context_type"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    word: Mapped[str] = mapped_column(Text, index=True)
    sense_label: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # e.g., "v. to cook gently"
    context_type: Mapped[str] = mapped_column(
        Text
    )  # "dictionary_example" | "story" | "audio_clip" | "video_clip"

    text_content: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(
        Text
    )  # "Collins" | "LDOCE" | "ai_generated" | URL

    story_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("stories.id"), nullable=True
    )
    audio_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())

    # Relationships
    story: Mapped[Optional["Story"]] = relationship("Story", backref="contexts")
    learning_records: Mapped[List["ContextLearningRecord"]] = relationship(
        "ContextLearningRecord", back_populates="context", cascade="all, delete-orphan"
    )


class ContextLearningRecord(Base):
    """
    Tracks user learning progress for each context resource.
    Supports SRS-style review scheduling.
    """

    __tablename__ = "context_learning_records"
    __table_args__ = (
        Index("idx_learning_user_context", "user_id", "context_id"),
        Index("idx_learning_status", "status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    context_id: Mapped[int] = mapped_column(ForeignKey("context_resources.id"))
    user_id: Mapped[str] = mapped_column(Text, default="default_user")

    status: Mapped[str] = mapped_column(
        Text, default="unseen"
    )  # unseen / learning / mastered
    last_practiced_at: Mapped[Optional[datetime]] = mapped_column(
        TIMESTAMP, nullable=True
    )
    practice_count: Mapped[int] = mapped_column(Integer, default=0)

    # Relationship
    context: Mapped["ContextResource"] = relationship(
        "ContextResource", back_populates="learning_records"
    )


class AUIInputRecord(Base):
    """
    Persisted user inputs for AUI Human-in-the-Loop workflows.
    Uses Postgres LISTEN/NOTIFY for real-time signaling.
    """

    __tablename__ = "aui_inputs"
    __table_args__ = (
        Index("idx_aui_input_session", "session_id"),
        Index("idx_aui_input_processed", "processed"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String, index=True)
    action: Mapped[str] = mapped_column(String)
    payload: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)

    processed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    processed_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)


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


class WordBook(Base):
    """
    Metadata for a vocabulary book (e.g., CET4, CET6, COCA).
    """

    __tablename__ = "word_books"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(
        String, unique=True, index=True
    )  # e.g., 'cet4', 'coca'
    name: Mapped[str] = mapped_column(Text)  # e.g., 'CET-4 Core Vocabulary'
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    entries: Mapped[List["WordBookEntry"]] = relationship(
        "WordBookEntry", back_populates="book", cascade="all, delete-orphan"
    )


class WordBookEntry(Base):
    """
    A single word entry in a book.
    """

    __tablename__ = "word_book_entries"
    __table_args__ = (
        Index("idx_book_entry_word", "book_id", "word"),
        Index("idx_book_entry_sequence", "book_id", "sequence"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("word_books.id"))
    word: Mapped[str] = mapped_column(Text)
    sequence: Mapped[int] = mapped_column(Integer, default=0)  # Priority/Frequency rank

    book: Mapped["WordBook"] = relationship("WordBook", back_populates="entries")


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
    user_id: Mapped[str] = mapped_column(Text, default="default_user")
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


class UserGoal(Base):
    """
    User-defined learning goals for gamification.
    Supports daily targets for new words, reviews, study time, and reading.
    """

    __tablename__ = "user_goals"
    __table_args__ = (Index("idx_user_goals_user", "user_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(Text, default="default_user")

    # Goal type: 'new_words', 'review_words', 'study_minutes', 'reading_words'
    goal_type: Mapped[str] = mapped_column(Text)
    target_value: Mapped[int] = mapped_column(Integer, default=10)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

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


class ArticleOverviewCache(Base):
    """Cached article overviews (persisted across restarts)."""

    __tablename__ = "article_overview_cache"
    __table_args__ = (Index("idx_overview_hash", "title_hash", unique=True),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title_hash: Mapped[str] = mapped_column(
        String(32), unique=True
    )  # MD5 hash
    title: Mapped[str] = mapped_column(Text)  # Original title for debugging

    # Cached content
    summary_en: Mapped[str] = mapped_column(Text)
    summary_zh: Mapped[str] = mapped_column(Text)
    key_topics: Mapped[List[str]] = mapped_column(JSON, default=list)
    difficulty_hint: Mapped[str] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())


class SentenceCollocationCache(Base):
    """Cached collocation detection results per sentence."""

    __tablename__ = "sentence_collocation_cache"
    __table_args__ = (Index("idx_collocation_hash", "sentence_hash", unique=True),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sentence_hash: Mapped[str] = mapped_column(
        String(32), unique=True
    )  # MD5 hash
    sentence_preview: Mapped[str] = mapped_column(Text)  # First 100 chars for debugging

    # Cached collocations as JSON array
    collocations: Mapped[List[Dict]] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())


class ReviewItem(Base):
    """
    Items scheduled for SM-2 spaced repetition review.
    Created when user marks a sentence as unclear or looks up words during study.
    """

    __tablename__ = "review_items"
    __table_args__ = (
        Index("idx_review_user_next", "user_id", "next_review_at"),
        Index("idx_review_source", "source_id", "sentence_index"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(Text, default="default_user")

    # Sentence reference
    source_id: Mapped[str] = mapped_column(Text)  # e.g., "epub:file.epub:3"
    sentence_index: Mapped[int] = mapped_column(Integer)
    sentence_text: Mapped[str] = mapped_column(Text)

    # Context from study session
    highlighted_items: Mapped[List[str]] = mapped_column(
        JSON, default=list
    )  # Words/phrases looked up
    difficulty_type: Mapped[str] = mapped_column(
        Text, default="vocabulary"
    )  # vocabulary (words), grammar (structure), meaning (context), both (everything)

    # SM-2 parameters
    easiness_factor: Mapped[float] = mapped_column(Float, default=2.5)
    interval_days: Mapped[float] = mapped_column(Float, default=1.0)
    repetition: Mapped[int] = mapped_column(
        Integer, default=0
    )  # Consecutive successful reviews

    # Scheduling
    next_review_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now()
    )
    last_reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        TIMESTAMP, nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())

    # Relationship
    review_logs: Mapped[List["ReviewLog"]] = relationship(
        "ReviewLog", back_populates="review_item", cascade="all, delete-orphan"
    )


class ReviewLog(Base):
    """
    Individual review event log. Tracks each time user reviews an item.
    Used for calculating memory curve statistics.
    """

    __tablename__ = "review_logs"
    __table_args__ = (
        Index("idx_log_item", "review_item_id"),
        Index("idx_log_reviewed_at", "reviewed_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    review_item_id: Mapped[int] = mapped_column(ForeignKey("review_items.id"))

    quality: Mapped[int] = mapped_column(Integer)  # 1=forgot, 3=remembered, 5=easy
    interval_at_review: Mapped[float] = mapped_column(
        Float
    )  # Interval when reviewed (days)

    reviewed_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)

    # Relationship
    review_item: Mapped["ReviewItem"] = relationship(
        "ReviewItem", back_populates="review_logs"
    )


class GeneratedImage(Base):
    """
    Cache for AI-generated images for word/context pairs.
    """

    __tablename__ = "generated_images"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    word: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    context_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    sentence: Mapped[str] = mapped_column(Text, nullable=False)
    image_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    image_data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(20), default="image/png")
    model: Mapped[str] = mapped_column(String(50), default="cogview-4")
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())

    __table_args__ = (
        Index("ix_generated_images_word_context", "word", "context_hash"),
    )

