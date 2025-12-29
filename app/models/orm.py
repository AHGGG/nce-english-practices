import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import String, Integer, Text, Boolean, TIMESTAMP, ForeignKey, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.db import Base

class ChatSession(Base):
    """
    Stores active chat sessions (Stateless Architecture).
    Previously global variable ACTIVE_SESSIONS.
    """
    __tablename__ = "chat_sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # UUID
    mission_data: Mapped[Dict[str, Any]] = mapped_column(JSON) # The Mission JSON
    history: Mapped[List[Dict[str, str]]] = mapped_column(JSON) # List of messages
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class SessionLog(Base):
    """
    Logs metadata about learning sessions (Themes).
    Previously table 'sessions'.
    """
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    topic: Mapped[str] = mapped_column(Text, index=True)
    vocab_json: Mapped[Dict[str, Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())

class Story(Base):
    """
    Generated Stories cache.
    Previously table 'stories'.
    """
    __tablename__ = "stories"
    __table_args__ = (
        Index("idx_story_topic_tense", "topic", "target_tense"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    topic: Mapped[str] = mapped_column(Text)
    target_tense: Mapped[str] = mapped_column(Text)
    title: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    highlights: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list) # Renamed from highlights_json
    grammar_notes: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list) # Renamed from notes_json
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())

class Attempt(Base):
    """
    User practice attempts/results.
    Previously table 'attempts'.
    """
    __tablename__ = "attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    activity_type: Mapped[str] = mapped_column(Text, index=True) # 'quiz', 'scenario', 'mission'
    topic: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tense: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    input_data: Mapped[Dict[str, Any]] = mapped_column(JSON)
    user_response: Mapped[Dict[str, Any]] = mapped_column(JSON)
    
    is_pass: Mapped[bool] = mapped_column(Boolean)
    xp_earned: Mapped[int] = mapped_column(Integer, default=0)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now(), index=True)

class ReviewNote(Base):
    """
    Review notes for SRS.
    Previously table 'review_notes'.
    """
    __tablename__ = "review_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    original_sentence: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    better_sentence: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    note_type: Mapped[str] = mapped_column(Text, default="grammar")
    tags: Mapped[List[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())

    # One-to-One relationship with SRS Schedule
    schedule: Mapped[Optional["SRSSchedule"]] = relationship("SRSSchedule", back_populates="note", cascade="all, delete-orphan", uselist=False)

class SRSSchedule(Base):
    """
    SRS Scheduling data.
    Previously table 'srs_schedule'.
    """
    __tablename__ = "srs_schedule"

    note_id: Mapped[int] = mapped_column(ForeignKey("review_notes.id"), primary_key=True)
    next_review_at: Mapped[datetime] = mapped_column(TIMESTAMP, index=True)
    interval_days: Mapped[int] = mapped_column(Integer, default=0)
    ease_factor: Mapped[float] = mapped_column(Integer, default=2.5) # Using Float in DB usually but schemas handled REAL/Float
    repetitions: Mapped[int] = mapped_column(Integer, default=0)

    note: Mapped["ReviewNote"] = relationship("ReviewNote", back_populates="schedule")

class UserMemory(Base):
    """
    Coach memory system: Stores facts about the user.
    """
    __tablename__ = "user_memories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(Text, index=True) # Typically "default_user" for single user app
    key: Mapped[str] = mapped_column(Text, index=True) # e.g., "interests", "difficulty_level"
    value: Mapped[Dict[str, Any]] = mapped_column(JSON) # The actual memory content
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class UserProgress(Base):
    """
    Tracks mastery levels for specific topics/skills.
    """
    __tablename__ = "user_progress"
    __table_args__ = (
        Index("idx_progress_user_topic", "user_id", "topic"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(Text)
    topic: Mapped[str] = mapped_column(Text) # e.g., "present_perfect", "cooking_vocab"
    mastery_level: Mapped[int] = mapped_column(Integer, default=0) # 0-5 scale
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_practiced: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    practice_count: Mapped[int] = mapped_column(Integer, default=1)

class CoachSession(Base):
    """
    Logs metadata about Coach sessions.
    """
    __tablename__ = "coach_sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True) # UUID
    user_id: Mapped[str] = mapped_column(Text)
    started_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    ended_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)
    summary: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    message_count: Mapped[int] = mapped_column(Integer, default=0)


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
    sense_label: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # e.g., "v. to cook gently"
    context_type: Mapped[str] = mapped_column(Text)  # "dictionary_example" | "story" | "audio_clip" | "video_clip"
    
    text_content: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(Text)  # "Collins" | "LDOCE" | "ai_generated" | URL
    
    story_id: Mapped[Optional[int]] = mapped_column(ForeignKey("stories.id"), nullable=True)
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
    
    status: Mapped[str] = mapped_column(Text, default="unseen")  # unseen / learning / mastered
    last_practiced_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)
    practice_count: Mapped[int] = mapped_column(Integer, default=0)

    # Relationship
    context: Mapped["ContextResource"] = relationship("ContextResource", back_populates="learning_records")


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
    exposure_count: Mapped[int] = mapped_column(Integer, default=0)  # How many times encountered
    huh_count: Mapped[int] = mapped_column(Integer, default=0)  # How many times HUH? was clicked
    continue_count: Mapped[int] = mapped_column(Integer, default=0)  # How many times CONTINUE was clicked
    
    # Calculated metrics
    difficulty_score: Mapped[float] = mapped_column(Integer, default=0.0)  # huh_count / exposure_count
    status: Mapped[str] = mapped_column(Text, default="new")  # new / learning / mastered
    
    # Timestamps
    first_seen_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    last_seen_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class WordBook(Base):
    """
    Metadata for a vocabulary book (e.g., CET4, CET6, COCA).
    """
    __tablename__ = "word_books"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String, unique=True, index=True)  # e.g., 'cet4', 'coca'
    name: Mapped[str] = mapped_column(Text)  # e.g., 'CET-4 Core Vocabulary'
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    entries: Mapped[List["WordBookEntry"]] = relationship("WordBookEntry", back_populates="book", cascade="all, delete-orphan")


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
    user_id: Mapped[str] = mapped_column(Text, default="default_user", index=True)
    word: Mapped[str] = mapped_column(Text, index=True)
    
    # Source context
    source_type: Mapped[str] = mapped_column(Text)  # epub | rss | podcast | plain_text | dictionary
    source_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # e.g., "epub:economist_2024_01"
    context_sentence: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # The sentence where word was encountered
    audio_timestamp: Mapped[Optional[float]] = mapped_column(Integer, nullable=True)  # For audio sources (seconds)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
