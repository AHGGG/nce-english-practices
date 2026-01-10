"""
Voice session tracking API for VoiceMode/NegotiationInterface.
Records voice learning session metrics (time, lookups, interactions).
"""

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models.orm import VoiceSession

router = APIRouter(prefix="/api/voice-session", tags=["Voice Session"])


class StartSessionRequest(BaseModel):
    source_type: Optional[str] = None
    source_id: Optional[str] = None


class StartSessionResponse(BaseModel):
    session_id: int


class UpdateSessionRequest(BaseModel):
    session_id: int
    total_active_seconds: Optional[int] = None
    word_lookup_count: Optional[int] = None
    words_looked_up: Optional[List[str]] = None
    got_it_count: Optional[int] = None
    example_navigation_count: Optional[int] = None
    audio_play_count: Optional[int] = None


class EndSessionRequest(BaseModel):
    session_id: int
    total_active_seconds: int


@router.post("/start", response_model=StartSessionResponse)
async def start_voice_session(
    req: StartSessionRequest, db: AsyncSession = Depends(get_db)
):
    """Start a new voice learning session."""
    session = VoiceSession(
        source_type=req.source_type, source_id=req.source_id, is_active=True
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return {"session_id": session.id}


@router.put("/heartbeat")
async def update_voice_session(
    req: UpdateSessionRequest, db: AsyncSession = Depends(get_db)
):
    """Update voice session with current metrics (called periodically)."""
    update_data = {}

    if req.total_active_seconds is not None:
        update_data["total_active_seconds"] = req.total_active_seconds
    if req.word_lookup_count is not None:
        update_data["word_lookup_count"] = req.word_lookup_count
    if req.words_looked_up is not None:
        update_data["words_looked_up"] = req.words_looked_up
    if req.got_it_count is not None:
        update_data["got_it_count"] = req.got_it_count
    if req.example_navigation_count is not None:
        update_data["example_navigation_count"] = req.example_navigation_count
    if req.audio_play_count is not None:
        update_data["audio_play_count"] = req.audio_play_count

    if update_data:
        stmt = (
            update(VoiceSession)
            .where(VoiceSession.id == req.session_id)
            .values(**update_data)
        )
        await db.execute(stmt)
        await db.commit()

    return {"status": "ok"}


@router.post("/end")
async def end_voice_session(req: EndSessionRequest, db: AsyncSession = Depends(get_db)):
    """End a voice learning session."""
    stmt = (
        update(VoiceSession)
        .where(VoiceSession.id == req.session_id)
        .values(
            ended_at=datetime.now(),
            total_active_seconds=req.total_active_seconds,
            is_active=False,
        )
    )
    await db.execute(stmt)
    await db.commit()
    return {"status": "ok"}
