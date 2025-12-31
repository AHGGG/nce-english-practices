from typing import Dict, Any
from datetime import datetime, timedelta
import logging
from sqlalchemy import select, func, desc

from app.database.core import AsyncSessionLocal, UserGoal, WordProficiency, Attempt, VocabLearningLog

logger = logging.getLogger(__name__)

# --- Daily Goals ---

DEFAULT_GOALS = {
    'new_words': 10,
    'review_words': 20,
    'study_minutes': 30,
    'reading_words': 500
}

GOAL_LABELS = {
    'new_words': '新学单词',
    'review_words': '复习单词',
    'study_minutes': '学习时长(分钟)',
    'reading_words': '阅读字数'
}


async def get_user_goals(user_id: str = "default_user") -> Dict[str, Any]:
    """Get user's daily goals or return defaults."""
    async with AsyncSessionLocal() as session:
        try:
            stmt = select(UserGoal).where(
                UserGoal.user_id == user_id,
                UserGoal.is_active == True
            )
            result = await session.execute(stmt)
            goals = result.scalars().all()
            
            # Build goal dict, falling back to defaults
            goal_dict = dict(DEFAULT_GOALS)  # Start with defaults
            for g in goals:
                goal_dict[g.goal_type] = g.target_value
            
            return {
                'goals': [
                    {
                        'type': k,
                        'label': GOAL_LABELS.get(k, k),
                        'target': v
                    }
                    for k, v in goal_dict.items()
                ]
            }
        except Exception as e:
            logger.exception("DB Error get_user_goals")
            return {'goals': []}


async def update_user_goals(user_id: str, goals: Dict[str, int]) -> bool:
    """Update user's daily goals."""
    async with AsyncSessionLocal() as session:
        try:
            for goal_type, target_value in goals.items():
                if goal_type not in DEFAULT_GOALS:
                    continue
                    
                # Check if goal exists
                stmt = select(UserGoal).where(
                    UserGoal.user_id == user_id,
                    UserGoal.goal_type == goal_type
                )
                result = await session.execute(stmt)
                existing = result.scalar_one_or_none()
                
                if existing:
                    existing.target_value = target_value
                    existing.is_active = True
                else:
                    new_goal = UserGoal(
                        user_id=user_id,
                        goal_type=goal_type,
                        target_value=target_value,
                        is_active=True
                    )
                    session.add(new_goal)
            
            await session.commit()
            return True
        except Exception as e:
            logger.exception("DB Error update_user_goals")
            await session.rollback()
            return False


async def get_goals_progress(user_id: str = "default_user") -> Dict[str, Any]:
    """Calculate today's progress toward goals."""
    
    async with AsyncSessionLocal() as session:
        try:
            today = datetime.utcnow().date()
            today_start = datetime.combine(today, datetime.min.time())
            today_end = today_start + timedelta(days=1)
            
            # Get user goals
            goals_data = await get_user_goals(user_id)
            goals = {g['type']: g['target'] for g in goals_data.get('goals', [])}
            
            progress = {}
            
            # New words today (words first seen today)
            new_words_stmt = select(func.count(func.distinct(WordProficiency.word))).where(
                WordProficiency.user_id == user_id,
                WordProficiency.first_seen_at >= today_start,
                WordProficiency.first_seen_at < today_end
            )
            new_words_res = await session.execute(new_words_stmt)
            new_words_count = new_words_res.scalar() or 0
            
            # Review words today (words seen again today, not first time)
            review_stmt = select(func.count(func.distinct(WordProficiency.word))).where(
                WordProficiency.user_id == user_id,
                WordProficiency.last_seen_at >= today_start,
                WordProficiency.last_seen_at < today_end,
                WordProficiency.first_seen_at < today_start  # Not first seen today
            )
            review_res = await session.execute(review_stmt)
            review_count = review_res.scalar() or 0
            
            # Study minutes today
            study_stmt = select(func.sum(Attempt.duration_seconds)).where(
                Attempt.created_at >= today_start,
                Attempt.created_at < today_end
            )
            study_res = await session.execute(study_stmt)
            study_seconds = study_res.scalar() or 0
            study_minutes = round(study_seconds / 60)
            
            # Reading words today (from context sentences)
            reading_stmt = select(VocabLearningLog).where(
                VocabLearningLog.user_id == user_id,
                VocabLearningLog.created_at >= today_start,
                VocabLearningLog.created_at < today_end,
                VocabLearningLog.context_sentence.isnot(None)
            )
            reading_res = await session.execute(reading_stmt)
            logs = reading_res.scalars().all()
            reading_words = sum(len(log.context_sentence.split()) for log in logs if log.context_sentence)
            
            # Build progress response
            actuals = {
                'new_words': new_words_count,
                'review_words': review_count,
                'study_minutes': study_minutes,
                'reading_words': reading_words
            }
            
            for goal_type, target in goals.items():
                actual = actuals.get(goal_type, 0)
                progress[goal_type] = {
                    'target': target,
                    'actual': actual,
                    'percent': min(round((actual / target) * 100), 100) if target > 0 else 0,
                    'completed': actual >= target
                }
            
            return {'date': str(today), 'progress': progress}
            
        except Exception as e:
            logger.exception("DB Error get_goals_progress")
            return {'date': str(datetime.utcnow().date()), 'progress': {}}
