from typing import Dict, List, Any, Optional
from datetime import datetime
import logging

from sqlalchemy import select, update, desc, func, Integer
from sqlalchemy.orm import selectinload

from app.core.db import AsyncSessionLocal, Base, engine
from app.models.orm import (
    SessionLog, Story, Attempt, ReviewNote, SRSSchedule, ChatSession,
    CoachSession, UserMemory, UserProgress, WordProficiency, VocabLearningLog,
    UserGoal, ReadingSession
)
