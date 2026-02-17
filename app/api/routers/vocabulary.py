from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, desc
from typing import Any, Dict, List, Literal, Optional, Set
from datetime import datetime
import re

from app.core.db import get_db
from app.models.orm import (
    VocabLearningLog,
    ReviewItem,
    WordProficiency,
    SentenceLearningRecord,
    ReadingSession,
    User,
)
from app.models.podcast_orm import PodcastEpisode
from app.services.content_service import content_service
from app.services.source_id import parse_epub_source_id
from app.models.content_schemas import SourceType
from app.models.vocabulary_schemas import (
    DifficultWordsResponse,
    UnfamiliarItem,
    UnfamiliarItemContext,
    UnfamiliarItemsResponse,
    VocabularyContext,
    VocabularyLogRequest,
)
from app.api.deps.auth import get_current_user

router = APIRouter(prefix="/api/vocabulary", tags=["vocabulary"])


def _extract_podcast_episode_id(source_id: Optional[str]) -> Optional[int]:
    if not source_id:
        return None
    candidate = source_id.strip()
    if not candidate:
        return None

    if candidate.startswith("podcast:"):
        candidate = candidate.split(":", 1)[1]

    if candidate.isdigit():
        return int(candidate)
    return None


def _derive_source_title(source_type: str, source_id: Optional[str]) -> Optional[str]:
    if not source_id:
        return None

    parts = source_id.split(":")
    if source_type == "epub" and len(parts) >= 3:
        return parts[1].replace("_", " ").replace("-", " ")
    if source_type == "audiobook" and len(parts) >= 3:
        return f"{parts[1].replace('_', ' ')} (Track {parts[2]})"
    if source_type == "podcast" and len(parts) >= 2:
        return f"Episode {parts[-1]}"

    return source_id


def _sentence_contains_item(sentence: str, item: str) -> bool:
    normalized_sentence = (sentence or "").strip()
    normalized_item = (item or "").strip()
    if not normalized_sentence or not normalized_item:
        return False

    if " " in normalized_item:
        return normalized_item.lower() in normalized_sentence.lower()

    pattern = re.compile(rf"\b{re.escape(normalized_item)}\b", re.IGNORECASE)
    return bool(pattern.search(normalized_sentence))


