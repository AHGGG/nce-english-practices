import json
from datetime import datetime
from typing import Dict, List, Any, Optional


from sqlalchemy import select, update, desc, func, Integer
from sqlalchemy.orm import selectinload

from app.core.db import AsyncSessionLocal
from app.models.orm import (
    SessionLog, Story, Attempt, ReviewNote, SRSSchedule, ChatSession,
    CoachSession, UserMemory, UserProgress, WordProficiency, VocabLearningLog,
    UserGoal, ReadingSession
)

# --- Session / Theme ---

async def log_session(topic: str, vocab_data: Dict[str, Any]):
    async with AsyncSessionLocal() as session:
        try:
            new_session = SessionLog(topic=topic, vocab_json=vocab_data)
            session.add(new_session)
            await session.commit()
        except Exception as e:
            print(f"DB Error log_session: {e}")
            await session.rollback()

async def get_session_vocab(topic: str) -> Optional[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        try:
            # Get latest session for this topic
            stmt = select(SessionLog).where(SessionLog.topic == topic).order_by(desc(SessionLog.created_at)).limit(1)
            result = await session.execute(stmt)
            session_log = result.scalar_one_or_none()
            if session_log:
                return session_log.vocab_json
            return None
        except Exception as e:
            print(f"DB Error get_session_vocab: {e}")
            return None

# --- Story ---

async def log_story(topic: str, tense: str, story_data: Dict[str, Any]):
    async with AsyncSessionLocal() as session:
        try:
            # Check for dupes
            stmt = select(Story).where(Story.topic == topic, Story.target_tense == tense)
            result = await session.execute(stmt)
            if result.scalar_one_or_none():
                return
                
            new_story = Story(
                topic=topic,
                target_tense=tense,
                title=story_data.get('title'),
                content=story_data.get('content'),
                highlights=story_data.get('highlights', []),
                grammar_notes=story_data.get('grammar_notes', [])
            )
            session.add(new_story)
            await session.commit()
        except Exception as e:
            print(f"DB Error log_story: {e}")
            await session.rollback()

async def get_story(topic: str, tense: str) -> Optional[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        try:
            stmt = select(Story).where(Story.topic == topic, Story.target_tense == tense)
            result = await session.execute(stmt)
            story = result.scalar_one_or_none()
            if story:
                return {
                    "title": story.title,
                    "content": story.content,
                    "highlights": story.highlights,
                    "grammar_notes": story.grammar_notes
                }
            return None
        except Exception as e:
            print(f"DB Error get_story: {e}")
            return None

# --- Attempts / Stats ---

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
            print(f"DB Error log_attempt: {e}")
            await session.rollback()

async def get_user_stats() -> Dict[str, Any]:
    async with AsyncSessionLocal() as session:
        try:
            stats = {}
            
            # Total XP
            xp_stmt = select(func.sum(Attempt.xp_earned))
            xp_res = await session.execute(xp_stmt)
            stats['total_xp'] = xp_res.scalar() or 0
            
            # Total Duration
            dur_stmt = select(func.sum(Attempt.duration_seconds))
            dur_res = await session.execute(dur_stmt)
            total_sec = dur_res.scalar() or 0
            stats['total_minutes'] = round(total_sec / 60)
            
            # Breakdown
            # Select activity_type, count(*), sum(case when is_pass then 1 else 0 end)
            # This is complex in pure ORM, raw SQL or group_by is easier
            # Breakdown with duration
            stmt = select(
                Attempt.activity_type,
                func.count(Attempt.id).label("count"),
                func.sum(func.cast(Attempt.is_pass, Integer)).label("passed"),
                func.sum(Attempt.duration_seconds).label("duration")
            ).group_by(Attempt.activity_type)
            
            res = await session.execute(stmt)
            stats['activities'] = [
                {
                    "activity_type": row.activity_type, 
                    "count": row.count, 
                    "passed": row.passed or 0,
                    "duration_seconds": row.duration or 0
                } 
                for row in res.all()
            ]
            
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
            print(f"DB Error get_stats: {e}")
            return {"total_xp": 0, "total_minutes": 0, "activities": [], "recent": []}

# --- Review / SRS ---

async def add_review_note(original: str, better: str, note_type: str = "grammar", tags: List[str] = []) -> Optional[int]:
    async with AsyncSessionLocal() as session:
        try:
            note = ReviewNote(
                original_sentence=original,
                better_sentence=better,
                note_type=note_type,
                tags=tags
            )
            session.add(note)
            await session.flush() # Get ID
            
            # Init SRS
            srs = SRSSchedule(
                note_id=note.id,
                next_review_at=datetime.utcnow()
            )
            session.add(srs)
            await session.commit()
            return note.id
        except Exception as e:
            print(f"DB Error add_note: {e}")
            await session.rollback()
            return None

async def get_due_reviews(limit: int = 10) -> List[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        try:
            stmt = select(ReviewNote).join(ReviewNote.schedule)\
                .where(SRSSchedule.next_review_at <= datetime.utcnow())\
                .order_by(SRSSchedule.next_review_at.asc())\
                .limit(limit)\
                .options(selectinload(ReviewNote.schedule))
                
            result = await session.execute(stmt)
            notes = result.scalars().all()
            
            output = []
            for n in notes:
                item = {
                    "id": n.id,
                    "original_sentence": n.original_sentence,
                    "better_sentence": n.better_sentence,
                    "note_type": n.note_type,
                    "tags": n.tags,
                    # SRS info
                    "interval_days": n.schedule.interval_days,
                    "ease_factor": n.schedule.ease_factor,
                    "repetitions": n.schedule.repetitions
                }
                output.append(item)
            return output
        except Exception as e:
            print(f"DB Error get_due: {e}")
            return []

async def update_srs_schedule(note_id: int, next_due: datetime, interval: int, ease: float, reps: int):
    async with AsyncSessionLocal() as session:
        try:
            stmt = update(SRSSchedule).where(SRSSchedule.note_id == note_id).values(
                next_review_at=next_due,
                interval_days=interval,
                ease_factor=ease,
                repetitions=reps
            )
            await session.execute(stmt)
            await session.commit()
        except Exception as e:
            print(f"DB Error update_srs: {e}")
            await session.rollback()

# --- Chat Sessions (New Stateless impl) ---

async def create_chat_session(mission_data: Dict[str, Any], initial_history: List[Dict[str, str]]) -> str:
    """Create a new chat session and return the ID (UUID)."""
    from uuid import uuid4
    session_id = str(uuid4())
    
    async with AsyncSessionLocal() as session:
        try:
            chat_session = ChatSession(
                id=session_id,
                mission_data=mission_data,
                history=initial_history
            )
            session.add(chat_session)
            await session.commit()
            return session_id
        except Exception as e:
            print(f"DB Error create_chat: {e}")
            await session.rollback()
            return "error"

async def get_chat_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve chat session state."""
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(select(ChatSession).where(ChatSession.id == session_id))
            chat = result.scalar_one_or_none()
            if chat:
                return {
                    "mission": chat.mission_data,
                    "history": chat.history
                }
            return None
        except Exception as e:
            print(f"DB Error get_chat: {e}")
            return None

async def update_chat_history(session_id: str, new_history: List[Dict[str, str]]):
    """Update history for a chat session."""
    async with AsyncSessionLocal() as session:
        try:
            stmt = update(ChatSession).where(ChatSession.id == session_id).values(history=new_history)
            await session.execute(stmt)
            await session.commit()
        except Exception as e:
            print(f"DB Error update_chat: {e}")
            await session.rollback()

# --- Coach Persistence ---

async def create_coach_session(user_id: str) -> str:
    """Create a new coach session."""
    from uuid import uuid4
    session_id = str(uuid4())
    
    async with AsyncSessionLocal() as session:
        try:
            new_session = CoachSession(
                id=session_id,
                user_id=user_id
            )
            session.add(new_session)
            await session.commit()
            return session_id
        except Exception as e:
            print(f"DB Error create_coach_session: {e}")
            await session.rollback()
            return "error"

async def get_total_coach_messages(session_id: str) -> int:
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(select(CoachSession.message_count).where(CoachSession.id == session_id))
            return result.scalar() or 0
        except Exception as e:
            print(f"DB Error get_coach_msg_count: {e}")
            return 0

async def increment_coach_message_count(session_id: str):
    async with AsyncSessionLocal() as session:
        try:
            stmt = update(CoachSession).where(CoachSession.id == session_id).values(message_count=CoachSession.message_count + 1)
            await session.execute(stmt)
            await session.commit()
        except Exception as e:
            print(f"DB Error inc_coach_msg: {e}")
            await session.rollback()

async def end_coach_session(session_id: str, summary: Dict[str, Any] = None):
    async with AsyncSessionLocal() as session:
        try:
            values = {"ended_at": datetime.now()}
            if summary:
                values["summary"] = summary
            
            stmt = update(CoachSession).where(CoachSession.id == session_id).values(**values)
            await session.execute(stmt)
            await session.commit()
        except Exception as e:
            print(f"DB Error end_coach_session: {e}")
            await session.rollback()

# --- Coach Memory ---

async def remember_fact(user_id: str, key: str, value: Dict[str, Any]):
    async with AsyncSessionLocal() as session:
        try:
            # Upsert logic (simplified: check exist, then update or insert)
            stmt = select(UserMemory).where(UserMemory.user_id == user_id, UserMemory.key == key)
            result = await session.execute(stmt)
            memory = result.scalar_one_or_none()
            
            if memory:
                stmt = update(UserMemory).where(UserMemory.id == memory.id).values(value=value, updated_at=datetime.now())
                await session.execute(stmt)
            else:
                new_memory = UserMemory(user_id=user_id, key=key, value=value)
                session.add(new_memory)
            
            await session.commit()
        except Exception as e:
            print(f"DB Error remember_fact: {e}")
            await session.rollback()

async def recall_fact(user_id: str, key: str) -> Optional[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        try:
            stmt = select(UserMemory).where(UserMemory.user_id == user_id, UserMemory.key == key)
            result = await session.execute(stmt)
            memory = result.scalar_one_or_none()
            return memory.value if memory else None
        except Exception as e:
            print(f"DB Error recall_fact: {e}")
            return None

async def get_all_memories(user_id: str) -> Dict[str, Any]:
    async with AsyncSessionLocal() as session:
        try:
            stmt = select(UserMemory).where(UserMemory.user_id == user_id)
            result = await session.execute(stmt)
            memories = result.scalars().all()
            return {m.key: m.value for m in memories}
        except Exception as e:
            print(f"DB Error get_all_memories: {e}")
            return {}

# --- Coach Progress ---

async def update_mastery(user_id: str, topic: str, level: int, notes: str = None):
    async with AsyncSessionLocal() as session:
        try:
            # Upsert
            stmt = select(UserProgress).where(UserProgress.user_id == user_id, UserProgress.topic == topic)
            result = await session.execute(stmt)
            progress = result.scalar_one_or_none()
            
            if progress:
                # Update existing
                values = {
                    "mastery_level": level, 
                    "last_practiced": datetime.now(),
                    "practice_count": UserProgress.practice_count + 1
                }
                if notes:
                    values["notes"] = notes
                
                stmt = update(UserProgress).where(UserProgress.id == progress.id).values(**values)
                await session.execute(stmt)
            else:
                # Create new
                new_progress = UserProgress(
                    user_id=user_id, 
                    topic=topic, 
                    mastery_level=level, 
                    notes=notes
                )
                session.add(new_progress)
            
            await session.commit()
        except Exception as e:
            print(f"DB Error update_mastery: {e}")
            await session.rollback()

async def get_mastery(user_id: str, topic: str) -> Optional[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        try:
            stmt = select(UserProgress).where(UserProgress.user_id == user_id, UserProgress.topic == topic)
            result = await session.execute(stmt)
            progress = result.scalar_one_or_none()
            if progress:
                return {
                    "level": progress.mastery_level,
                    "notes": progress.notes,
                    "count": progress.practice_count
                }
            return None
        except Exception as e:
            print(f"DB Error get_mastery: {e}")
            return None


# --- Performance Dashboard ---

async def get_performance_data(days: int = 30) -> Dict[str, Any]:
    """
    Aggregate performance data for the dashboard.
    Returns vocabulary stats, activity heatmap, and source distribution.
    """
    from datetime import timedelta
    
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
            print(f"DB Error get_performance_data: {e}")
            return {
                'summary': {'vocab_size': 0, 'mastery_rate': 0, 'comprehension_score': 0, 'total_study_minutes': 0},
                'vocabulary': {'distribution': {}, 'difficult_words': [], 'recent_words': []},
                'activity': {'daily_counts': [], 'by_type': {}},
                'sources': {'distribution': {}}
            }


# --- Performance V2: Due Reviews, Milestones, Reading Stats ---

async def get_due_reviews_count() -> int:
    """Get count of words/notes due for review (SRS)."""
    async with AsyncSessionLocal() as session:
        try:
            stmt = select(func.count()).select_from(SRSSchedule).where(
                SRSSchedule.next_review_at <= datetime.utcnow()
            )
            result = await session.execute(stmt)
            return result.scalar() or 0
        except Exception as e:
            print(f"DB Error get_due_reviews_count: {e}")
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
            from datetime import timedelta
            
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
            print(f"DB Error get_milestones: {e}")
            return {
                "vocab_size": 0,
                "current_streak": 0,
                "vocab_milestones": [],
                "streak_milestones": []
            }


async def get_reading_stats(user_id: str = "default_user") -> Dict[str, Any]:
    """
    Calculate reading statistics.
    Uses context_sentence word count as proxy for words read.
    """
    async with AsyncSessionLocal() as session:
        try:
            # Get all learning logs with context sentences
            stmt = select(VocabLearningLog).where(
                VocabLearningLog.user_id == user_id,
                VocabLearningLog.context_sentence.isnot(None)
            )
            result = await session.execute(stmt)
            logs = result.scalars().all()
            
            # Calculate total words from context sentences
            total_words = 0
            for log in logs:
                if log.context_sentence:
                    # Simple word count
                    total_words += len(log.context_sentence.split())
            
            # Count distinct articles (by source_id for epub/rss)
            articles_stmt = select(func.count(func.distinct(VocabLearningLog.source_id))).where(
                VocabLearningLog.user_id == user_id,
                VocabLearningLog.source_type.in_(['epub', 'rss'])
            )
            articles_res = await session.execute(articles_stmt)
            articles_count = articles_res.scalar() or 0
            
            # Sessions count (distinct dates)
            sessions_stmt = select(func.count(func.distinct(func.date(VocabLearningLog.created_at)))).where(
                VocabLearningLog.user_id == user_id
            )
            sessions_res = await session.execute(sessions_stmt)
            sessions_count = sessions_res.scalar() or 1  # Avoid division by zero
            
            avg_words_per_session = round(total_words / sessions_count) if sessions_count > 0 else 0
            
            return {
                "total_words_read": total_words,
                "articles_count": articles_count,
                "sessions_count": sessions_count,
                "avg_words_per_session": avg_words_per_session
            }
            
        except Exception as e:
            print(f"DB Error get_reading_stats: {e}")
            return {
                "total_words_read": 0,
                "articles_count": 0,
                "sessions_count": 0,
                "avg_words_per_session": 0
            }


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
            print(f"DB Error get_user_goals: {e}")
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
            print(f"DB Error update_user_goals: {e}")
            await session.rollback()
            return False


async def get_goals_progress(user_id: str = "default_user") -> Dict[str, Any]:
    """Calculate today's progress toward goals."""
    from datetime import timedelta
    
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
            print(f"DB Error get_goals_progress: {e}")
            return {'date': str(datetime.utcnow().date()), 'progress': {}}


# --- Memory Curve ---

async def get_memory_curve_data(user_id: str = "default_user") -> Dict[str, Any]:
    """
    Calculate retention rate at different time intervals.
    Compares actual user performance vs theoretical Ebbinghaus curve.
    """
    from datetime import timedelta
    import math
    
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
            print(f"DB Error get_memory_curve_data: {e}")
            return {
                'actual': [],
                'ebbinghaus': [],
                'total_words_analyzed': 0
            }


# --- Reading Session Tracking ---

WPM_NON_NATIVE = 150  # Words per minute for non-native reader
JUMP_THRESHOLD = 5     # Sentences jumped = considered skip


async def start_reading_session(
    user_id: str,
    source_type: str,
    source_id: str,
    article_title: str,
    total_word_count: int,
    total_sentences: int
) -> Optional[int]:
    """Start a new reading session, return session_id."""
    async with AsyncSessionLocal() as session:
        try:
            new_session = ReadingSession(
                user_id=user_id,
                source_type=source_type,
                source_id=source_id,
                article_title=article_title,
                total_word_count=total_word_count,
                total_sentences=total_sentences
            )
            session.add(new_session)
            await session.commit()
            await session.refresh(new_session)
            return new_session.id
        except Exception as e:
            print(f"DB Error start_reading_session: {e}")
            await session.rollback()
            return None


async def update_reading_session(
    session_id: int,
    max_sentence_reached: int,
    total_active_seconds: int,
    total_idle_seconds: int,
    scroll_jump_count: int
) -> bool:
    """Update reading session progress (heartbeat)."""
    async with AsyncSessionLocal() as session:
        try:
            stmt = select(ReadingSession).where(ReadingSession.id == session_id)
            result = await session.execute(stmt)
            rs = result.scalar_one_or_none()
            
            if not rs:
                return False
            
            rs.max_sentence_reached = max(rs.max_sentence_reached, max_sentence_reached)
            rs.total_active_seconds = total_active_seconds
            rs.total_idle_seconds = total_idle_seconds
            rs.scroll_jump_count = scroll_jump_count
            rs.last_active_at = datetime.utcnow()
            
            await session.commit()
            return True
        except Exception as e:
            print(f"DB Error update_reading_session: {e}")
            await session.rollback()
            return False


async def increment_word_click(session_id: int) -> bool:
    """Increment word click count for a reading session."""
    async with AsyncSessionLocal() as session:
        try:
            stmt = select(ReadingSession).where(ReadingSession.id == session_id)
            result = await session.execute(stmt)
            rs = result.scalar_one_or_none()
            
            if not rs:
                return False
            
            rs.word_click_count += 1
            rs.last_active_at = datetime.utcnow()
            
            await session.commit()
            return True
        except Exception as e:
            print(f"DB Error increment_word_click: {e}")
            await session.rollback()
            return False


def calculate_reading_quality(rs: ReadingSession) -> tuple:
    """
    Calculate reading quality and validated word count.
    Returns (quality_level, validated_words)
    
    Quality levels:
    - high: good time ratio, minimal jumps, has word clicks
    - medium: acceptable time ratio, some jumps
    - low: minimal engagement
    - skimmed: too fast or too many jumps
    """
    if rs.total_sentences == 0:
        return 'skimmed', 0
    
    words_per_sentence = rs.total_word_count / rs.total_sentences
    sentences_covered = rs.max_sentence_reached + 1
    
    # Expected reading time (seconds) at 150 WPM
    expected_seconds = (sentences_covered * words_per_sentence) / WPM_NON_NATIVE * 60
    actual_active_seconds = rs.total_active_seconds
    
    # Time ratio: how much of expected time was spent
    time_ratio = actual_active_seconds / expected_seconds if expected_seconds > 0 else 0
    
    # Jump penalty: each jump reduces confidence
    jump_ratio = rs.scroll_jump_count / (sentences_covered or 1)
    
    # Interaction bonus: word clicks = definitely reading
    has_interactions = rs.word_click_count > 0
    
    # Quality scoring
    if has_interactions and time_ratio >= 0.5 and jump_ratio < 0.2:
        quality = "high"
        multiplier = 1.0
    elif time_ratio >= 0.3 and jump_ratio < 0.3:
        quality = "medium"
        multiplier = 0.7
    elif time_ratio >= 0.1:
        quality = "low"
        multiplier = 0.3
    else:
        quality = "skimmed"
        multiplier = 0.0
    
    # Calculate validated words
    # Subtract jumped sentences (each jump skips JUMP_THRESHOLD sentences)
    sequential_sentences = max(0, sentences_covered - rs.scroll_jump_count * JUMP_THRESHOLD)
    
    raw_words = sequential_sentences * words_per_sentence
    validated_words = int(raw_words * multiplier)
    
    return quality, validated_words


async def end_reading_session(session_id: int, final_data: Dict[str, Any] = None) -> Dict[str, Any]:
    """End reading session, calculate quality and validated word count."""
    async with AsyncSessionLocal() as session:
        try:
            stmt = select(ReadingSession).where(ReadingSession.id == session_id)
            result = await session.execute(stmt)
            rs = result.scalar_one_or_none()
            
            if not rs:
                return {"success": False, "error": "Session not found"}
            
            # Update with final data if provided
            if final_data:
                rs.max_sentence_reached = max(rs.max_sentence_reached, final_data.get('max_sentence_reached', 0))
                rs.total_active_seconds = final_data.get('total_active_seconds', rs.total_active_seconds)
                rs.total_idle_seconds = final_data.get('total_idle_seconds', rs.total_idle_seconds)
                rs.scroll_jump_count = final_data.get('scroll_jump_count', rs.scroll_jump_count)
            
            # Calculate quality
            quality, validated_words = calculate_reading_quality(rs)
            
            rs.reading_quality = quality
            rs.validated_word_count = validated_words
            rs.ended_at = datetime.utcnow()
            
            await session.commit()
            
            return {
                "success": True,
                "session_id": session_id,
                "reading_quality": quality,
                "validated_word_count": validated_words,
                "total_sentences": rs.total_sentences,
                "sentences_reached": rs.max_sentence_reached + 1,
                "time_spent_seconds": rs.total_active_seconds
            }
        except Exception as e:
            print(f"DB Error end_reading_session: {e}")
            await session.rollback()
            return {"success": False, "error": str(e)}


async def get_reading_stats_v2(user_id: str = "default_user") -> Dict[str, Any]:
    """
    Get reading statistics using validated ReadingSession data.
    Falls back to legacy VocabLearningLog if no sessions exist.
    """
    async with AsyncSessionLocal() as session:
        try:
            # Get stats from ReadingSession (validated data)
            stmt = select(
                func.sum(ReadingSession.validated_word_count),
                func.count(ReadingSession.id),
                func.count(func.distinct(ReadingSession.source_id))
            ).where(
                ReadingSession.user_id == user_id,
                ReadingSession.reading_quality.in_(['high', 'medium', 'low'])
            )
            result = await session.execute(stmt)
            row = result.first()
            
            validated_words = row[0] or 0
            session_count = row[1] or 0
            articles_count = row[2] or 0
            
            # If no session data, fall back to legacy method
            if session_count == 0:
                legacy_stats = await get_reading_stats(user_id)
                return {
                    **legacy_stats,
                    "data_source": "legacy",
                    "note": "基于生词点击估算"
                }
            
            avg_words_per_session = round(validated_words / session_count) if session_count > 0 else 0
            
            # Get quality breakdown
            quality_stmt = select(
                ReadingSession.reading_quality,
                func.count(ReadingSession.id)
            ).where(
                ReadingSession.user_id == user_id,
                ReadingSession.reading_quality.isnot(None)
            ).group_by(ReadingSession.reading_quality)
            quality_result = await session.execute(quality_stmt)
            quality_breakdown = {row[0]: row[1] for row in quality_result.all()}
            
            return {
                "total_words_read": validated_words,
                "articles_count": articles_count,
                "sessions_count": session_count,
                "avg_words_per_session": avg_words_per_session,
                "quality_breakdown": quality_breakdown,
                "data_source": "validated"
            }
            
        except Exception as e:
            print(f"DB Error get_reading_stats_v2: {e}")
            return {
                "total_words_read": 0,
                "articles_count": 0,
                "sessions_count": 0,
                "avg_words_per_session": 0,
                "data_source": "error"
            }
