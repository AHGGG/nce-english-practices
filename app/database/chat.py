from typing import Dict, List, Any, Optional
from uuid import uuid4
import logging
from sqlalchemy import select, update

from app.database.core import AsyncSessionLocal, ChatSession

logger = logging.getLogger(__name__)

async def create_chat_session(mission_data: Dict[str, Any], initial_history: List[Dict[str, str]]) -> str:
    """Create a new chat session and return the ID (UUID)."""
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
            logger.exception("DB Error create_chat")
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
            logger.exception("DB Error get_chat")
            return None

async def update_chat_history(session_id: str, new_history: List[Dict[str, str]]):
    """Update history for a chat session."""
    async with AsyncSessionLocal() as session:
        try:
            stmt = update(ChatSession).where(ChatSession.id == session_id).values(history=new_history)
            await session.execute(stmt)
            await session.commit()
        except Exception as e:
            logger.exception("DB Error update_chat")
            await session.rollback()
