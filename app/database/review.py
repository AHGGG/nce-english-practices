from typing import List, Dict, Any, Optional
from datetime import datetime
import logging
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.database.core import AsyncSessionLocal, ReviewNote, SRSSchedule

logger = logging.getLogger(__name__)

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
            logger.exception("DB Error add_note")
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
            logger.exception("DB Error get_due")
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
            logger.exception("DB Error update_srs")
            await session.rollback()
