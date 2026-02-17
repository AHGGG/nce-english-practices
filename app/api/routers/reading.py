"""
Reading Session API Router
Tracks reading behavior with mixed signals for accurate input measurement.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, model_validator
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import (
    start_reading_session,
    update_reading_session,
    increment_word_click,
    end_reading_session,
    get_reading_stats_v2,
)
from app.api.deps.auth import get_current_user_id
from app.core.db import get_db

router = APIRouter(prefix="/api/reading", tags=["reading"])


class StartSessionRequest(BaseModel):
    source_type: str  # epub, rss
    source_id: str
    article_title: Optional[str] = None
    total_word_count: int
    total_sentences: int


class HeartbeatRequest(BaseModel):
    session_id: int
    max_sentence_reached: Optional[int] = 0
    total_active_seconds: Optional[int] = 0
    total_idle_seconds: Optional[int] = 0
    scroll_jump_count: Optional[int] = 0

    @model_validator(mode="before")
    @classmethod
    def coerce_nulls(cls, values):
        """Convert null values to 0 for numeric fields."""
        if isinstance(values, dict):
            for field in [
                "max_sentence_reached",
                "total_active_seconds",
                "total_idle_seconds",
                "scroll_jump_count",
            ]:
                if values.get(field) is None:
                    values[field] = 0
        return values


class EndSessionRequest(BaseModel):
    session_id: int
    max_sentence_reached: Optional[int] = 0
    total_active_seconds: Optional[int] = 0
    total_idle_seconds: Optional[int] = 0
    scroll_jump_count: Optional[int] = 0

    @model_validator(mode="before")
    @classmethod
    def coerce_nulls(cls, values):
        """Convert null values to 0 for numeric fields."""
        if isinstance(values, dict):
            for field in [
                "max_sentence_reached",
                "total_active_seconds",
                "total_idle_seconds",
                "scroll_jump_count",
            ]:
                if values.get(field) is None:
                    values[field] = 0
        return values


class WordClickRequest(BaseModel):
    session_id: int


@router.post("/start")
async def api_start_reading(
    body: StartSessionRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Start a new reading session."""
    session_id = await start_reading_session(
        user_id=user_id,
        source_type=body.source_type,
        source_id=body.source_id,
        article_title=body.article_title or "",
        total_word_count=body.total_word_count,
        total_sentences=body.total_sentences,
        db=db,
    )

    if session_id:
        return {"success": True, "session_id": session_id}
    return {"success": False, "error": "Failed to create session"}


@router.put("/heartbeat")
async def api_heartbeat(
    body: HeartbeatRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Update reading progress (called periodically by frontend)."""
    success = await update_reading_session(
        session_id=body.session_id,
        user_id=user_id,
        max_sentence_reached=int(body.max_sentence_reached or 0),
        total_active_seconds=int(body.total_active_seconds or 0),
        total_idle_seconds=int(body.total_idle_seconds or 0),
        scroll_jump_count=int(body.scroll_jump_count or 0),
        db=db,
    )
    return {"success": success}


@router.post("/word-click")
async def api_word_click(
    body: WordClickRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Increment word click count for high-confidence reading signal."""
    success = await increment_word_click(body.session_id, user_id=user_id, db=db)
    return {"success": success}


@router.post("/end")
async def api_end_reading(
    body: EndSessionRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """End reading session and calculate validated word count."""
    result = await end_reading_session(
        session_id=body.session_id,
        user_id=user_id,
        final_data={
            "max_sentence_reached": int(body.max_sentence_reached or 0),
            "total_active_seconds": int(body.total_active_seconds or 0),
            "total_idle_seconds": int(body.total_idle_seconds or 0),
            "scroll_jump_count": int(body.scroll_jump_count or 0),
        },
        db=db,
    )
    return result


@router.get("/stats")
async def api_reading_stats(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get reading statistics with validated word count."""
    return await get_reading_stats_v2(user_id=user_id, db=db)
