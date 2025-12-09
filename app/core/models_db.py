from datetime import datetime
from typing import Optional, List, Dict, Any
import json
from sqlalchemy import Integer, String, Boolean, DateTime, Text, Float, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator

# JSON Type Helper for SQLite/PG compatibility
class JSONType(TypeDecorator):
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return json.dumps(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return json.loads(value)

class Base(DeclarativeBase):
    pass

class SessionModel(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    topic: Mapped[str] = mapped_column(String, nullable=False)
    vocab_json: Mapped[Dict] = mapped_column(JSONType, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class StoryModel(Base):
    __tablename__ = "stories"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    topic: Mapped[str] = mapped_column(String, nullable=False)
    target_tense: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    highlights_json: Mapped[List] = mapped_column(JSONType, default=list)
    notes_json: Mapped[List] = mapped_column(JSONType, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class AttemptModel(Base):
    __tablename__ = "attempts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    activity_type: Mapped[str] = mapped_column(String, nullable=False) # quiz, scenario, mission
    topic: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    tense: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    input_data: Mapped[Dict] = mapped_column(JSONType, default=dict)
    user_response: Mapped[Dict] = mapped_column(JSONType, default=dict)
    is_pass: Mapped[bool] = mapped_column(Boolean, default=False)
    xp_earned: Mapped[int] = mapped_column(Integer, default=0)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class ReviewNoteModel(Base):
    __tablename__ = "review_notes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    original_sentence: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    better_sentence: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    note_type: Mapped[str] = mapped_column(String, default="grammar")
    tags: Mapped[List] = mapped_column(JSONType, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationship
    schedule: Mapped["SRSScheduleModel"] = relationship("SRSScheduleModel", uselist=False, back_populates="note")

class SRSScheduleModel(Base):
    __tablename__ = "srs_schedule"

    note_id: Mapped[int] = mapped_column(ForeignKey("review_notes.id"), primary_key=True)
    next_review_at: Mapped[datetime] = mapped_column(DateTime)
    interval_days: Mapped[int] = mapped_column(Integer, default=0)
    ease_factor: Mapped[float] = mapped_column(Float, default=2.5)
    repetitions: Mapped[int] = mapped_column(Integer, default=0)

    note: Mapped["ReviewNoteModel"] = relationship("ReviewNoteModel", back_populates="schedule")
