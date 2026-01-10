"""
Simplified Performance Dashboard Data.
Only provides: reading stats, study time (Sentence Study + Reading), and memory curve.
"""

from typing import Dict, Any
from datetime import datetime, timedelta
import math
import logging
from sqlalchemy import select, func


from app.database.core import (
    AsyncSessionLocal,
    ReadingSession,
    SentenceLearningRecord,
)
from app.models.orm import VoiceSession

logger = logging.getLogger(__name__)


async def get_performance_data(days: int = 30) -> Dict[str, Any]:
    """
    Get simplified performance data for dashboard.
    Returns: study time, reading stats, and memory curve data.
    """
    async with AsyncSessionLocal() as session:
        try:
            result = {}
            cutoff = datetime.utcnow() - timedelta(days=days)

            # --- Study Time ---
            # From SentenceLearningRecord (Sentence Study mode)
            sentence_time_stmt = select(
                func.sum(SentenceLearningRecord.dwell_time_ms)
            ).where(SentenceLearningRecord.created_at >= cutoff)
            sentence_time_res = await session.execute(sentence_time_stmt)
            sentence_ms = sentence_time_res.scalar() or 0
            sentence_seconds = sentence_ms // 1000

            # From ReadingSession (Reading mode)
            reading_time_stmt = select(
                func.sum(ReadingSession.total_active_seconds)
            ).where(ReadingSession.started_at >= cutoff)
            reading_time_res = await session.execute(reading_time_stmt)
            reading_seconds = reading_time_res.scalar() or 0

            # From VoiceSession (Voice mode)
            voice_time_stmt = select(func.sum(VoiceSession.total_active_seconds)).where(
                VoiceSession.started_at >= cutoff
            )
            voice_time_res = await session.execute(voice_time_stmt)
            voice_seconds = voice_time_res.scalar() or 0

            total_study_seconds = sentence_seconds + reading_seconds + voice_seconds

            result["study_time"] = {
                "total_seconds": total_study_seconds,
                "total_minutes": round(total_study_seconds / 60),
                "breakdown": {
                    "sentence_study": sentence_seconds,
                    "reading": reading_seconds,
                    "voice": voice_seconds,
                },
            }

            # --- Reading Stats ---
            # From ReadingSession (Reading Mode)
            reading_stmt = select(
                func.sum(ReadingSession.validated_word_count),
                func.count(ReadingSession.id),
                func.count(func.distinct(ReadingSession.source_id)),
            ).where(
                ReadingSession.started_at >= cutoff,
                ReadingSession.reading_quality.in_(["high", "medium", "low"]),
            )
            reading_res = await session.execute(reading_stmt)
            row = reading_res.first()

            reading_words = row[0] or 0
            reading_sessions = row[1] or 0
            reading_articles = row[2] or 0

            # From SentenceLearningRecord (Sentence Study Mode)
            sentence_stmt = select(
                func.sum(SentenceLearningRecord.word_count),
                func.count(func.distinct(SentenceLearningRecord.source_id)),
            ).where(SentenceLearningRecord.created_at >= cutoff)
            sentence_res = await session.execute(sentence_stmt)
            sentence_row = sentence_res.first()

            sentence_words = sentence_row[0] or 0
            sentence_articles = sentence_row[1] or 0

            result["reading_stats"] = {
                "total_words": reading_words + sentence_words,
                "sessions_count": reading_sessions,
                "articles_count": reading_articles + sentence_articles,
                "breakdown": {
                    "reading_mode": reading_words,
                    "sentence_study": sentence_words,
                },
            }

            return result

        except Exception:
            logger.exception("DB Error get_performance_data")
            return {
                "study_time": {"total_seconds": 0, "total_minutes": 0, "breakdown": {}},
                "reading_stats": {
                    "total_words": 0,
                    "sessions_count": 0,
                    "articles_count": 0,
                },
            }


