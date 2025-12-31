from typing import Dict, Any, Optional
from datetime import datetime
from uuid import uuid4
import logging
from sqlalchemy import select, update

from app.database.core import AsyncSessionLocal, CoachSession, UserMemory, UserProgress

logger = logging.getLogger(__name__)

# --- Coach Persistence ---

async def create_coach_session(user_id: str) -> str:
    """Create a new coach session."""
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
            logger.exception("DB Error create_coach_session")
            await session.rollback()
            return "error"

async def get_total_coach_messages(session_id: str) -> int:
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(select(CoachSession.message_count).where(CoachSession.id == session_id))
            return result.scalar() or 0
        except Exception as e:
            logger.exception("DB Error get_coach_msg_count")
            return 0

async def increment_coach_message_count(session_id: str):
    async with AsyncSessionLocal() as session:
        try:
            stmt = update(CoachSession).where(CoachSession.id == session_id).values(message_count=CoachSession.message_count + 1)
            await session.execute(stmt)
            await session.commit()
        except Exception as e:
            logger.exception("DB Error inc_coach_msg")
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
            logger.exception("DB Error end_coach_session")
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
            logger.exception("DB Error remember_fact")
            await session.rollback()

async def recall_fact(user_id: str, key: str) -> Optional[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        try:
            stmt = select(UserMemory).where(UserMemory.user_id == user_id, UserMemory.key == key)
            result = await session.execute(stmt)
            memory = result.scalar_one_or_none()
            return memory.value if memory else None
        except Exception as e:
            logger.exception("DB Error recall_fact")
            return None

async def get_all_memories(user_id: str) -> Dict[str, Any]:
    async with AsyncSessionLocal() as session:
        try:
            stmt = select(UserMemory).where(UserMemory.user_id == user_id)
            result = await session.execute(stmt)
            memories = result.scalars().all()
            return {m.key: m.value for m in memories}
        except Exception as e:
            logger.exception("DB Error get_all_memories")
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
            logger.exception("DB Error update_mastery")
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
            logger.exception("DB Error get_mastery")
            return None
