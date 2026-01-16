"""
Simplified Performance Dashboard Data.
Only provides: reading stats, study time (Sentence Study + Reading), and memory curve.
"""

from typing import Dict, Any
from datetime import datetime, timedelta
import math
import logging
from sqlalchemy import select, func, case, and_, union_all, literal


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

            # ⚡ OPTIMIZATION: Combine 4 queries into 1 using UNION ALL
            # This reduces database round-trips from 4 to 1.

            # Common subqueries

            # 1. Sentence Study: sum(dwell_time_ms) / 1000 -> seconds
            q1 = select(
                func.date_trunc("day", SentenceLearningRecord.created_at).label("day"),
                (func.sum(SentenceLearningRecord.dwell_time_ms) / 1000).label("seconds"),
                literal("sentence").label("type")
            ).where(SentenceLearningRecord.created_at >= cutoff).group_by("day")

            # 2. Reading: sum(total_active_seconds) -> seconds
            q2 = select(
                func.date_trunc("day", ReadingSession.started_at).label("day"),
                func.sum(ReadingSession.total_active_seconds).label("seconds"),
                literal("reading").label("type")
            ).where(ReadingSession.started_at >= cutoff).group_by("day")

            # 3. Voice: sum(total_active_seconds) -> seconds
            q3 = select(
                func.date_trunc("day", VoiceSession.started_at).label("day"),
                func.sum(VoiceSession.total_active_seconds).label("seconds"),
                literal("voice").label("type")
            ).where(VoiceSession.started_at >= cutoff).group_by("day")

            # 4. Review: sum(duration_ms) / 1000 -> seconds
            q4 = select(
                func.date_trunc("day", ReviewLog.reviewed_at).label("day"),
                (func.sum(ReviewLog.duration_ms) / 1000).label("seconds"),
                literal("review").label("type")
            ).where(ReviewLog.reviewed_at >= cutoff).group_by("day")

            # Combine all
            union_stmt = union_all(q1, q2, q3, q4).order_by("day")

            result = await session.execute(union_stmt)

            # Process result
            daily_map = {}
            for row in result:
                # row is (day, seconds, type)
                if not row.day:
                    continue

                day_str = row.day.date().isoformat()
                seconds = int(row.seconds or 0)
                type_ = row.type

                # Initialize map for this day if missing
                if day_str not in daily_map:
                    daily_map[day_str] = {
                        "sentence_study": 0,
                        "reading": 0,
                        "voice": 0,
                        "review": 0,
                        "total": 0
                    }

                # Map SQL type to JSON key
                key_map = {
                    "sentence": "sentence_study",
                    "reading": "reading",
                    "voice": "voice",
                    "review": "review"
                }

                key = key_map.get(type_, type_)

                # Safeguard against unexpected types (though we control them in literal)
                if key in daily_map[day_str]:
                    daily_map[day_str][key] += seconds
                    daily_map[day_str]["total"] += seconds

            # Convert map to sorted list
            daily_data = []
            for date_str in sorted(daily_map.keys()):
                entry = daily_map[date_str]
                entry["date"] = date_str
                daily_data.append(entry)

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
                for day in [1, 3, 7, 14, 30]
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
