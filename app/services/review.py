from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlalchemy import select
from app.core.db import AsyncSessionLocal
from app.models.orm import SRSSchedule
from app.database import update_srs_schedule

async def process_review_result(note_id: int, quality: int) -> Optional[Dict[str, Any]]:
    """
    Implements SuperMemo-2 Algorithm.
    quality: 0-5
    """
    # 1. Fetch current state
    async with AsyncSessionLocal() as session:
        try:
            stmt = select(SRSSchedule).where(SRSSchedule.note_id == note_id)
            result = await session.execute(stmt)
            schedule = result.scalar_one_or_none()

            if not schedule:
                print(f"Error: No schedule found for note {note_id}")
                return None

            prev_interval = schedule.interval_days
            prev_ease = schedule.ease_factor
            prev_reps = schedule.repetitions
        except Exception as e:
            print(f"Error fetching schedule: {e}")
            return None

    new_interval = 0
    new_ease = prev_ease
    new_reps = prev_reps
    
    if quality >= 3:
        if prev_reps == 0:
            new_interval = 1
        elif prev_reps == 1:
            new_interval = 6
        else:
            new_interval = int(prev_interval * prev_ease)
        
        new_reps += 1
        
        # Update Ease Factor
        # EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        new_ease = prev_ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        if new_ease < 1.3:
            new_ease = 1.3
            
    else:
        new_reps = 0
        new_interval = 1
        # Ease factor doesn't change on failure in standard SM-2
        
    next_due = datetime.utcnow() + timedelta(days=new_interval)
    
    await update_srs_schedule(note_id, next_due, new_interval, new_ease, new_reps)
    
    return {
        "next_due": next_due.isoformat(),
        "interval_days": new_interval
    }
