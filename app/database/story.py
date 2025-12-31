from typing import Dict, Any, Optional
import logging
from sqlalchemy import select

from app.database.core import AsyncSessionLocal, Story

logger = logging.getLogger(__name__)

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
            logger.exception("DB Error log_story")
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
            logger.exception("DB Error get_story")
            return None
