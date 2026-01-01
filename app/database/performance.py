from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import math
import logging
from sqlalchemy import select, func, desc, Integer

from app.database.core import AsyncSessionLocal, WordProficiency, Attempt, VocabLearningLog, ReadingSession

logger = logging.getLogger(__name__)

# --- Performance Dashboard ---

async def get_performance_data(days: int = 30) -> Dict[str, Any]:
    """
    Aggregate performance data for the dashboard.
    Returns vocabulary stats, activity heatmap, and source distribution.
    """
    
    async with AsyncSessionLocal() as session:
        try:
            result = {}
            cutoff = datetime.utcnow() - timedelta(days=days)
            
            # --- Summary Stats ---
            
            # Vocab size: distinct words with status != 'new'
            vocab_stmt = select(func.count(func.distinct(WordProficiency.word))).where(
                WordProficiency.status != 'new'
            )
            vocab_res = await session.execute(vocab_stmt)
            vocab_size = vocab_res.scalar() or 0
            
            # Total encountered
            total_stmt = select(func.count(func.distinct(WordProficiency.word)))
            total_res = await session.execute(total_stmt)
            total_encountered = total_res.scalar() or 0
            
            # Mastery rate
            mastered_stmt = select(func.count()).where(WordProficiency.status == 'mastered')
            mastered_res = await session.execute(mastered_stmt)
            mastered_count = mastered_res.scalar() or 0
            mastery_rate = mastered_count / total_encountered if total_encountered > 0 else 0
            
            # Comprehension score: 1 - avg(huh_count / exposure_count)
            comp_stmt = select(
                func.sum(WordProficiency.huh_count),
                func.sum(WordProficiency.exposure_count)
            ).where(WordProficiency.exposure_count > 0)
            comp_res = await session.execute(comp_stmt)
            huh_sum, exp_sum = comp_res.one()
            comprehension = 1 - (huh_sum / exp_sum) if exp_sum and exp_sum > 0 else 1.0
            
            # Total study time
            time_stmt = select(func.sum(Attempt.duration_seconds))
            time_res = await session.execute(time_stmt)
            total_seconds = time_res.scalar() or 0
            
            result['summary'] = {
                'vocab_size': vocab_size,
                'mastery_rate': round(mastery_rate, 2),
                'comprehension_score': round(comprehension, 2),
                'total_study_minutes': round(total_seconds / 60)
            }
            
            # --- Vocabulary Distribution ---
            dist_stmt = select(
                WordProficiency.status,
                func.count()
            ).group_by(WordProficiency.status)
            dist_res = await session.execute(dist_stmt)
            distribution = {row.status: row[1] for row in dist_res.all()}
            
            # Difficult words (top 10 by difficulty_score)
            diff_stmt = select(WordProficiency).where(
                WordProficiency.difficulty_score > 0
            ).order_by(desc(WordProficiency.difficulty_score)).limit(10)
            diff_res = await session.execute(diff_stmt)
            difficult_words = [
                {'word': w.word, 'difficulty': round(w.difficulty_score, 2), 'huh_count': w.huh_count}
                for w in diff_res.scalars().all()
            ]
            
            # Recent words (last 20)
            recent_words_stmt = select(VocabLearningLog).order_by(
                desc(VocabLearningLog.created_at)
            ).limit(20)
            recent_res = await session.execute(recent_words_stmt)
            recent_words = [
                {'word': r.word, 'source': r.source_type, 'timestamp': r.created_at.isoformat()}
                for r in recent_res.scalars().all()
            ]
            
            result['vocabulary'] = {
                'distribution': distribution,
                'difficult_words': difficult_words,
                'recent_words': recent_words
            }
            
            # --- Daily Activity (Heatmap) ---
            # Combine Attempt and VocabLearningLog counts by date
            activity_stmt = select(
                func.date(Attempt.created_at).label('date'),
                func.count().label('count')
            ).where(Attempt.created_at >= cutoff).group_by(func.date(Attempt.created_at))
            activity_res = await session.execute(activity_stmt)
            attempt_counts = {str(row.date): row.count for row in activity_res.all()}
            
            vocab_activity_stmt = select(
                func.date(VocabLearningLog.created_at).label('date'),
                func.count().label('count')
            ).where(VocabLearningLog.created_at >= cutoff).group_by(func.date(VocabLearningLog.created_at))
            vocab_res = await session.execute(vocab_activity_stmt)
            vocab_counts = {str(row.date): row.count for row in vocab_res.all()}
            
            # Merge counts
            all_dates = set(attempt_counts.keys()) | set(vocab_counts.keys())
            daily_counts = [
                {'date': d, 'count': attempt_counts.get(d, 0) + vocab_counts.get(d, 0)}
                for d in sorted(all_dates)
            ]
            
            # Activity by type
            type_stmt = select(
                Attempt.activity_type,
                func.count().label('count'),
                func.sum(func.cast(Attempt.is_pass, Integer)).label('passed')
            ).group_by(Attempt.activity_type)
            type_res = await session.execute(type_stmt)
            by_type = {
                row.activity_type: {'count': row.count, 'passed': row.passed or 0}
                for row in type_res.all()
            }
            
            result['activity'] = {
                'daily_counts': daily_counts,
                'by_type': by_type
            }
            
            # --- Source Distribution ---
            source_stmt = select(
                VocabLearningLog.source_type,
                func.count().label('count')
            ).group_by(VocabLearningLog.source_type)
            source_res = await session.execute(source_stmt)
            source_dist = {row.source_type: row.count for row in source_res.all()}
            
            result['sources'] = {
                'distribution': source_dist
            }
            
            return result
            
        except Exception as e:
            logger.exception("DB Error get_performance_data")
            return {
                'summary': {'vocab_size': 0, 'mastery_rate': 0, 'comprehension_score': 0, 'total_study_minutes': 0},
                'vocabulary': {'distribution': {}, 'difficult_words': [], 'recent_words': []},
                'activity': {'daily_counts': [], 'by_type': {}},
                'sources': {'distribution': {}}
            }

