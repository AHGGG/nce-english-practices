import json
from datetime import datetime
from typing import Dict, List, Any, Optional


from sqlalchemy import select, update, desc, func, Integer
from sqlalchemy.orm import selectinload

from app.core.db import AsyncSessionLocal
from app.models.orm import (
    SessionLog, Story, Attempt, ReviewNote, SRSSchedule, ChatSession,
    CoachSession, UserMemory, UserProgress
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

async def get_session_vocab(topic: str) -> Optional[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        try:
            # Get latest session for this topic
            stmt = select(SessionLog).where(SessionLog.topic == topic).order_by(desc(SessionLog.created_at)).limit(1)
            result = await session.execute(stmt)
            session_log = result.scalar_one_or_none()
            if session_log:
                return session_log.vocab_json
            return None
        except Exception as e:
            print(f"DB Error get_session_vocab: {e}")
            return None

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
            
            # Optimized: Combine stats into one query
            stmt = select(
                Attempt.activity_type,
                func.count(Attempt.id).label("count"),
                func.sum(func.cast(Attempt.is_pass, Integer)).label("passed"),
                func.sum(Attempt.duration_seconds).label("duration"),
                func.sum(Attempt.xp_earned).label("xp")
            ).group_by(Attempt.activity_type)
            
            res = await session.execute(stmt)
            rows = res.all()

            stats['activities'] = []
            total_xp = 0
            total_sec = 0

            for row in rows:
                row_xp = row.xp or 0
                row_duration = row.duration or 0

                total_xp += row_xp
                total_sec += row_duration

                stats['activities'].append({
                    "activity_type": row.activity_type, 
                    "count": row.count, 
                    "passed": row.passed or 0,
                    "duration_seconds": row_duration
                })

            stats['total_xp'] = total_xp
            stats['total_minutes'] = round(total_sec / 60)
            
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

# --- Coach Persistence ---

async def create_coach_session(user_id: str) -> str:
    """Create a new coach session."""
    from uuid import uuid4
    session_id = str(uuid4())
    
    async with AsyncSessionLocal() as session:
        try:
            new_session = CoachSession(
                id=session_id,
                user_id=user_id
            )
            session.add(new_session)
            await session.commit()
            return session_id
        except Exception as e:
            print(f"DB Error create_coach_session: {e}")
            await session.rollback()
            return "error"

async def get_total_coach_messages(session_id: str) -> int:
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(select(CoachSession.message_count).where(CoachSession.id == session_id))
            return result.scalar() or 0
        except Exception as e:
            print(f"DB Error get_coach_msg_count: {e}")
            return 0

async def increment_coach_message_count(session_id: str):
    async with AsyncSessionLocal() as session:
        try:
            stmt = update(CoachSession).where(CoachSession.id == session_id).values(message_count=CoachSession.message_count + 1)
            await session.execute(stmt)
            await session.commit()
        except Exception as e:
            print(f"DB Error inc_coach_msg: {e}")
            await session.rollback()

async def end_coach_session(session_id: str, summary: Dict[str, Any] = None):
    async with AsyncSessionLocal() as session:
        try:
            values = {"ended_at": datetime.now()}
            if summary:
                values["summary"] = summary
            
            stmt = update(CoachSession).where(CoachSession.id == session_id).values(**values)
            await session.execute(stmt)
            await session.commit()
        except Exception as e:
            print(f"DB Error end_coach_session: {e}")
            await session.rollback()

# --- Coach Memory ---

async def remember_fact(user_id: str, key: str, value: Dict[str, Any]):
    async with AsyncSessionLocal() as session:
        try:
            # Upsert logic (simplified: check exist, then update or insert)
            stmt = select(UserMemory).where(UserMemory.user_id == user_id, UserMemory.key == key)
            result = await session.execute(stmt)
            memory = result.scalar_one_or_none()
            
            if memory:
                stmt = update(UserMemory).where(UserMemory.id == memory.id).values(value=value, updated_at=datetime.now())
                await session.execute(stmt)
            else:
                new_memory = UserMemory(user_id=user_id, key=key, value=value)
                session.add(new_memory)
            
            await session.commit()
        except Exception as e:
            print(f"DB Error remember_fact: {e}")
            await session.rollback()

async def recall_fact(user_id: str, key: str) -> Optional[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        try:
            stmt = select(UserMemory).where(UserMemory.user_id == user_id, UserMemory.key == key)
            result = await session.execute(stmt)
            memory = result.scalar_one_or_none()
            return memory.value if memory else None
        except Exception as e:
            print(f"DB Error recall_fact: {e}")
            return None

async def get_all_memories(user_id: str) -> Dict[str, Any]:
    async with AsyncSessionLocal() as session:
        try:
            stmt = select(UserMemory).where(UserMemory.user_id == user_id)
            result = await session.execute(stmt)
            memories = result.scalars().all()
            return {m.key: m.value for m in memories}
        except Exception as e:
            print(f"DB Error get_all_memories: {e}")
            return {}

# --- Coach Progress ---

async def update_mastery(user_id: str, topic: str, level: int, notes: str = None):
    async with AsyncSessionLocal() as session:
        try:
            # Upsert
            stmt = select(UserProgress).where(UserProgress.user_id == user_id, UserProgress.topic == topic)
            result = await session.execute(stmt)
            progress = result.scalar_one_or_none()
            
            if progress:
                # Update existing
                values = {
                    "mastery_level": level, 
                    "last_practiced": datetime.now(),
                    "practice_count": UserProgress.practice_count + 1
                }
                if notes:
                    values["notes"] = notes
                
                stmt = update(UserProgress).where(UserProgress.id == progress.id).values(**values)
                await session.execute(stmt)
            else:
                # Create new
                new_progress = UserProgress(
                    user_id=user_id, 
                    topic=topic, 
                    mastery_level=level, 
                    notes=notes
                )
                session.add(new_progress)
            
            await session.commit()
        except Exception as e:
            print(f"DB Error update_mastery: {e}")
            await session.rollback()

async def get_mastery(user_id: str, topic: str) -> Optional[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        try:
            stmt = select(UserProgress).where(UserProgress.user_id == user_id, UserProgress.topic == topic)
            result = await session.execute(stmt)
            progress = result.scalar_one_or_none()
            if progress:
                return {
                    "level": progress.mastery_level,
                    "notes": progress.notes,
                    "count": progress.practice_count
                }
            return None
        except Exception as e:
            print(f"DB Error get_mastery: {e}")
            return None

