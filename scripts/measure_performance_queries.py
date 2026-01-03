
import asyncio
import time
import logging
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func, case

# Import models and Base
from app.core.db import Base
from app.models.orm import ReadingSession, SentenceLearningRecord, VoiceSession

# Import the original function to test
from app.database.performance import get_performance_data as original_get_performance_data

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Setup in-memory SQLite database
DATABASE_URL = "sqlite+aiosqlite:///:memory:"
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def seed_data(session):
    """Seed a significant amount of data to measure performance."""
    logger.info("Seeding data...")

    # Create 1000 Reading Sessions
    reading_sessions = []
    for i in range(1000):
        quality = 'high' if i % 2 == 0 else 'skimmed'
        reading_sessions.append(ReadingSession(
            user_id="default_user",
            source_type="rss",
            source_id=f"article_{i % 100}",
            started_at=datetime.utcnow() - timedelta(days=i % 30),
            total_active_seconds=60 + (i % 300),
            reading_quality=quality,
            validated_word_count=100 + (i % 50)
        ))
    session.add_all(reading_sessions)

    # Create 1000 Sentence Learning Records
    sentence_records = []
    for i in range(1000):
        sentence_records.append(SentenceLearningRecord(
            user_id="default_user",
            source_type="epub",
            source_id=f"book_{i % 50}",
            sentence_index=i,
            initial_response="clear",
            created_at=datetime.utcnow() - timedelta(days=i % 30),
            dwell_time_ms=5000 + (i % 10000),
            word_count=10 + (i % 20)
        ))
    session.add_all(sentence_records)

    # Create 100 Voice Sessions
    voice_sessions = []
    for i in range(100):
        voice_sessions.append(VoiceSession(
            user_id="default_user",
            started_at=datetime.utcnow() - timedelta(days=i % 30),
            total_active_seconds=120 + (i % 300)
        ))
    session.add_all(voice_sessions)

    await session.commit()
    logger.info("Data seeded.")

async def optimized_get_performance_data(session_factory, days: int = 30):
    """
    Optimized version of get_performance_data.
    """
    async with session_factory() as session:
        result = {}
        cutoff = datetime.utcnow() - timedelta(days=days)

        # --- Study Time & Stats Combined ---

        # 1. Reading: Time + Stats
        # We need:
        # - sum(total_active_seconds) for ALL sessions >= cutoff
        # - sum(validated_word_count) for QUALITY sessions >= cutoff
        # - count(id) for QUALITY sessions >= cutoff
        # - count(distinct source_id) for QUALITY sessions >= cutoff

        reading_combined_stmt = select(
            func.sum(ReadingSession.total_active_seconds),
            func.sum(case((ReadingSession.reading_quality.in_(['high', 'medium', 'low']), ReadingSession.validated_word_count), else_=0)),
            func.count(case((ReadingSession.reading_quality.in_(['high', 'medium', 'low']), ReadingSession.id), else_=None)),
            func.count(func.distinct(case((ReadingSession.reading_quality.in_(['high', 'medium', 'low']), ReadingSession.source_id), else_=None)))
        ).where(
            ReadingSession.started_at >= cutoff
        )

        reading_res = await session.execute(reading_combined_stmt)
        reading_row = reading_res.first()

        reading_seconds = reading_row[0] or 0
        reading_words = reading_row[1] or 0
        reading_sessions = reading_row[2] or 0
        reading_articles = reading_row[3] or 0

        # 2. Sentence: Time + Stats
        # We need:
        # - sum(dwell_time_ms)
        # - sum(word_count)
        # - count(distinct source_id)
        # All with created_at >= cutoff

        sentence_combined_stmt = select(
            func.sum(SentenceLearningRecord.dwell_time_ms),
            func.sum(SentenceLearningRecord.word_count),
            func.count(func.distinct(SentenceLearningRecord.source_id))
        ).where(
            SentenceLearningRecord.created_at >= cutoff
        )

        sentence_res = await session.execute(sentence_combined_stmt)
        sentence_row = sentence_res.first()

        sentence_ms = sentence_row[0] or 0
        sentence_seconds = sentence_ms // 1000
        sentence_words = sentence_row[1] or 0
        sentence_articles = sentence_row[2] or 0

        # 3. Voice: Time
        voice_time_stmt = select(func.sum(VoiceSession.total_active_seconds)).where(
            VoiceSession.started_at >= cutoff
        )
        voice_time_res = await session.execute(voice_time_stmt)
        voice_seconds = voice_time_res.scalar() or 0

        # Construct Result
        total_study_seconds = sentence_seconds + reading_seconds + voice_seconds

        result['study_time'] = {
            'total_seconds': total_study_seconds,
            'total_minutes': round(total_study_seconds / 60),
            'breakdown': {
                'sentence_study': sentence_seconds,
                'reading': reading_seconds,
                'voice': voice_seconds
            }
        }

        result['reading_stats'] = {
            'total_words': reading_words + sentence_words,
            'sessions_count': reading_sessions,
            'articles_count': reading_articles + sentence_articles,
            'breakdown': {
                'reading_mode': reading_words,
                'sentence_study': sentence_words
            }
        }

        return result