def _split_text_to_sentences(text: str) -> List[str]:
    normalized = re.sub(r"\s+", " ", (text or "")).strip()
    if not normalized:
        return []
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", normalized) if s.strip()]


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
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lookup history for a specific item.
    This endpoint is dedicated to explicit user lookups (VocabLearningLog).
    """
    if not word:
        return []

    word_lower = word.lower().strip()
    fetch_limit = max(limit * 4, 80)

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

    source_keys = {(log.source_type, log.source_id) for log in logs if log.source_id}
    source_title_map: Dict[tuple[str, str], str] = {}

    reading_source_types = {
        source_type for source_type, _ in source_keys if source_type in {"epub", "rss"}
    }
    reading_source_ids = [
        source_id
        for source_type, source_id in source_keys
        if source_type in {"epub", "rss"} and source_id
    ]

    if reading_source_types and reading_source_ids:
        reading_stmt = (
            select(
                ReadingSession.source_type,
                ReadingSession.source_id,
                ReadingSession.article_title,
                ReadingSession.started_at,
            )
            .where(
                ReadingSession.user_id == current_user.user_id_str,
                ReadingSession.source_type.in_(reading_source_types),
                ReadingSession.source_id.in_(reading_source_ids),
                ReadingSession.article_title.isnot(None),
                ReadingSession.article_title != "",
            )
            .order_by(desc(ReadingSession.started_at))
        )
        reading_result = await db.execute(reading_stmt)
        for row in reading_result.all():
            key = (row.source_type, row.source_id)
            if key not in source_title_map:
                source_title_map[key] = row.article_title

    podcast_episode_ids: List[int] = []
    for source_type, source_id in source_keys:
        if source_type != "podcast":
            continue
        episode_id = _extract_podcast_episode_id(source_id)
        if episode_id is not None:
            podcast_episode_ids.append(episode_id)

    podcast_title_map: Dict[int, str] = {}
    if podcast_episode_ids:
        podcast_stmt = select(PodcastEpisode.id, PodcastEpisode.title).where(
            PodcastEpisode.id.in_(set(podcast_episode_ids))
        )
        podcast_result = await db.execute(podcast_stmt)
        podcast_title_map = {
            episode_id: title for episode_id, title in podcast_result.all()
        }

    seen_contexts = set()
    unique_contexts = []

    for log in logs:
        source_type = log.source_type or "unknown"
        source_id = log.source_id
        context_sentence = (log.context_sentence or "").strip()
        if not context_sentence:
            continue

        normalized_context = " ".join(context_sentence.split()).lower()
        normalized_key = (
            source_type.lower(),
            (source_id or "").strip(),
            normalized_context,
        )
        if normalized_key in seen_contexts:
            continue
        seen_contexts.add(normalized_key)

        source_title: Optional[str] = None
        if source_id:
            source_title = source_title_map.get((source_type, source_id))

        if source_type == "podcast":
            episode_id = _extract_podcast_episode_id(source_id)
            if episode_id is not None:
                source_title = source_title or podcast_title_map.get(episode_id)

        if not source_title:
            source_title = _derive_source_title(source_type, source_id)

        source_label = source_title or source_id or source_type

        unique_contexts.append(
            VocabularyContext(
                source_type=source_type,
                source_id=source_id,
                source_title=source_title,
                source_label=source_label,
                context_sentence=context_sentence,
                created_at=log.created_at or datetime.utcnow(),
                word=log.word or word_lower,
            )
        )

        if len(unique_contexts) >= limit:
            break

    return unique_contexts


@router.get("/usages", response_model=List[VocabularyContext])
async def get_word_usages(
    word: str,
    limit: int = 10,
    exclude_sentence: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Explore other usages for a word/collocation, regardless of prior lookup history.
    """
    if not word:
        return []

    word_lower = word.lower().strip()
    fetch_limit = max(limit * 10, 200)
    user_id = current_user.user_id_str
    excluded_context = " ".join((exclude_sentence or "").split()).lower()

    usage_rows: List[Dict[str, Any]] = []

    # 1) Explicit lookup logs
    log_stmt = (
        select(
            VocabLearningLog.source_type,
            VocabLearningLog.source_id,
            VocabLearningLog.context_sentence,
            VocabLearningLog.created_at,
        )
        .where(
            VocabLearningLog.user_id == user_id,
            func.lower(VocabLearningLog.word) == word_lower,
            VocabLearningLog.context_sentence.isnot(None),
        )
        .order_by(desc(VocabLearningLog.created_at))
        .limit(fetch_limit)
    )
    log_result = await db.execute(log_stmt)
    for row in log_result.all():
        sentence = (row.context_sentence or "").strip()
        if not sentence:
            continue
        if excluded_context and " ".join(sentence.split()).lower() == excluded_context:
            continue
        usage_rows.append(
            {
                "source_type": row.source_type,
                "source_id": row.source_id,
                "context_sentence": sentence,
                "created_at": row.created_at,
                "word": word_lower,
            }
        )

    # 2) Sentence-study records with sentence-level matching
    contains_pattern = f"%{word_lower}%"
    slr_stmt = (
        select(
            SentenceLearningRecord.source_type,
            SentenceLearningRecord.source_id,
            SentenceLearningRecord.sentence_text,
            SentenceLearningRecord.updated_at,
        )
        .where(
            SentenceLearningRecord.user_id == user_id,
            SentenceLearningRecord.sentence_text.isnot(None),
            func.lower(SentenceLearningRecord.sentence_text).like(contains_pattern),
        )
        .order_by(desc(SentenceLearningRecord.updated_at))
        .limit(fetch_limit * 2)
    )
    slr_result = await db.execute(slr_stmt)
    for row in slr_result.all():
        sentence = (row.sentence_text or "").strip()
        if not sentence:
            continue
        if not _sentence_contains_item(sentence, word_lower):
            continue
        if excluded_context and " ".join(sentence.split()).lower() == excluded_context:
            continue
        usage_rows.append(
            {
                "source_type": row.source_type,
                "source_id": row.source_id,
                "context_sentence": sentence,
                "created_at": row.updated_at,
                "word": word_lower,
            }
        )

    # 3) Review queue sentence contexts
    review_stmt = (
        select(
            ReviewItem.source_id,
            ReviewItem.sentence_text,
            ReviewItem.created_at,
        )
        .where(
            ReviewItem.user_id == user_id,
            ReviewItem.sentence_text.isnot(None),
            func.lower(ReviewItem.sentence_text).like(contains_pattern),
        )
        .order_by(desc(ReviewItem.created_at))
        .limit(fetch_limit)
    )
    review_result = await db.execute(review_stmt)
    for row in review_result.all():
        sentence = (row.sentence_text or "").strip()
        if not sentence:
            continue
        if not _sentence_contains_item(sentence, word_lower):
            continue
        if excluded_context and " ".join(sentence.split()).lower() == excluded_context:
            continue
        source_type = "unknown"
        if row.source_id and ":" in row.source_id:
            source_type = row.source_id.split(":", 1)[0]
        usage_rows.append(
            {
                "source_type": source_type,
                "source_id": row.source_id,
                "context_sentence": sentence,
                "created_at": row.created_at,
                "word": word_lower,
            }
        )

    # 4) Expand by searching full EPUB texts from recently read/studied sources
    recent_sources_stmt = (
        select(
            ReadingSession.source_type,
            ReadingSession.source_id,
            ReadingSession.started_at,
            ReadingSession.article_title,
        )
        .where(
            ReadingSession.user_id == user_id,
            ReadingSession.source_type == "epub",
        )
        .order_by(desc(ReadingSession.started_at))
        .limit(180)
    )
    recent_sources_result = await db.execute(recent_sources_stmt)

    recent_epub_sources: List[tuple[str, Optional[datetime], Optional[str]]] = []
    seen_source_ids: Set[str] = set()
    for row in recent_sources_result.all():
        source_id = row.source_id
        if not source_id or source_id in seen_source_ids:
            continue
        seen_source_ids.add(source_id)
        recent_epub_sources.append((source_id, row.started_at, row.article_title))

    for source_id, started_at, article_title in recent_epub_sources:
        parsed = parse_epub_source_id(source_id)
        if not parsed:
            continue
        filename, chapter_index = parsed
        try:
            bundle = await content_service.get_content(
                SourceType.EPUB,
                filename=filename,
                chapter_index=chapter_index,
            )
        except Exception:
            continue

        for sentence in _split_text_to_sentences(bundle.full_text or ""):
            if not _sentence_contains_item(sentence, word_lower):
                continue
            normalized_sentence = " ".join(sentence.split()).lower()
            if excluded_context and normalized_sentence == excluded_context:
                continue
            usage_rows.append(
                {
                    "source_type": "epub",
                    "source_id": source_id,
                    "context_sentence": sentence,
                    "created_at": started_at,
                    "word": word_lower,
                    "source_title_hint": article_title or bundle.title,
                }
            )
            if len(usage_rows) >= fetch_limit * 3:
                break
        if len(usage_rows) >= fetch_limit * 3:
            break

    usage_rows.sort(
        key=lambda r: r.get("created_at") or datetime.min,
        reverse=True,
    )

    source_keys = {
        (row["source_type"], row["source_id"])
        for row in usage_rows
        if row.get("source_id")
    }
    source_title_map: Dict[tuple[str, str], str] = {}

    reading_source_types = {
        source_type for source_type, _ in source_keys if source_type in {"epub", "rss"}
    }
    reading_source_ids = [
        source_id
        for source_type, source_id in source_keys
        if source_type in {"epub", "rss"} and source_id
    ]

    if reading_source_types and reading_source_ids:
        reading_title_stmt = (
            select(
                ReadingSession.source_type,
                ReadingSession.source_id,
                ReadingSession.article_title,
                ReadingSession.started_at,
            )
            .where(
                ReadingSession.user_id == user_id,
                ReadingSession.source_type.in_(reading_source_types),
                ReadingSession.source_id.in_(reading_source_ids),
                ReadingSession.article_title.isnot(None),
                ReadingSession.article_title != "",
            )
            .order_by(desc(ReadingSession.started_at))
        )
        reading_title_result = await db.execute(reading_title_stmt)
        for row in reading_title_result.all():
            key = (row.source_type, row.source_id)
            if key not in source_title_map:
                source_title_map[key] = row.article_title

    podcast_episode_ids: List[int] = []
    for source_type, source_id in source_keys:
        if source_type != "podcast":
            continue
        episode_id = _extract_podcast_episode_id(source_id)
        if episode_id is not None:
            podcast_episode_ids.append(episode_id)

    podcast_title_map: Dict[int, str] = {}
    if podcast_episode_ids:
        podcast_stmt = select(PodcastEpisode.id, PodcastEpisode.title).where(
            PodcastEpisode.id.in_(set(podcast_episode_ids))
        )
        podcast_result = await db.execute(podcast_stmt)
        podcast_title_map = {
            episode_id: title for episode_id, title in podcast_result.all()
        }

    seen_contexts = set()
    usage_contexts: List[VocabularyContext] = []

    for row in usage_rows:
        source_type = row.get("source_type") or "unknown"
        source_id = row.get("source_id")
        sentence = row.get("context_sentence")
        if not sentence:
            continue

        normalized_key = (
            source_type.lower(),
            (source_id or "").strip(),
            " ".join(sentence.split()).lower(),
        )
        if normalized_key in seen_contexts:
            continue
        seen_contexts.add(normalized_key)

        source_title = None
        if source_id:
            source_title = source_title_map.get((source_type, source_id))

        if source_type == "podcast":
            episode_id = _extract_podcast_episode_id(source_id)
            if episode_id is not None:
                source_title = source_title or podcast_title_map.get(episode_id)

        source_title = (
            source_title
            or row.get("source_title_hint")
            or _derive_source_title(source_type, source_id)
        )
        source_label = source_title or source_id or source_type

        usage_contexts.append(
            VocabularyContext(
                source_type=source_type,
                source_id=source_id,
                source_title=source_title,
                source_label=source_label,
                context_sentence=sentence,
                created_at=row.get("created_at") or datetime.utcnow(),
                word=row.get("word") or word_lower,
            )
        )

        if len(usage_contexts) >= limit:
            break

    return usage_contexts


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
