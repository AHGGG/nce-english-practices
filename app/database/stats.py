from typing import Dict, Any
import logging
from sqlalchemy import select, desc, func, Integer

from app.database.core import AsyncSessionLocal, Attempt

logger = logging.getLogger(__name__)

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
            logger.exception("DB Error log_attempt")
            await session.rollback()

async def get_user_stats() -> Dict[str, Any]:
    async with AsyncSessionLocal() as session:
        try:
            stats = {}
            
            # Breakdown with duration and XP
            # Optimization: Calculate total XP and duration from the breakdown query
            # to avoid 2 extra full-table aggregations.
            stmt = select(
                Attempt.activity_type,
                func.count(Attempt.id).label("count"),
                func.sum(func.cast(Attempt.is_pass, Integer)).label("passed"),
                func.sum(Attempt.duration_seconds).label("duration"),
                func.sum(Attempt.xp_earned).label("xp")
            ).group_by(Attempt.activity_type)
            
            res = await session.execute(stmt)

            activities = []
            total_xp = 0
            total_duration_seconds = 0

            for row in res.all():
                row_duration = row.duration or 0
                row_xp = row.xp or 0

                total_xp += row_xp
                total_duration_seconds += row_duration

                activities.append({
                    "activity_type": row.activity_type, 
                    "count": row.count, 
                    "passed": row.passed or 0,
                    "duration_seconds": row_duration
                })

            stats['total_xp'] = total_xp
            stats['total_minutes'] = round(total_duration_seconds / 60)
            stats['activities'] = activities
            
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
            logger.exception("DB Error get_stats")
            return {"total_xp": 0, "total_minutes": 0, "activities": [], "recent": []}