async def run_benchmark():
    # Initialize DB
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed Data
    async with AsyncSessionLocal() as session:
        await seed_data(session)

    # Patch the original function's session usage
    # Since we can't easily patch the import inside the function,
    # we will just reimplement the "Original" logic here to ensure fair comparison
    # using the same session factory.

    async def original_impl(days=30):
        async with AsyncSessionLocal() as session:
            result = {}
            cutoff = datetime.utcnow() - timedelta(days=days)

            # --- Study Time ---
            sentence_time_stmt = select(func.sum(SentenceLearningRecord.dwell_time_ms)).where(
                SentenceLearningRecord.created_at >= cutoff
            )
            sentence_time_res = await session.execute(sentence_time_stmt)
            sentence_ms = sentence_time_res.scalar() or 0
            sentence_seconds = sentence_ms // 1000

            reading_time_stmt = select(func.sum(ReadingSession.total_active_seconds)).where(
                ReadingSession.started_at >= cutoff
            )
            reading_time_res = await session.execute(reading_time_stmt)
            reading_seconds = reading_time_res.scalar() or 0

            voice_time_stmt = select(func.sum(VoiceSession.total_active_seconds)).where(
                VoiceSession.started_at >= cutoff
            )
            voice_time_res = await session.execute(voice_time_stmt)
            voice_seconds = voice_time_res.scalar() or 0

            total_study_seconds = sentence_seconds + reading_seconds + voice_seconds
            result['study_time'] = {
                'total_seconds': total_study_seconds,
                'total_minutes': round(total_study_seconds / 60),
                'breakdown': {
                    'sentence_study': sentence_seconds,
                    'reading': reading_seconds,
                    'voice': voice_seconds
                }
            }

            # --- Reading Stats ---
            reading_stmt = select(
                func.sum(ReadingSession.validated_word_count),
                func.count(ReadingSession.id),
                func.count(func.distinct(ReadingSession.source_id))
            ).where(
                ReadingSession.started_at >= cutoff,
                ReadingSession.reading_quality.in_(['high', 'medium', 'low'])
            )
            reading_res = await session.execute(reading_stmt)
            row = reading_res.first()
            reading_words = row[0] or 0
            reading_sessions = row[1] or 0
            reading_articles = row[2] or 0

            sentence_stmt = select(
                func.sum(SentenceLearningRecord.word_count),
                func.count(func.distinct(SentenceLearningRecord.source_id))
            ).where(
                SentenceLearningRecord.created_at >= cutoff
            )
            sentence_res = await session.execute(sentence_stmt)
            sentence_row = sentence_res.first()
            sentence_words = sentence_row[0] or 0
            sentence_articles = sentence_row[1] or 0

            result['reading_stats'] = {
                'total_words': reading_words + sentence_words,
                'sessions_count': reading_sessions,
                'articles_count': reading_articles + sentence_articles,
                'breakdown': {
                    'reading_mode': reading_words,
                    'sentence_study': sentence_words
                }
            }
            return result

    # Measure Original
    start_time = time.time()
    for _ in range(50):
        await original_impl()
    original_duration = time.time() - start_time
    print(f"Original (50 runs): {original_duration:.4f}s")

    # Measure Optimized
    start_time = time.time()
    for _ in range(50):
        await optimized_get_performance_data(AsyncSessionLocal)
    optimized_duration = time.time() - start_time
    print(f"Optimized (50 runs): {optimized_duration:.4f}s")

    # Verify results match
    res_orig = await original_impl()
    res_opt = await optimized_get_performance_data(AsyncSessionLocal)

    # Assert equality (ignoring minor float diffs or order)
    # Convert to json str or just compare dicts
    import json
    print("Original Result:", json.dumps(res_orig, default=str))
    print("Optimized Result:", json.dumps(res_opt, default=str))

    assert res_orig['study_time']['total_seconds'] == res_opt['study_time']['total_seconds']
    assert res_orig['reading_stats']['total_words'] == res_opt['reading_stats']['total_words']
    print("Verification Passed: Results match.")

if __name__ == "__main__":
    asyncio.run(run_benchmark())
