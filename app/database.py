import json
from datetime import datetime
from sqlalchemy import select, update, func, desc, cast, Integer
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import engine, AsyncSessionLocal
from app.core.models_db import Base, SessionModel, StoryModel, AttemptModel, ReviewNoteModel, SRSScheduleModel

# Initialize DB (run once on startup)
async def init_db():
    async with engine.begin() as conn:
        # Check if we should drop? No, just create if not exists
        await conn.run_sync(Base.metadata.create_all)

# --- Logging Functions (Async) ---

async def log_session(topic: str, vocab_data: dict):
    try:
        async with AsyncSessionLocal() as session:
            new_session = SessionModel(
                topic=topic,
                vocab_json=vocab_data
            )
            session.add(new_session)
            await session.commit()
    except Exception as e:
        print(f"DB Error log_session: {e}")

async def log_story(topic: str, tense: str, story_data: dict):
    try:
        async with AsyncSessionLocal() as session:
            # Check if exists (dedup)
            stmt = select(StoryModel).where(
                StoryModel.topic == topic,
                StoryModel.target_tense == tense
            )
            result = await session.execute(stmt)
            if result.scalar_one_or_none():
                return # Already saved

            new_story = StoryModel(
                topic=topic,
                target_tense=tense,
                title=story_data.get('title'),
                content=story_data.get('content'),
                highlights_json=story_data.get('highlights', []),
                notes_json=story_data.get('grammar_notes', [])
            )
            session.add(new_story)
            await session.commit()
    except Exception as e:
        print(f"DB Error log_story: {e}")

async def log_attempt(activity_type: str, topic: str, tense: str, input_data: dict, user_response: dict, is_pass: bool, xp: int = 10, duration_seconds: int = 0):
    try:
        async with AsyncSessionLocal() as session:
            attempt = AttemptModel(
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

async def get_user_stats():
    try:
        async with AsyncSessionLocal() as session:
            stats = {}

            # Total XP
            xp_stmt = select(func.sum(AttemptModel.xp_earned))
            xp_res = await session.execute(xp_stmt)
            stats['total_xp'] = xp_res.scalar() or 0

            # Total Duration
            dur_stmt = select(func.sum(AttemptModel.duration_seconds))
            dur_res = await session.execute(dur_stmt)
            total_sec = dur_res.scalar() or 0
            stats['total_minutes'] = round(total_sec / 60)

            # Breakdown by Activity
            # SQLite specific for boolean sum? generic func.sum(case...) or verify is_pass type
            # In SA, func.sum(AttemptModel.is_pass) might act differently on PG vs SQLite
            # Let's use func.count().filter() if possible or standard group by

            # Simple Group By count
            breakdown = []

            # We need: activity_type, count(*), sum(is_pass)
            # Portable way:
            stmt = select(
                AttemptModel.activity_type,
                func.count(AttemptModel.id).label('count'),
                func.sum(
                    # Cast boolean to integer for summing
                    func.cast(AttemptModel.is_pass, Integer)
                ).label('passed')
            ).group_by(AttemptModel.activity_type)

            stmt = select(
                AttemptModel.activity_type,
                func.count(AttemptModel.id).label('count'),
                func.sum(cast(AttemptModel.is_pass, Integer)).label('passed')
            ).group_by(AttemptModel.activity_type)

            res = await session.execute(stmt)
            for row in res:
                breakdown.append({
                    "activity_type": row.activity_type,
                    "count": row.count,
                    "passed": row.passed or 0
                })
            stats['activities'] = breakdown

            # Recent Activity (Last 5)
            recent_stmt = select(
                AttemptModel.activity_type,
                AttemptModel.topic,
                AttemptModel.tense,
                AttemptModel.is_pass,
                AttemptModel.duration_seconds,
                AttemptModel.created_at
            ).order_by(desc(AttemptModel.created_at)).limit(5)

            recent_res = await session.execute(recent_stmt)
            stats['recent'] = [dict(row._mapping) for row in recent_res]

            return stats
    except Exception as e:
        print(f"DB Error get_stats: {e}")
        return {"total_xp": 0, "total_minutes": 0, "activities": [], "recent": []}

async def add_review_note(original: str, better: str, note_type: str = "grammar", tags: list = []):
    try:
        async with AsyncSessionLocal() as session:
            note = ReviewNoteModel(
                original_sentence=original,
                better_sentence=better,
                note_type=note_type,
                tags=tags
            )
            session.add(note)
            await session.flush() # Get ID

            schedule = SRSScheduleModel(
                note_id=note.id,
                next_review_at=datetime.utcnow()
            )
            session.add(schedule)
            await session.commit()
            return note.id
    except Exception as e:
        print(f"DB Error add_note: {e}")
        return None

async def get_due_reviews(limit: int = 10):
    try:
        async with AsyncSessionLocal() as session:
            stmt = select(ReviewNoteModel, SRSScheduleModel).\
                join(SRSScheduleModel, ReviewNoteModel.id == SRSScheduleModel.note_id).\
                where(SRSScheduleModel.next_review_at <= datetime.utcnow()).\
                order_by(SRSScheduleModel.next_review_at.asc()).\
                limit(limit)

            result = await session.execute(stmt)
            items = []
            for note, sched in result:
                # Merge into a dict
                item = {
                    "id": note.id,
                    "original_sentence": note.original_sentence,
                    "better_sentence": note.better_sentence,
                    "note_type": note.note_type,
                    "tags": note.tags,
                    "interval_days": sched.interval_days,
                    "ease_factor": sched.ease_factor,
                    "repetitions": sched.repetitions,
                    "next_review_at": sched.next_review_at
                }
                items.append(item)
            return items
    except Exception as e:
        print(f"DB Error get_due: {e}")
        return []

async def update_srs_schedule(note_id: int, next_due: datetime, interval: int, ease: float, reps: int):
    try:
        async with AsyncSessionLocal() as session:
            stmt = update(SRSScheduleModel).where(SRSScheduleModel.note_id == note_id).values(
                next_review_at=next_due,
                interval_days=interval,
                ease_factor=ease,
                repetitions=reps
            )
            await session.execute(stmt)
            await session.commit()
    except Exception as e:
        print(f"DB Error update_srs: {e}")
