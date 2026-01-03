"""
Simplified Performance Dashboard Data.
Only provides: reading stats, study time (Sentence Study + Reading), and memory curve.
"""
from typing import Dict, Any
from datetime import datetime, timedelta
import math
import logging
from sqlalchemy import select, func, case


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
            
            # --- Combined Queries for Efficiency ---
            
            # 1. Reading: Time + Stats
            # Combined query to fetch total time (all sessions) and stats (quality sessions only)
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
            # Combined query to fetch dwell time and learning stats
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
            
        except Exception as e:
            logger.exception("DB Error get_performance_data")
            return {
                'study_time': {'total_seconds': 0, 'total_minutes': 0, 'breakdown': {}},
                'reading_stats': {'total_words': 0, 'sessions_count': 0, 'articles_count': 0}
            }


async def get_memory_curve_data(user_id: str = "default_user") -> Dict[str, Any]:
    """
    Calculate retention rate at different time intervals.
    Compares actual user performance vs theoretical Ebbinghaus curve.
    """
    async with AsyncSessionLocal() as session:
        try:
            now = datetime.utcnow()
            
            # Get words with their first_seen and last_seen dates
            stmt = select(WordProficiency).where(
                WordProficiency.user_id == user_id,
                WordProficiency.exposure_count > 1  # Need multiple exposures
            )
            result = await session.execute(stmt)
            words = result.scalars().all()
            
            # Calculate retention for each time bucket (days since first seen)
            buckets = {1: [], 3: [], 7: [], 14: [], 30: []}
            
            for word in words:
                days_since_first = (word.last_seen_at - word.first_seen_at).days
                
                # Calculate retention: 1 if remembered (continue_count > 0), else check huh ratio
                if word.exposure_count > 0:
                    retention = 1 - (word.huh_count / word.exposure_count)
                else:
                    retention = 1.0
                
                # Assign to nearest bucket
                for bucket in sorted(buckets.keys()):
                    if days_since_first <= bucket:
                        buckets[bucket].append(retention)
                        break
            
            # Calculate average retention per bucket
            actual_curve = []
            for day in sorted(buckets.keys()):
                values = buckets[day]
                if values:
                    avg_retention = sum(values) / len(values)
                else:
                    avg_retention = None
                actual_curve.append({
                    'day': day,
                    'retention': round(avg_retention, 2) if avg_retention is not None else None,
                    'sample_size': len(values)
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
                'total_words_analyzed': len(words)
            }
            
        except Exception as e:
            logger.exception("DB Error get_memory_curve_data")
            return {
                'actual': [],
                'ebbinghaus': [],
                'total_words_analyzed': 0
            }
