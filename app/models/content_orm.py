from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Integer, Text, TIMESTAMP, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.db import Base


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

    audio_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())

    # Relationships
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
