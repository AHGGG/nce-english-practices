"""
Reading Session API Router
Tracks reading behavior with mixed signals for accurate input measurement.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.database import (
    start_reading_session,
    update_reading_session,
    increment_word_click,
    end_reading_session,
    get_reading_stats_v2
)

router = APIRouter(prefix="/api/reading", tags=["reading"])


class StartSessionRequest(BaseModel):
    source_type: str  # epub, rss
    source_id: str
    article_title: Optional[str] = None
    total_word_count: int
    total_sentences: int


class HeartbeatRequest(BaseModel):
    session_id: int
    max_sentence_reached: int
    total_active_seconds: int
    total_idle_seconds: int
    scroll_jump_count: int


class EndSessionRequest(BaseModel):
    session_id: int
    max_sentence_reached: int
    total_active_seconds: int
    total_idle_seconds: int
    scroll_jump_count: int


class WordClickRequest(BaseModel):
    session_id: int


@router.post("/start")
async def api_start_reading(body: StartSessionRequest):
    """Start a new reading session."""
    session_id = await start_reading_session(
        user_id="default_user",
        source_type=body.source_type,
        source_id=body.source_id,
        article_title=body.article_title or "",
        total_word_count=body.total_word_count,
        total_sentences=body.total_sentences
    )
    
    if session_id:
        return {"success": True, "session_id": session_id}
    return {"success": False, "error": "Failed to create session"}


@router.put("/heartbeat")
async def api_heartbeat(body: HeartbeatRequest):
    """Update reading progress (called periodically by frontend)."""
    success = await update_reading_session(
        session_id=body.session_id,
        max_sentence_reached=body.max_sentence_reached,
        total_active_seconds=body.total_active_seconds,
        total_idle_seconds=body.total_idle_seconds,
        scroll_jump_count=body.scroll_jump_count
    )
    return {"success": success}


@router.post("/word-click")
async def api_word_click(body: WordClickRequest):
    """Increment word click count for high-confidence reading signal."""
    success = await increment_word_click(body.session_id)
    return {"success": success}


@router.post("/end")
async def api_end_reading(body: EndSessionRequest):
    """End reading session and calculate validated word count."""
    result = await end_reading_session(
        session_id=body.session_id,
        final_data={
            "max_sentence_reached": body.max_sentence_reached,
            "total_active_seconds": body.total_active_seconds,
            "total_idle_seconds": body.total_idle_seconds,
            "scroll_jump_count": body.scroll_jump_count
        }
    )
    return result


@router.get("/stats")
async def api_reading_stats():
    """Get reading statistics with validated word count."""
    return await get_reading_stats_v2()
