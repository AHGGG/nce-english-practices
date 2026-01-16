"""
Database __init__.py - Simplified exports.
Removed: Attempt, goals, log_attempt, get_user_stats.
"""

from .core import (
    Base as Base,
    engine as engine,
    AsyncSessionLocal as AsyncSessionLocal,
    ReadingSession as ReadingSession,
    VocabLearningLog as VocabLearningLog,
    WordProficiency as WordProficiency,
    SentenceLearningRecord as SentenceLearningRecord,
)
from .performance import (
    get_performance_data as get_performance_data,
    get_memory_curve_data as get_memory_curve_data,
    get_daily_study_time as get_daily_study_time,
)
from .reading import (
    get_reading_stats as get_reading_stats,
    start_reading_session as start_reading_session,
    update_reading_session as update_reading_session,
    increment_word_click as increment_word_click,
    calculate_reading_quality as calculate_reading_quality,
    end_reading_session as end_reading_session,
    get_reading_stats_v2 as get_reading_stats_v2,
)
