"""
Database __init__.py - Simplified exports.
Removed: Attempt, goals, log_attempt, get_user_stats.
"""
from .core import (
    Base, 
    engine, 
    AsyncSessionLocal, 
    ReadingSession, 
    VocabLearningLog, 
    WordProficiency,
    SentenceLearningRecord
)
from .performance import get_performance_data, get_memory_curve_data, get_daily_study_time
from .reading import (
    get_reading_stats, 
    start_reading_session, 
    update_reading_session, 
    increment_word_click, 
    calculate_reading_quality, 
    end_reading_session, 
    get_reading_stats_v2
)
