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
