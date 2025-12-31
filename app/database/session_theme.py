from typing import Dict, Any, Optional
import logging
from sqlalchemy import select, desc

from app.database.core import AsyncSessionLocal, SessionLog

logger = logging.getLogger(__name__)

async def log_session(topic: str, vocab_data: Dict[str, Any]):
    async with AsyncSessionLocal() as session:
        try:
            new_session = SessionLog(topic=topic, vocab_json=vocab_data)
            session.add(new_session)
            await session.commit()
        except Exception as e:
            logger.exception("DB Error log_session")
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
            logger.exception("DB Error get_session_vocab")
            return None