async def get_due_reviews_count() -> int:
    """Get count of words/notes due for review (SRS). Deprecated - returns 0."""
    return 0


async def get_milestones(user_id: str = "default_user") -> Dict[str, Any]:
    """
    Calculate milestone badges based on current stats.
    Returns achieved milestones without persisting to DB.
    """
    async with AsyncSessionLocal() as session:
        try:
            # Vocabulary size (words with status != 'new')
            vocab_stmt = select(func.count(func.distinct(WordProficiency.word))).where(
                WordProficiency.status != 'new',
                WordProficiency.user_id == user_id
            )
            vocab_res = await session.execute(vocab_stmt)
            vocab_size = vocab_res.scalar() or 0
            
            # Calculate streak (consecutive days with activity)
            
            # Get all activity dates
            attempt_dates_stmt = select(func.date(Attempt.created_at).label('date')).distinct()
            attempt_res = await session.execute(attempt_dates_stmt)
            attempt_dates = {row.date for row in attempt_res.all()}
            
            vocab_dates_stmt = select(func.date(VocabLearningLog.created_at).label('date')).distinct()
            vocab_res = await session.execute(vocab_dates_stmt)
            vocab_dates = {row.date for row in vocab_res.all()}
            
            all_dates = attempt_dates | vocab_dates
            
            # Calculate current streak
            streak = 0
            today = datetime.utcnow().date()
            check_date = today
            
            while check_date in all_dates:
                streak += 1
                check_date -= timedelta(days=1)
            
            # Vocab milestones
            vocab_tiers = [
                (50, "🌱", "Seedling"),
                (100, "🌿", "Sprout"),
                (500, "🌲", "Sapling"),
                (1000, "🌳", "Tree"),
                (2000, "🌲🌲", "Grove"),
                (3000, "🏔️", "Forest"),
                (5000, "⛰️", "Mountain"),
                (10000, "🗻", "Everest"),
            ]
            
            vocab_milestones = []
            for threshold, icon, name in vocab_tiers:
                achieved = vocab_size >= threshold
                vocab_milestones.append({
                    "threshold": threshold,
                    "icon": icon,
                    "name": name,
                    "achieved": achieved,
                    "progress": min(vocab_size / threshold, 1.0) if not achieved else 1.0
                })
            
            # Streak milestones
            streak_tiers = [
                (7, "🔥", "Week Warrior"),
                (30, "💪", "Monthly Master"),
                (100, "🏆", "Century Club"),
                (365, "👑", "Year Champion"),
            ]
            
            streak_milestones = []
            for threshold, icon, name in streak_tiers:
                achieved = streak >= threshold
                streak_milestones.append({
                    "threshold": threshold,
                    "icon": icon,
                    "name": name,
                    "achieved": achieved,
                    "progress": min(streak / threshold, 1.0) if not achieved else 1.0
                })
            
            return {
                "vocab_size": vocab_size,
                "current_streak": streak,
                "vocab_milestones": vocab_milestones,
                "streak_milestones": streak_milestones
            }
            
        except Exception as e:
            logger.exception("DB Error get_milestones")
            return {
                "vocab_size": 0,
                "current_streak": 0,
                "vocab_milestones": [],
                "streak_milestones": []
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
