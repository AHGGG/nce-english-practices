import json
from datetime import datetime
from typing import Dict, List, Any, Optional


from sqlalchemy import select, update, desc, func, Integer
from sqlalchemy.orm import selectinload

from app.core.db import AsyncSessionLocal
from app.db_models import (
    SessionLog, Story, Attempt, ReviewNote, SRSSchedule, ChatSession
)

# --- Session / Theme ---

async def log_session(topic: str, vocab_data: Dict[str, Any]):
    async with AsyncSessionLocal() as session:
        try:
            new_session = SessionLog(topic=topic, vocab_json=vocab_data)
            session.add(new_session)
            await session.commit()
        except Exception as e:
            print(f"DB Error log_session: {e}")
            await session.rollback()

# --- Story ---

async def log_story(topic: str, tense: str, story_data: Dict[str, Any]):
    async with AsyncSessionLocal() as session:
        try:
            # Check for dupes
            stmt = select(Story).where(Story.topic == topic, Story.target_tense == tense)
            result = await session.execute(stmt)
            if result.scalar_one_or_none():
                return
                
            new_story = Story(
                topic=topic,
                target_tense=tense,
                title=story_data.get('title'),
                content=story_data.get('content'),
                highlights=story_data.get('highlights', []),
                grammar_notes=story_data.get('grammar_notes', [])
            )
            session.add(new_story)
            await session.commit()
        except Exception as e:
            print(f"DB Error log_story: {e}")
            await session.rollback()

