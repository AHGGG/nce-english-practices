from datetime import datetime
from typing import List, Optional
from sqlalchemy import Integer, Text, Float, TIMESTAMP, ForeignKey, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.db import Base


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
    user_id: Mapped[str] = mapped_column(Text, default="default_user", index=True)

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
