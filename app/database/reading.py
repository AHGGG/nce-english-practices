from typing import Dict, Any, Optional
from datetime import datetime
import logging
from sqlalchemy import select, func

from app.database.core import AsyncSessionLocal, ReadingSession, VocabLearningLog

logger = logging.getLogger(__name__)

# --- Reading Session Tracking ---

WPM_NON_NATIVE = 150  # Words per minute for non-native reader
JUMP_THRESHOLD = 5  # Sentences jumped = considered skip


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
                VocabLearningLog.context_sentence.isnot(None),
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
            articles_stmt = select(
                func.count(func.distinct(VocabLearningLog.source_id))
            ).where(
                VocabLearningLog.user_id == user_id,
                VocabLearningLog.source_type.in_(["epub", "rss"]),
            )
            articles_res = await session.execute(articles_stmt)
            articles_count = articles_res.scalar() or 0

            # Sessions count (distinct dates)
            sessions_stmt = select(
                func.count(func.distinct(func.date(VocabLearningLog.created_at)))
            ).where(VocabLearningLog.user_id == user_id)
            sessions_res = await session.execute(sessions_stmt)
            sessions_count = sessions_res.scalar() or 1  # Avoid division by zero

            avg_words_per_session = (
                round(total_words / sessions_count) if sessions_count > 0 else 0
            )

            return {
                "total_words_read": total_words,
                "articles_count": articles_count,
                "sessions_count": sessions_count,
                "avg_words_per_session": avg_words_per_session,
            }

        except Exception:
            logger.exception("DB Error get_reading_stats")
            return {
                "total_words_read": 0,
                "articles_count": 0,
                "sessions_count": 0,
                "avg_words_per_session": 0,
            }


async def start_reading_session(
    user_id: str,
    source_type: str,
    source_id: str,
    article_title: str,
    total_word_count: int,
    total_sentences: int,
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
                total_sentences=total_sentences,
            )
            session.add(new_session)
            await session.commit()
            await session.refresh(new_session)
            return new_session.id
        except Exception:
            logger.exception("DB Error start_reading_session")
            await session.rollback()
            return None


async def update_reading_session(
    session_id: int,
    max_sentence_reached: int,
    total_active_seconds: int,
    total_idle_seconds: int,
    scroll_jump_count: int,
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
        except Exception:
            logger.exception("DB Error update_reading_session")
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
        except Exception:
            logger.exception("DB Error increment_word_click")
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
        return "skimmed", 0

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
    sequential_sentences = max(
        0, sentences_covered - rs.scroll_jump_count * JUMP_THRESHOLD
    )

    raw_words = sequential_sentences * words_per_sentence
    validated_words = int(raw_words * multiplier)

    return quality, validated_words


async def end_reading_session(
    session_id: int, final_data: Dict[str, Any] = None
) -> Dict[str, Any]:
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
                rs.max_sentence_reached = max(
                    rs.max_sentence_reached, final_data.get("max_sentence_reached", 0)
                )
                rs.total_active_seconds = final_data.get(
                    "total_active_seconds", rs.total_active_seconds
                )
                rs.total_idle_seconds = final_data.get(
                    "total_idle_seconds", rs.total_idle_seconds
                )
                rs.scroll_jump_count = final_data.get(
                    "scroll_jump_count", rs.scroll_jump_count
                )

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
                "time_spent_seconds": rs.total_active_seconds,
            }
        except Exception as e:
            logger.exception("DB Error end_reading_session")
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
                func.count(func.distinct(ReadingSession.source_id)),
            ).where(
                ReadingSession.user_id == user_id,
                ReadingSession.reading_quality.in_(["high", "medium", "low"]),
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
                    "note": "基于生词点击估算",
                }

            avg_words_per_session = (
                round(validated_words / session_count) if session_count > 0 else 0
            )

            # Get quality breakdown
            quality_stmt = (
                select(ReadingSession.reading_quality, func.count(ReadingSession.id))
                .where(
                    ReadingSession.user_id == user_id,
                    ReadingSession.reading_quality.isnot(None),
                )
                .group_by(ReadingSession.reading_quality)
            )
            quality_result = await session.execute(quality_stmt)
            quality_breakdown = {row[0]: row[1] for row in quality_result.all()}

            return {
                "total_words_read": validated_words,
                "articles_count": articles_count,
                "sessions_count": session_count,
                "avg_words_per_session": avg_words_per_session,
                "quality_breakdown": quality_breakdown,
                "data_source": "validated",
            }

        except Exception:
            logger.exception("DB Error get_reading_stats_v2")
            return {
                "total_words_read": 0,
                "articles_count": 0,
                "sessions_count": 0,
                "avg_words_per_session": 0,
                "data_source": "error",
            }
