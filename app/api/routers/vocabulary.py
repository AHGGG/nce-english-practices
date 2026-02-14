from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, desc
from typing import Dict, List, Literal, Optional, Set
from pydantic import BaseModel
from datetime import datetime

from app.core.db import get_db
from app.models.orm import (
    VocabLearningLog,
    ReviewItem,
    WordProficiency,
    SentenceLearningRecord,
    User,
)
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


class UnfamiliarItemContext(BaseModel):
    source_type: str
    source_id: Optional[str] = None
    context_sentence: str
    seen_at: datetime


class UnfamiliarItem(BaseModel):
    text: str
    item_type: Literal["word", "phrase"]
    encounter_count: int
    last_seen_at: Optional[datetime] = None
    source_types: List[str]
    in_review_queue: bool
    next_review_at: Optional[datetime] = None
    review_repetition: int = 0
    difficulty_score: Optional[float] = None
    proficiency_status: Optional[str] = None
    exposure_count: int = 0
    huh_count: int = 0
    sample_contexts: List[UnfamiliarItemContext]


class UnfamiliarItemsResponse(BaseModel):
    items: List[UnfamiliarItem]
    total: int
    limit: int
    offset: int


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
    limit: int = 50,  # Default to 50 to show more history
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


@router.get("/unfamiliar-items", response_model=UnfamiliarItemsResponse)
async def get_unfamiliar_items(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    item_type: Literal["all", "word", "phrase"] = Query(default="all"),
    sort: Literal["recent", "count", "difficulty"] = Query(default="recent"),
    q: Optional[str] = Query(default=None, max_length=120),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get user's unfamiliar items (words + collocations/phrases) with related signals.

    Aggregates from:
    1. SentenceLearningRecord.word_clicks / phrase_clicks
    2. VocabLearningLog lookup history
    3. ReviewItem queue metadata
    4. WordProficiency difficulty signals
    """

    max_scan_rows = 3000
    user_id = current_user.user_id_str

    items_map: Dict[str, Dict] = {}

    def normalize_text(text: str) -> str:
        return " ".join((text or "").strip().lower().split())

    def ensure_item(text: str, inferred_type: Optional[str] = None) -> Optional[Dict]:
        normalized = normalize_text(text)
        if not normalized:
            return None
        if normalized not in items_map:
            items_map[normalized] = {
                "text": normalized,
                "types": set(),
                "encounter_count": 0,
                "last_seen_at": None,
                "source_types": set(),
                "contexts": [],
                "context_keys": set(),
                "in_review_queue": False,
                "next_review_at": None,
                "review_repetition": 0,
                "difficulty_score": None,
                "proficiency_status": None,
                "exposure_count": 0,
                "huh_count": 0,
            }
        entry = items_map[normalized]
        if inferred_type in ("word", "phrase"):
            entry["types"].add(inferred_type)
        return entry

    def update_last_seen(entry: Dict, seen_at: Optional[datetime]):
        if not seen_at:
            return
        if entry["last_seen_at"] is None or seen_at > entry["last_seen_at"]:
            entry["last_seen_at"] = seen_at

    def add_context(
        entry: Dict,
        sentence: Optional[str],
        source_type: Optional[str],
        source_id: Optional[str],
        seen_at: Optional[datetime],
    ):
        if not sentence:
            return
        normalized_sentence = normalize_text(sentence)
        if not normalized_sentence:
            return
        if normalized_sentence in entry["context_keys"]:
            return
        entry["context_keys"].add(normalized_sentence)
        entry["contexts"].append(
            {
                "source_type": source_type or "unknown",
                "source_id": source_id,
                "context_sentence": sentence,
                "seen_at": seen_at or datetime.utcnow(),
            }
        )

    # 1) Sentence-study clicks (word + phrase)
    slr_stmt = (
        select(
            SentenceLearningRecord.word_clicks,
            SentenceLearningRecord.phrase_clicks,
            SentenceLearningRecord.source_type,
            SentenceLearningRecord.source_id,
            SentenceLearningRecord.sentence_text,
            SentenceLearningRecord.updated_at,
        )
        .where(SentenceLearningRecord.user_id == user_id)
        .order_by(desc(SentenceLearningRecord.updated_at))
        .limit(max_scan_rows)
    )
    slr_result = await db.execute(slr_stmt)
    for row in slr_result.all():
        source_type = row.source_type
        source_id = row.source_id
        sentence_text = row.sentence_text
        updated_at = row.updated_at

        for clicked_word in row.word_clicks or []:
            if not isinstance(clicked_word, str):
                continue
            entry = ensure_item(clicked_word, "word")
            if not entry:
                continue
            entry["encounter_count"] += 1
            if source_type:
                entry["source_types"].add(source_type)
            update_last_seen(entry, updated_at)
            add_context(entry, sentence_text, source_type, source_id, updated_at)

        for clicked_phrase in row.phrase_clicks or []:
            if not isinstance(clicked_phrase, str):
                continue
            entry = ensure_item(clicked_phrase, "phrase")
            if not entry:
                continue
            entry["encounter_count"] += 1
            if source_type:
                entry["source_types"].add(source_type)
            update_last_seen(entry, updated_at)
            add_context(entry, sentence_text, source_type, source_id, updated_at)

    # 2) Vocabulary lookup logs
    vocab_log_stmt = (
        select(
            VocabLearningLog.word,
            VocabLearningLog.source_type,
            VocabLearningLog.source_id,
            VocabLearningLog.context_sentence,
            VocabLearningLog.created_at,
        )
        .where(VocabLearningLog.user_id == user_id)
        .order_by(desc(VocabLearningLog.created_at))
        .limit(max_scan_rows)
    )
    vocab_log_result = await db.execute(vocab_log_stmt)
    for row in vocab_log_result.all():
        entry = ensure_item(row.word, "word")
        if not entry:
            continue
        entry["encounter_count"] += 1
        if row.source_type:
            entry["source_types"].add(row.source_type)
        update_last_seen(entry, row.created_at)
        add_context(
            entry,
            row.context_sentence,
            row.source_type,
            row.source_id,
            row.created_at,
        )

    # 3) Review queue status (highlighted items)
    review_stmt = (
        select(
            ReviewItem.highlighted_items,
            ReviewItem.next_review_at,
            ReviewItem.repetition,
            ReviewItem.source_id,
            ReviewItem.sentence_text,
            ReviewItem.created_at,
        )
        .where(ReviewItem.user_id == user_id)
        .order_by(desc(ReviewItem.created_at))
        .limit(max_scan_rows)
    )
    review_result = await db.execute(review_stmt)
    for row in review_result.all():
        source_type_from_source_id = None
        if row.source_id and ":" in row.source_id:
            source_type_from_source_id = row.source_id.split(":", 1)[0]

        for raw_item in row.highlighted_items or []:
            if not isinstance(raw_item, str):
                continue
            inferred = "phrase" if " " in raw_item.strip() else "word"
            entry = ensure_item(raw_item, inferred)
            if not entry:
                continue
            entry["encounter_count"] += 1
            entry["in_review_queue"] = True
            entry["review_repetition"] = max(
                int(entry["review_repetition"]), int(row.repetition or 0)
            )
            if row.next_review_at:
                if (
                    entry["next_review_at"] is None
                    or row.next_review_at < entry["next_review_at"]
                ):
                    entry["next_review_at"] = row.next_review_at
            if source_type_from_source_id:
                entry["source_types"].add(source_type_from_source_id)
            update_last_seen(entry, row.created_at)
            add_context(
                entry,
                row.sentence_text,
                source_type_from_source_id,
                row.source_id,
                row.created_at,
            )

    # 4) Word proficiency difficulty
    proficiency_stmt = (
        select(
            WordProficiency.word,
            WordProficiency.difficulty_score,
            WordProficiency.status,
            WordProficiency.exposure_count,
            WordProficiency.huh_count,
            WordProficiency.last_seen_at,
        )
        .where(WordProficiency.user_id == user_id)
        .limit(max_scan_rows)
    )
    proficiency_result = await db.execute(proficiency_stmt)
    for row in proficiency_result.all():
        entry = ensure_item(row.word, "word")
        if not entry:
            continue
        if row.difficulty_score is not None:
            current = entry["difficulty_score"]
            score = float(row.difficulty_score)
            if current is None or score > current:
                entry["difficulty_score"] = score
        if row.status:
            entry["proficiency_status"] = row.status
        entry["exposure_count"] = max(
            int(entry["exposure_count"]), int(row.exposure_count or 0)
        )
        entry["huh_count"] = max(int(entry["huh_count"]), int(row.huh_count or 0))
        update_last_seen(entry, row.last_seen_at)

    unfamiliar_items: List[UnfamiliarItem] = []
    for entry in items_map.values():
        types: Set[str] = entry["types"]
        if "phrase" in types and "word" not in types:
            final_type: Literal["word", "phrase"] = "phrase"
        elif "word" in types and "phrase" not in types:
            final_type = "word"
        elif "phrase" in types and "word" in types:
            final_type = "phrase" if " " in entry["text"] else "word"
        else:
            final_type = "phrase" if " " in entry["text"] else "word"

        if item_type != "all" and final_type != item_type:
            continue

        sorted_contexts = sorted(
            entry["contexts"],
            key=lambda c: c["seen_at"],
            reverse=True,
        )[:3]

        unfamiliar_items.append(
            UnfamiliarItem(
                text=entry["text"],
                item_type=final_type,
                encounter_count=int(entry["encounter_count"]),
                last_seen_at=entry["last_seen_at"],
                source_types=sorted(entry["source_types"]),
                in_review_queue=bool(entry["in_review_queue"]),
                next_review_at=entry["next_review_at"],
                review_repetition=int(entry["review_repetition"]),
                difficulty_score=entry["difficulty_score"],
                proficiency_status=entry["proficiency_status"],
                exposure_count=int(entry["exposure_count"]),
                huh_count=int(entry["huh_count"]),
                sample_contexts=[
                    UnfamiliarItemContext(**ctx) for ctx in sorted_contexts
                ],
            )
        )

    if q and q.strip():
        normalized_query = normalize_text(q)
        unfamiliar_items = [
            item for item in unfamiliar_items if normalized_query in item.text
        ]

    if sort == "count":
        unfamiliar_items.sort(
            key=lambda item: (
                item.encounter_count,
                item.last_seen_at or datetime.min,
            ),
            reverse=True,
        )
    elif sort == "difficulty":
        unfamiliar_items.sort(
            key=lambda item: (
                item.difficulty_score or 0.0,
                item.huh_count,
                item.encounter_count,
                item.last_seen_at or datetime.min,
            ),
            reverse=True,
        )
    else:
        unfamiliar_items.sort(
            key=lambda item: (
                item.last_seen_at or datetime.min,
                item.encounter_count,
            ),
            reverse=True,
        )

    total = len(unfamiliar_items)
    paged_items = unfamiliar_items[offset : offset + limit]

    return UnfamiliarItemsResponse(
        items=paged_items,
        total=total,
        limit=limit,
        offset=offset,
    )
