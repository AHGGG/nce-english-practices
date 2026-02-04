from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.db import get_db
from app.models.orm import VocabLearningLog, ReviewItem, WordProficiency, User
from app.api.routers.auth import get_current_user

router = APIRouter(prefix="/api/vocabulary", tags=["vocabulary"])


class VocabularyContext(BaseModel):
    source_type: str
    source_id: Optional[str] = None
    context_sentence: str
    created_at: datetime
    word: str


class VocabularyLogRequest(BaseModel):
    word: str
    source_type: str = "sentence_study"
    source_id: Optional[str] = None
    context_sentence: Optional[str] = None


class DifficultWordsResponse(BaseModel):
    words: List[str]


@router.post("/log", status_code=201)
async def log_vocabulary_lookup(
    payload: VocabularyLogRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Log a vocabulary lookup event.
    Prevents duplicate logs for the same word AND same sentence within a short window (1 minute).
    Different sentences with the same word are always logged.
    """
    normalized_word = payload.word.lower().strip()
    normalized_sentence = (payload.context_sentence or "").strip()

    # Check for recent duplicate (same word + same sentence within 60 seconds)
    cutoff_time = datetime.utcnow() - __import__("datetime").timedelta(seconds=60)

    existing_stmt = select(VocabLearningLog).where(
        VocabLearningLog.user_id == current_user.user_id_str,
        func.lower(VocabLearningLog.word) == normalized_word,
        VocabLearningLog.context_sentence
        == normalized_sentence,  # Check exact sentence, not source_id
        VocabLearningLog.created_at >= cutoff_time,
    )

    result = await db.execute(existing_stmt)
    existing_log = result.scalar_one_or_none()

    if existing_log:
        return {"status": "duplicate_skipped", "id": existing_log.id}

    log_entry = VocabLearningLog(
        user_id=current_user.user_id_str,
        word=normalized_word,
        source_type=payload.source_type,
        source_id=payload.source_id,
        context_sentence=normalized_sentence,
        created_at=datetime.utcnow(),
    )
    db.add(log_entry)
    await db.commit()
    return {"status": "logged", "id": log_entry.id}


@router.get("/contexts", response_model=List[VocabularyContext])
async def get_word_contexts(
    word: str,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get context history for a specific word.
    Searches VocabLearningLog for where the user encountered this word.
    Returns unique contexts (de-duplicated by sentence).
    """
    if not word:
        return []

    # Normalize word (lowercase)
    word_lower = word.lower().strip()

    # Query logs
    # Fetch more than limit to allow for de-duplication
    fetch_limit = limit * 5

    stmt = (
        select(VocabLearningLog)
        .where(
            VocabLearningLog.user_id == current_user.user_id_str,
            func.lower(VocabLearningLog.word) == word_lower,
        )
        .order_by(desc(VocabLearningLog.created_at))
        .limit(fetch_limit)
    )

    result = await db.execute(stmt)
    logs = result.scalars().all()

    # Post-process for uniqueness based on context_sentence
    seen_contexts = set()
    unique_contexts = []

    for log in logs:
        if not log.context_sentence:
            continue

        # Normalize context for comparison (ignore whitespace differences)
        normalized_context = " ".join(log.context_sentence.split()).lower()

        if normalized_context not in seen_contexts:
            seen_contexts.add(normalized_context)
            unique_contexts.append(
                VocabularyContext(
                    source_type=log.source_type,
                    source_id=log.source_id,
                    context_sentence=log.context_sentence,
                    created_at=log.created_at,
                    word=log.word,
                )
            )

        if len(unique_contexts) >= limit:
            break

    return unique_contexts


@router.get("/difficult-words", response_model=DifficultWordsResponse)
async def get_difficult_words(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """
    Get a list of words/phrases the user has struggled with.
    Combines:
    1. Active Review Items (where difficulty_type='vocabulary' or 'both')
    2. WordProficiency entries with high difficulty score or 'learning' status

    Excludes words marked as 'mastered' in WordProficiency.
    """

    # 1. Fetch from Review Items (explicitly marked as unclear)
    # Filter for items that have highlighted_items (JSON list of strings)
    review_stmt = select(ReviewItem.highlighted_items).where(
        ReviewItem.user_id == current_user.user_id_str,
        ReviewItem.highlighted_items.isnot(None),
    )

    # 2. Fetch from Word Proficiency (high lookups / difficulty, excluding mastered)
    prof_stmt = select(WordProficiency.word).where(
        WordProficiency.user_id == current_user.user_id_str,
        or_(
            WordProficiency.status.in_(["new", "learning"]),
            WordProficiency.huh_count > 0,
        ),
        WordProficiency.status != "mastered",  # Explicitly exclude mastered
    )

    # 3. Fetch mastered words to exclude from final result
    mastered_stmt = select(WordProficiency.word).where(
        WordProficiency.user_id == current_user.user_id_str,
        WordProficiency.status == "mastered",
    )

    # Execute queries
    review_result = await db.execute(review_stmt)
    prof_result = await db.execute(prof_stmt)
    mastered_result = await db.execute(mastered_stmt)

    # Build mastered set first
    mastered_set = set()
    for (word,) in mastered_result.all():
        if word:
            mastered_set.add(word.lower().strip())

    difficult_set = set()

    # Process Review Items (highlighted_items is a JSON list of strings)
    for (items,) in review_result.all():
        if items and isinstance(items, list):
            for item in items:
                if isinstance(item, str):
                    word_lower = item.lower().strip()
                    # Exclude mastered words
                    if word_lower not in mastered_set:
                        difficult_set.add(word_lower)

    # Process Proficiency Items (already filtered to exclude mastered in query)
    for (word,) in prof_result.all():
        if word:
            word_lower = word.lower().strip()
            if word_lower not in mastered_set:
                difficult_set.add(word_lower)

    return DifficultWordsResponse(words=list(difficult_set))
