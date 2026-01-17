"""
Simplified Performance Dashboard Data.
Only provides: reading stats, study time (Sentence Study + Reading), and memory curve.
"""

from typing import Dict, Any
from datetime import datetime, timedelta
import math
import logging
from sqlalchemy import select, func, case, and_


from app.database.core import (
    AsyncSessionLocal,
    ReadingSession,
    SentenceLearningRecord,
)
from app.models.orm import VoiceSession, ReviewLog

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

            # ⚡ OPTIMIZATION: Combine 4 independent aggregation queries into ONE database round-trip.
            # Previously: 4 sequential 'await session.execute()' calls (4x latency).
            # Now: 1 query using scalar subqueries.

            # 1. Sentence Learning Records Subquery
            sentence_subq = select(
                func.sum(SentenceLearningRecord.dwell_time_ms).label("s_time"),
                func.sum(SentenceLearningRecord.word_count).label("s_words"),
                func.count(func.distinct(SentenceLearningRecord.source_id)).label("s_articles")
            ).where(SentenceLearningRecord.created_at >= cutoff).subquery()

            # 2. Reading Sessions Subquery
            # DRY: Reusable filter condition
            has_valid_quality = ReadingSession.reading_quality.in_(["high", "medium", "low"])

            reading_subq = select(
                func.sum(ReadingSession.total_active_seconds).label("r_time"),
                func.sum(case((has_valid_quality, ReadingSession.validated_word_count), else_=0)).label("r_words"),
                func.count(case((has_valid_quality, ReadingSession.id), else_=None)).label("r_sessions"),
                func.count(func.distinct(case((has_valid_quality, ReadingSession.source_id), else_=None))).label("r_articles")
            ).where(ReadingSession.started_at >= cutoff).subquery()

            # 3. Voice Sessions Subquery
            voice_subq = select(
                func.sum(VoiceSession.total_active_seconds).label("v_time")
            ).where(VoiceSession.started_at >= cutoff).subquery()

            # 4. Review Sessions Subquery
            review_subq = select(
                func.sum(ReviewLog.duration_ms).label("rv_time")
            ).where(ReviewLog.reviewed_at >= cutoff).subquery()

            # Combined Query
            # Selecting columns from multiple subqueries creates a Cartesian product (cross join).
            # Since each subquery returns exactly 1 row (aggregate), the result is exactly 1 row.
            stmt = select(
                sentence_subq.c.s_time,
                sentence_subq.c.s_words,
                sentence_subq.c.s_articles,
                reading_subq.c.r_time,
                reading_subq.c.r_words,
                reading_subq.c.r_sessions,
                reading_subq.c.r_articles,
                voice_subq.c.v_time,
                review_subq.c.rv_time
            )

            res = await session.execute(stmt)
            row = res.first()

            # Extract results (handle None from SUM)
            sentence_ms = row.s_time or 0
            sentence_seconds = sentence_ms // 1000
            sentence_words = row.s_words or 0
            sentence_articles = row.s_articles or 0

            reading_seconds = row.r_time or 0
            reading_words = row.r_words or 0
            reading_sessions = row.r_sessions or 0
            reading_articles = row.r_articles or 0

            voice_seconds = row.v_time or 0

            review_ms = row.rv_time or 0
            review_seconds = review_ms // 1000

            total_study_seconds = sentence_seconds + reading_seconds + voice_seconds + review_seconds

            result["study_time"] = {
                "total_seconds": total_study_seconds,
                "total_minutes": round(total_study_seconds / 60),
                "breakdown": {
                    "sentence_study": sentence_seconds,
                    "reading": reading_seconds,
                    "voice": voice_seconds,
                    "review": review_seconds,
                },
            }

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

            # 4. Review by Day
            review_stmt = (
                select(
                    func.date_trunc("day", ReviewLog.reviewed_at).label("day"),
                    func.sum(ReviewLog.duration_ms),
                )
                .where(ReviewLog.reviewed_at >= cutoff)
                .group_by("day")
                .order_by("day")
            )
            review_res = await session.execute(review_stmt)
            review_days = {
                row[0].date().isoformat(): (row[1] or 0) // 1000 for row in review_res
            }

            # Merge all days
            all_dates = sorted(
                list(
                    set(
                        list(sentence_days.keys())
                        + list(reading_days.keys())
                        + list(voice_days.keys())
                        + list(review_days.keys())
                    )
                )
            )

            daily_data = []
            for date_str in all_dates:
                s_sec = sentence_days.get(date_str, 0)
                r_sec = reading_days.get(date_str, 0)
                v_sec = voice_days.get(date_str, 0)
                rv_sec = review_days.get(date_str, 0)
                daily_data.append(
                    {
                        "date": date_str,
                        "sentence_study": s_sec,
                        "reading": r_sec,
                        "voice": v_sec,
                        "review": rv_sec,
                        "total": s_sec + r_sec + v_sec + rv_sec,
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
            # SM-2 Optimized Buckets:
            # SM-2 intervals: 1 → 6 → ~15 → ~37 days
            # Bucket boundaries designed to capture each SM-2 stage
            bucket_ranges = {
                1: (0, 3),     # Day 1: First review (interval=1)
                6: (3, 10),    # Day 6: Second review (interval=6)
                15: (10, 25),  # Day 15: Third review (interval≈15)
                40: (25, 60),  # Day 40: Fourth+ review (interval≈37+)
            }

            # ⚡ OPTIMIZATION: Use database aggregation instead of fetching all logs.
            # This reduces data transfer and leverages DB engine for counting.

            selections = []
            sorted_days = sorted(bucket_ranges.keys())

            for day in sorted_days:
                min_int, max_int = bucket_ranges[day]
                bucket_cond = and_(
                    ReviewLog.interval_at_review >= min_int,
                    ReviewLog.interval_at_review < max_int
                )
                # Count Total in bucket
                selections.append(
                    func.count(case((bucket_cond, 1), else_=None))
                )
                # Count Success in bucket (quality >= 3)
                selections.append(
                    func.count(case((and_(bucket_cond, ReviewLog.quality >= 3), 1), else_=None))
                )

            stmt = (
                select(*selections)
                .join(ReviewItem)
                .where(ReviewItem.user_id == user_id)
                .where(ReviewLog.interval_at_review < 45)
            )

            result = await session.execute(stmt)
            row = result.one()

            actual_curve = []
            total_reviews = 0
            successful_reviews = 0

            for i, day in enumerate(sorted_days):
                total_idx = i * 2
                success_idx = i * 2 + 1

                count = row[total_idx] or 0
                success = row[success_idx] or 0

                if count > 0:
                    retention = success / count
                    total_reviews += count
                    successful_reviews += success
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
                for day in [1, 6, 15, 40]  # Match SM-2 bucket days
            ]

            return {
                "actual": actual_curve,
                "ebbinghaus": ebbinghaus_curve,
                "total_words_analyzed": total_reviews,
                "successful_recalls": successful_reviews,
            }

        except Exception:
            logger.exception("DB Error get_memory_curve_data")
            return {"actual": [], "ebbinghaus": [], "total_words_analyzed": 0}
