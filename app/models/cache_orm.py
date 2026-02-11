from datetime import datetime
import uuid
from typing import Dict, List, Optional
from sqlalchemy import String, Integer, Text, TIMESTAMP, JSON, Index, LargeBinary, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.core.db import Base


class ArticleOverviewCache(Base):
    """Cached article overviews (persisted across restarts)."""

    __tablename__ = "article_overview_cache"
    __table_args__ = (Index("idx_overview_hash", "title_hash", unique=True),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title_hash: Mapped[str] = mapped_column(
        String(32), unique=True, index=True
    )  # MD5 hash
    title: Mapped[str] = mapped_column(Text)  # Original title for debugging

    # Cached content
    summary_en: Mapped[str] = mapped_column(Text)
    summary_zh: Mapped[str] = mapped_column(Text)
    key_topics: Mapped[List[str]] = mapped_column(JSON, default=list)
    difficulty_hint: Mapped[str] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())


class ArticleAnalysisFailure(Base):
    """
    Tracks failed article analysis attempts to prevent infinite retries.
    """

    __tablename__ = "article_analysis_failures"
    __table_args__ = (Index("idx_analysis_failure_hash", "title_hash", unique=True),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title_hash: Mapped[str] = mapped_column(
        String(32), unique=True, index=True
    )  # MD5 hash
    title: Mapped[str] = mapped_column(Text)  # Original title for debugging

    failure_count: Mapped[int] = mapped_column(Integer, default=1)
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now()
    )


class SentenceCollocationCache(Base):
    """Cached collocation detection results per sentence."""

    __tablename__ = "sentence_collocation_cache"
    __table_args__ = (Index("idx_collocation_hash", "sentence_hash", unique=True),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sentence_hash: Mapped[str] = mapped_column(
        String(32), unique=True, index=True
    )  # MD5 hash
    sentence_preview: Mapped[str] = mapped_column(Text)  # First 100 chars for debugging

    # Cached collocations as JSON array
    collocations: Mapped[List[Dict]] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())


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
