"""
Simplified Performance Dashboard Data.
Only provides: reading stats, study time (Sentence Study + Reading), and memory curve.
"""
from typing import Dict, Any
from datetime import datetime, timedelta
import math
import logging
from sqlalchemy import select, func


from app.database.core import AsyncSessionLocal, ReadingSession, SentenceLearningRecord, WordProficiency
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
            sentence_time_stmt = select(func.sum(SentenceLearningRecord.dwell_time_ms)).where(
                SentenceLearningRecord.created_at >= cutoff
            )
            sentence_time_res = await session.execute(sentence_time_stmt)
            sentence_ms = sentence_time_res.scalar() or 0
            sentence_seconds = sentence_ms // 1000
            
            # From ReadingSession (Reading mode)
            reading_time_stmt = select(func.sum(ReadingSession.total_active_seconds)).where(
                ReadingSession.started_at >= cutoff
            )
            reading_time_res = await session.execute(reading_time_stmt)
            reading_seconds = reading_time_res.scalar() or 0
            
            # From VoiceSession (Voice mode)
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
            # From ReadingSession (Reading Mode)
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
            
            # From SentenceLearningRecord (Sentence Study Mode)
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
            
        except Exception as e:
            logger.exception("DB Error get_performance_data")
            return {
                'study_time': {'total_seconds': 0, 'total_minutes': 0, 'breakdown': {}},
                'reading_stats': {'total_words': 0, 'sessions_count': 0, 'articles_count': 0}
            }


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
                30: (21, 45)
            }
            
            actual_curve = []
            total_reviews = 0
            successful_reviews = 0
            
            # Optimization: Fetch all relevant logs in one query instead of looping
            # Fetch minimal data needed: quality and interval

            # Dynamically determine the max interval to query based on configured buckets
            # Flatten ranges to find the absolute max needed
            max_query_interval = max(r[1] for r in bucket_ranges.values())

            stmt = (
                select(ReviewLog.quality, ReviewLog.interval_at_review)
                .join(ReviewItem)
                .where(ReviewItem.user_id == user_id)
                .where(ReviewLog.interval_at_review >= 0)
                .where(ReviewLog.interval_at_review < max_query_interval)
            )
            result = await session.execute(stmt)
            all_logs = result.all() # List of (quality, interval)

            # Group into buckets in memory
            # bucket_ranges = { 1: (0, 2), 3: (2, 5), ... }
            bucket_data = {day: {'total': 0, 'success': 0} for day in bucket_ranges}

            for quality, interval in all_logs:
                for day, (min_int, max_int) in bucket_ranges.items():
                    if min_int <= interval < max_int:
                        bucket_data[day]['total'] += 1
                        if quality >= 3:
                            bucket_data[day]['success'] += 1
                        break # Found the bucket, move to next log

            # Build the response curve
            for day in bucket_ranges:
                data = bucket_data[day]
                count = data['total']
                successes = data['success']
                
                if count > 0:
                    retention = successes / count
                    total_reviews += count
                    successful_reviews += successes
                else:
                    retention = None
                
                actual_curve.append({
                    'day': day,
                    'retention': round(retention, 2) if retention is not None else None,
                    'sample_size': count
                })
            
            # Ebbinghaus theoretical curve: R = e^(-t/S) where S is stability
            # Using S = 10 as a reasonable default
            S = 10
            ebbinghaus_curve = [
                {'day': day, 'retention': round(math.exp(-day / S), 2)}
                for day in [1, 3, 7, 14, 30]
            ]
            
            return {
                'actual': actual_curve,
                'ebbinghaus': ebbinghaus_curve,
                'total_words_analyzed': total_reviews,  # Now tracks review count
                'successful_reviews': successful_reviews
            }
            
        except Exception as e:
            logger.exception("DB Error get_memory_curve_data")
            return {
                'actual': [],
                'ebbinghaus': [],
                'total_words_analyzed': 0
            }