async def get_story(topic: str, tense: str) -> Optional[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        try:
            stmt = select(Story).where(Story.topic == topic, Story.target_tense == tense)
            result = await session.execute(stmt)
            story = result.scalar_one_or_none()
            if story:
                return {
                    "title": story.title,
                    "content": story.content,
                    "highlights": story.highlights,
                    "grammar_notes": story.grammar_notes
                }
            return None
        except Exception as e:
            print(f"DB Error get_story: {e}")
            return None

# --- Attempts / Stats ---

async def log_attempt(activity_type: str, topic: str, tense: str, 
                    input_data: Dict[str, Any], user_response: Dict[str, Any], 
                    is_pass: bool, xp: int = 10, duration_seconds: int = 0):
    async with AsyncSessionLocal() as session:
        try:
            attempt = Attempt(
                activity_type=activity_type,
                topic=topic,
                tense=tense,
                input_data=input_data,
                user_response=user_response,
                is_pass=is_pass,
                xp_earned=xp if is_pass else 1,
                duration_seconds=duration_seconds
            )
            session.add(attempt)
            await session.commit()
        except Exception as e:
            print(f"DB Error log_attempt: {e}")
            await session.rollback()

async def get_user_stats() -> Dict[str, Any]:
    async with AsyncSessionLocal() as session:
        try:
            stats = {}
            
            # Total XP
            xp_stmt = select(func.sum(Attempt.xp_earned))
            xp_res = await session.execute(xp_stmt)
            stats['total_xp'] = xp_res.scalar() or 0
            
            # Total Duration
            dur_stmt = select(func.sum(Attempt.duration_seconds))
            dur_res = await session.execute(dur_stmt)
            total_sec = dur_res.scalar() or 0
            stats['total_minutes'] = round(total_sec / 60)
            
            # Breakdown
            # Select activity_type, count(*), sum(case when is_pass then 1 else 0 end)
            # This is complex in pure ORM, raw SQL or group_by is easier
            stmt = select(
                Attempt.activity_type,
                func.count(Attempt.id).label("count"),
                func.sum(func.cast(Attempt.is_pass, Integer)).label("passed")
            ).group_by(Attempt.activity_type)
            
            res = await session.execute(stmt)
            stats['activities'] = [
                {"activity_type": row.activity_type, "count": row.count, "passed": row.passed or 0} 
                for row in res.all()
            ]
            
            # Recent
            recent_stmt = select(Attempt).order_by(desc(Attempt.created_at)).limit(5)
            recent_res = await session.execute(recent_stmt)
            rows = recent_res.scalars().all()
            
            stats['recent'] = [
                {
                    "activity_type": r.activity_type,
                    "topic": r.topic,
                    "tense": r.tense,
                    "is_pass": r.is_pass,
                    "duration_seconds": r.duration_seconds,
                    "created_at": r.created_at.isoformat()
                } for r in rows
            ]
            
            return stats
        except Exception as e:
            print(f"DB Error get_stats: {e}")
            return {"total_xp": 0, "total_minutes": 0, "activities": [], "recent": []}

# --- Review / SRS ---

async def add_review_note(original: str, better: str, note_type: str = "grammar", tags: List[str] = []) -> Optional[int]:
    async with AsyncSessionLocal() as session:
        try:
            note = ReviewNote(
                original_sentence=original,
                better_sentence=better,
                note_type=note_type,
                tags=tags
            )
            session.add(note)
            await session.flush() # Get ID
            
            # Init SRS
            srs = SRSSchedule(
                note_id=note.id,
                next_review_at=datetime.utcnow()
            )
            session.add(srs)
            await session.commit()
            return note.id
        except Exception as e:
            print(f"DB Error add_note: {e}")
            await session.rollback()
            return None

async def get_due_reviews(limit: int = 10) -> List[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        try:
            stmt = select(ReviewNote).join(ReviewNote.schedule)\
                .where(SRSSchedule.next_review_at <= datetime.utcnow())\
                .order_by(SRSSchedule.next_review_at.asc())\
                .limit(limit)\
                .options(selectinload(ReviewNote.schedule))
                
            result = await session.execute(stmt)
            notes = result.scalars().all()
            
            output = []
            for n in notes:
                item = {
                    "id": n.id,
                    "original_sentence": n.original_sentence,
                    "better_sentence": n.better_sentence,
                    "note_type": n.note_type,
                    "tags": n.tags,
                    # SRS info
                    "interval_days": n.schedule.interval_days,
                    "ease_factor": n.schedule.ease_factor,
                    "repetitions": n.schedule.repetitions
                }
                output.append(item)
            return output
        except Exception as e:
            print(f"DB Error get_due: {e}")
            return []

async def update_srs_schedule(note_id: int, next_due: datetime, interval: int, ease: float, reps: int):
    async with AsyncSessionLocal() as session:
        try:
            stmt = update(SRSSchedule).where(SRSSchedule.note_id == note_id).values(
                next_review_at=next_due,
                interval_days=interval,
                ease_factor=ease,
                repetitions=reps
            )
            await session.execute(stmt)
            await session.commit()
        except Exception as e:
            print(f"DB Error update_srs: {e}")
            await session.rollback()

# --- Chat Sessions (New Stateless impl) ---

async def create_chat_session(mission_data: Dict[str, Any], initial_history: List[Dict[str, str]]) -> str:
    """Create a new chat session and return the ID (UUID)."""
    from uuid import uuid4
    session_id = str(uuid4())
    
    async with AsyncSessionLocal() as session:
        try:
            chat_session = ChatSession(
                id=session_id,
                mission_data=mission_data,
                history=initial_history
            )
            session.add(chat_session)
            await session.commit()
            return session_id
        except Exception as e:
            print(f"DB Error create_chat: {e}")
            await session.rollback()
            return "error"

async def get_chat_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve chat session state."""
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(select(ChatSession).where(ChatSession.id == session_id))
            chat = result.scalar_one_or_none()
            if chat:
                return {
                    "mission": chat.mission_data,
                    "history": chat.history
                }
            return None
        except Exception as e:
            print(f"DB Error get_chat: {e}")
            return None

async def update_chat_history(session_id: str, new_history: List[Dict[str, str]]):
    """Update history for a chat session."""
    async with AsyncSessionLocal() as session:
        try:
            stmt = update(ChatSession).where(ChatSession.id == session_id).values(history=new_history)
            await session.execute(stmt)
            await session.commit()
        except Exception as e:
            print(f"DB Error update_chat: {e}")
            await session.rollback()