async def get_daily_study_time(days: int = 30) -> Dict[str, Any]:
    """
    Get daily study time breakdown for the last N days.
    Groups by day and mode (sentence study, reading, voice).
    """
    async with AsyncSessionLocal() as session:
        try:
            cutoff = datetime.utcnow() - timedelta(days=days)

            # Helper to group by day (compatible with Postgres)
            # day_group = func.date_trunc("day", SentenceLearningRecord.created_at)

            # 1. Sentence Study by Day
            sentence_stmt = (
                select(
                    func.date_trunc("day", SentenceLearningRecord.created_at).label(
                        "day"
                    ),
                    func.sum(SentenceLearningRecord.dwell_time_ms),
                )
                .where(SentenceLearningRecord.created_at >= cutoff)
                .group_by("day")
                .order_by("day")
            )
            sentence_res = await session.execute(sentence_stmt)
            sentence_days = {
                row[0].date().isoformat(): (row[1] or 0) // 1000 for row in sentence_res
            }

            # 2. Reading by Day
            reading_stmt = (
                select(
                    func.date_trunc("day", ReadingSession.started_at).label("day"),
                    func.sum(ReadingSession.total_active_seconds),
                )
                .where(ReadingSession.started_at >= cutoff)
                .group_by("day")
                .order_by("day")
            )
            reading_res = await session.execute(reading_stmt)
            reading_days = {
                row[0].date().isoformat(): row[1] or 0 for row in reading_res
            }

            # 3. Voice by Day
            voice_stmt = (
                select(
                    func.date_trunc("day", VoiceSession.started_at).label("day"),
                    func.sum(VoiceSession.total_active_seconds),
                )
                .where(VoiceSession.started_at >= cutoff)
                .group_by("day")
                .order_by("day")
            )
            voice_res = await session.execute(voice_stmt)
            voice_days = {row[0].date().isoformat(): row[1] or 0 for row in voice_res}

            # Merge all days
            all_dates = sorted(
                list(
                    set(
                        list(sentence_days.keys())
                        + list(reading_days.keys())
                        + list(voice_days.keys())
                    )
                )
            )

            daily_data = []
            for date_str in all_dates:
                s_sec = sentence_days.get(date_str, 0)
                r_sec = reading_days.get(date_str, 0)
                v_sec = voice_days.get(date_str, 0)
                daily_data.append(
                    {
                        "date": date_str,
                        "sentence_study": s_sec,
                        "reading": r_sec,
                        "voice": v_sec,
                        "total": s_sec + r_sec + v_sec,
                    }
                )

            return {
                "daily": daily_data,
                "total_seconds": sum(d["total"] for d in daily_data),
            }

        except Exception:
            logger.exception("DB Error get_daily_study_time")
            return {"daily": [], "total_seconds": 0}


async def get_memory_curve_data(user_id: str = "default_user") -> Dict[str, Any]:
    """
    Calculate retention rate at different time intervals using SM-2 review logs.
    Compares actual user performance vs theoretical Ebbinghaus curve.

    Uses ReviewLog data from the SM-2 spaced repetition system for accurate tracking.
    """
    from app.models.orm import ReviewItem, ReviewLog

    async with AsyncSessionLocal() as session:
        try:
            # Time buckets and their interval ranges
            # Bucket name -> (min_interval, max_interval)
            bucket_ranges = {
                1: (0, 2),
                3: (2, 5),
                7: (5, 10),
                14: (10, 21),
                30: (21, 45),
            }

            # ⚡ OPTIMIZATION: Fetch all relevant logs in a single query instead of one per bucket.
            # This reduces DB round-trips from N (buckets) to 1.

            # 1. Fetch all logs within the max range (45 days)
            stmt = (
                select(ReviewLog.interval_at_review, ReviewLog.quality)
                .join(ReviewItem)
                .where(ReviewItem.user_id == user_id)
                .where(ReviewLog.interval_at_review < 45)
            )
            result = await session.execute(stmt)
            logs = result.all()  # Returns list of (interval, quality) tuples

            # 2. Bucket the data in memory
            # structure: {day: {'total': 0, 'success': 0}}
            buckets = {day: {"total": 0, "success": 0} for day in bucket_ranges}

            for interval, quality in logs:
                for day, (min_int, max_int) in bucket_ranges.items():
                    if min_int <= interval < max_int:
                        buckets[day]["total"] += 1
                        if quality >= 3:  # 3+ is considered "remembered"
                            buckets[day]["success"] += 1
                        break

            # 3. Calculate stats from buckets
            actual_curve = []
            total_reviews = 0
            successful_reviews = 0

            for day, stats in buckets.items():
                count = stats["total"]
                if count > 0:
                    retention = stats["success"] / count
                    total_reviews += count
                    successful_reviews += stats["success"]
                else:
                    retention = None

                actual_curve.append(
                    {
                        "day": day,
                        "retention": round(retention, 2)
                        if retention is not None
                        else None,
                        "sample_size": count,
                    }
                )

            # Ebbinghaus theoretical curve: R = e^(-t/S) where S is stability
            # Using S = 10 as a reasonable default
            S = 10
            ebbinghaus_curve = [
                {"day": day, "retention": round(math.exp(-day / S), 2)}
                for day in [1, 3, 7, 14, 30]
            ]

            return {
                "actual": actual_curve,
                "ebbinghaus": ebbinghaus_curve,
                "total_reviews": total_reviews,
                "successful_reviews": successful_reviews,
            }

        except Exception:
            logger.exception("DB Error get_memory_curve_data")
            return {"actual": [], "ebbinghaus": [], "total_words_analyzed": 0}
