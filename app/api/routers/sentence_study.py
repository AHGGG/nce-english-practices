"""
Sentence Study API Router for Adaptive Sentence Learning (ASL) mode.
Endpoints for tracking study progress, recording learning results, and generating simplifications.

Refactored: Business logic delegated to sentence_study_service.
Schemas extracted to: app/models/sentence_study_schemas.py
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from datetime import datetime

from app.core.db import get_db
from app.models.orm import (
    SentenceLearningRecord,
    UserComprehensionProfile,
    WordProficiency,
    ReviewItem,
)
from app.services.sentence_study_service import sentence_study_service
from app.models.sentence_study_schemas import (
    StudyProgressResponse,
    RecordRequest,
    SimplifyRequest,
    OverviewRequest,
    ExplainWordRequest,
    LastSessionResponse,
    UnclearSentenceInfo,
    StudyHighlightsResponse,
    DetectCollocationsRequest,
    DetectCollocationsResponse,
    DetectCollocationsBatchRequest,
    DetectCollocationsBatchResponse,
    PrefetchCollocationsRequest,
    ReviewQueueItem,
    ReviewRequest,
    WordToReview,
    ProfileResponse,
    CollocationItem,
)
from app.api.routers.auth import get_current_user_id

router = APIRouter(prefix="/api/sentence-study", tags=["sentence-study"])


# ============================================================
# Endpoints
# ============================================================


@router.get("/last-session", response_model=Optional[LastSessionResponse])
async def get_last_session(
    user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)
):
    """Get the user's last studied article/session."""
    # Find the most recent learning record
    result = await db.execute(
        select(SentenceLearningRecord)
        .where(SentenceLearningRecord.user_id == user_id)
        .order_by(SentenceLearningRecord.created_at.desc())
        .limit(1)
    )
    record = result.scalar_one_or_none()

    if not record:
        return None

    return LastSessionResponse(
        source_id=record.source_id,
        source_type=record.source_type,
        last_studied_at=record.created_at.isoformat(),
    )


@router.get("/{source_id:path}/progress", response_model=StudyProgressResponse)
async def get_study_progress(
    source_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get study progress for an article."""
    # Count studied sentences and clear count
    result = await db.execute(
        select(
            func.count(func.distinct(SentenceLearningRecord.sentence_index)).label(
                "total"
            ),
            func.sum(
                case((SentenceLearningRecord.initial_response == "clear", 1), else_=0)
            ).label("clear_count"),
        )
        .where(SentenceLearningRecord.source_id == source_id)
        .where(SentenceLearningRecord.user_id == user_id)
    )
    row = result.first()

    studied = row.total if row and row.total else 0
    clear = int(row.clear_count) if row and row.clear_count else 0

    # Get last studied index to determine current position
    last_result = await db.execute(
        select(SentenceLearningRecord.sentence_index)
        .where(SentenceLearningRecord.source_id == source_id)
        .where(SentenceLearningRecord.user_id == user_id)
        .order_by(SentenceLearningRecord.sentence_index.desc())
        .limit(1)
    )
    last_row = last_result.first()
    current_index = (last_row.sentence_index + 1) if last_row else 0

    return StudyProgressResponse(
        source_id=source_id,
        studied_count=studied,
        clear_count=clear,
        unclear_count=studied - clear,
        current_index=current_index,
    )


@router.get(
    "/{source_id:path}/study-highlights", response_model=StudyHighlightsResponse
)
async def get_study_highlights(
    source_id: str,
    total_sentences: int = 0,  # Total sentences in the article (from frontend)
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get all words/phrases looked up during study of an article.

    Used for the 'COMPLETED' view to highlight all looked-up items in the full article.
    """
    # Fetch all learning records for this article
    result = await db.execute(
        select(SentenceLearningRecord)
        .where(SentenceLearningRecord.source_id == source_id)
        .where(SentenceLearningRecord.user_id == user_id)
        .order_by(SentenceLearningRecord.sentence_index)
    )
    records = result.scalars().all()

    # Aggregate all word/phrase clicks and collect unclear sentences
    all_word_clicks = set()
    all_phrase_clicks = set()
    unclear_sentences = []
    clear_count = 0

    for record in records:
        if record.word_clicks:
            all_word_clicks.update(record.word_clicks)
        if record.phrase_clicks:
            all_phrase_clicks.update(record.phrase_clicks)
        if record.initial_response == "clear":
            clear_count += 1
        else:
            # Record is unclear - collect info for highlighting
            # Determine max_simplify_stage from interaction_log if available
            max_stage = 0
            if record.interaction_log:
                for event in record.interaction_log:
                    if event.get("action") == "simplify_stage":
                        stage = event.get("stage", 0)
                        if stage > max_stage:
                            max_stage = stage
            unclear_sentences.append(
                UnclearSentenceInfo(
                    sentence_index=record.sentence_index,
                    unclear_choice=record.unclear_choice,
                    max_simplify_stage=max_stage,
                )
            )

    studied_count = len(records)
    # Determine if complete: all sentences studied (based on total_sentences from frontend)
    is_complete = studied_count >= total_sentences > 0

    return StudyHighlightsResponse(
        source_id=source_id,
        word_clicks=list(all_word_clicks),
        phrase_clicks=list(all_phrase_clicks),
        unclear_sentences=unclear_sentences,
        studied_count=studied_count,
        clear_count=clear_count,
        is_complete=is_complete,
    )


@router.post("/record")
async def record_learning(
    req: RecordRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Record a sentence learning result."""

    # Deduplicate clicks while preserving order
    unique_word_clicks = list(dict.fromkeys(req.word_clicks))
    unique_phrase_clicks = list(dict.fromkeys(req.phrase_clicks))

    record = SentenceLearningRecord(
        user_id=user_id,
        source_type=req.source_type,
        source_id=req.source_id,
        sentence_index=req.sentence_index,
        sentence_text=req.sentence_text,  # Store for review display
        initial_response=req.initial_response,
        unclear_choice=req.unclear_choice,
        simplified_response=req.simplified_response,
        word_clicks=unique_word_clicks,
        phrase_clicks=unique_phrase_clicks,
        dwell_time_ms=req.dwell_time_ms,
        word_count=req.word_count,
        interaction_log=req.interaction_events or [],
    )

    # ============================================================
    # Deep Diagnosis & Profile Update (Delegated to Service)
    # ============================================================

    diagnosis_result = await sentence_study_service.perform_deep_diagnosis(
        db=db,
        user_id=user_id,
        initial=req.initial_response,
        choice=req.unclear_choice,
        simplified=req.simplified_response,
        word_clicks=unique_word_clicks,
        phrase_clicks=unique_phrase_clicks,
        interactions=req.interaction_events or [],
        dwell_ms=req.dwell_time_ms,
        word_count=req.word_count,
        max_simplify_stage=req.max_simplify_stage,
    )

    record.diagnosed_gap_type = diagnosis_result["gap_type"]
    record.diagnosed_patterns = diagnosis_result["patterns"]
    record.confidence = diagnosis_result["confidence"]

    # --- SRS Scheduling ---
    # Set scheduled_review for sentences with gaps
    if diagnosis_result["gap_type"] is not None:
        record.scheduled_review = (
            datetime.utcnow()
            + sentence_study_service.calculate_review_interval(
                0, diagnosis_result["gap_type"]
            )
        )  # First review
        record.review_count = 0

    db.add(record)

    # --- Update UserComprehensionProfile (Deep Integration) ---
    await sentence_study_service.update_user_profile_deep(
        db, user_id, diagnosis_result, unique_word_clicks
    )

    # --- Create ReviewItem for SM-2 based spaced repetition ---
    should_create_review = req.initial_response == "unclear" or (
        req.initial_response == "clear" and (unique_word_clicks or unique_phrase_clicks)
    )

    review_item_id = None
    if should_create_review and req.sentence_text:
        # Check if review item already exists for this sentence
        existing_review = await db.execute(
            select(ReviewItem)
            .where(ReviewItem.user_id == user_id)
            .where(ReviewItem.source_id == req.source_id)
            .where(ReviewItem.sentence_index == req.sentence_index)
        )
        existing = existing_review.scalar_one_or_none()

        if existing:
            # Update highlighted items
            current_items = set(existing.highlighted_items or [])
            current_items.update(unique_word_clicks)
            current_items.update(unique_phrase_clicks)
            existing.highlighted_items = list(current_items)
            review_item_id = existing.id
        else:
            # Create new review item
            highlighted = list(set(unique_word_clicks + unique_phrase_clicks))
            review_item = ReviewItem(
                user_id=user_id,
                source_id=req.source_id,
                sentence_index=req.sentence_index,
                sentence_text=req.sentence_text,
                highlighted_items=highlighted,
                difficulty_type=diagnosis_result.get("gap_type")
                or req.unclear_choice
                or "vocabulary",
                easiness_factor=2.5,
                interval_days=1.0,
                repetition=0,
                next_review_at=datetime.utcnow(),  # Available immediately for first review
            )
            db.add(review_item)
            await db.flush()  # Get ID before commit
            review_item_id = review_item.id

    await db.commit()
    await db.refresh(record)

    return {
        "status": "ok",
        "record_id": record.id,
        "diagnosed_gap": diagnosis_result["gap_type"],
        "confidence": diagnosis_result["confidence"],
        "patterns": diagnosis_result["patterns"],
        "review_item_id": review_item_id,
    }


@router.post("/simplify")
async def simplify_sentence(req: SimplifyRequest):
    """Generate simplified version of a sentence using streaming LLM."""

    async def generate():
        async for chunk_json in sentence_study_service.stream_simplification(
            sentence=req.sentence,
            simplify_type=req.simplify_type,
            stage=req.stage,
            prev_sentence=req.prev_sentence,
            next_sentence=req.next_sentence,
        ):
            yield f"data: {chunk_json}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/overview")
async def generate_overview(req: OverviewRequest, db: AsyncSession = Depends(get_db)):
    """
    Generate article overview with English summary and Chinese translation.
    Cache priority: in-memory -> DB -> LLM generation.
    """

    async def generate():
        async for chunk_json in sentence_study_service.stream_overview_generation(
            db=db,
            title=req.title,
            full_text=req.full_text,
            total_sentences=req.total_sentences,
        ):
            yield f"data: {chunk_json}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.post("/explain-word")
async def explain_word_in_context(req: ExplainWordRequest):
    """Stream LLM explanation of a word in its sentence context."""
    text_to_explain = req.text or req.word
    if not text_to_explain:
        raise HTTPException(
            status_code=400, detail="Either 'text' or 'word' must be provided"
        )

    async def generate():
        async for chunk in sentence_study_service.stream_word_explanation(
            text=text_to_explain,
            sentence=req.sentence,
            style=req.style,
            prev_sentence=req.prev_sentence,
            next_sentence=req.next_sentence,
        ):
            yield f"data: {chunk}\n\n"

        yield 'data: {"type": "done"}\n\n'

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.post("/explain-word-sync")
async def explain_word_sync(req: ExplainWordRequest):
    """
    Non-streaming version for React Native mobile app.
    Returns complete JSON response with explanation.
    """
    import logging

    logger = logging.getLogger(__name__)

    from app.services.sentence_study_service import sentence_study_service as svc

    text_to_explain = req.text or req.word
    if not text_to_explain:
        raise HTTPException(
            status_code=400, detail="Either 'text' or 'word' must be provided"
        )

    logger.info(
        f"[explain-word-sync] text={text_to_explain}, sentence={req.sentence[:50] if req.sentence else 'N/A'}..."
    )

    try:
        explanation = await svc.explain_word_sync(
            text=text_to_explain,
            sentence=req.sentence,
            style=req.style,
            prev_sentence=req.prev_sentence,
            next_sentence=req.next_sentence,
        )

        logger.info(
            f"[explain-word-sync] success, explanation length={len(explanation)}"
        )

        return {
            "type": "complete",
            "content": explanation,
        }
    except Exception as e:
        logger.error(f"[explain-word-sync] error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Collocation Detection
# ============================================================


@router.post("/detect-collocations", response_model=DetectCollocationsResponse)
async def detect_collocations(
    req: DetectCollocationsRequest, db: AsyncSession = Depends(get_db)
):
    """Detect common collocations/phrases in a sentence using LLM."""
    collocations = await sentence_study_service.get_or_detect_collocations(
        db=db, sentence=req.sentence
    )
    # Convert dict to CollocationItem for type safety
    return DetectCollocationsResponse(
        collocations=[CollocationItem(**c) for c in collocations]
    )


@router.post("/prefetch-collocations")
async def prefetch_collocations(req: PrefetchCollocationsRequest):
    """Background prefetch collocations for upcoming sentences (lookahead)."""
    import asyncio
    from app.core.db import AsyncSessionLocal

    sentences_to_prefetch = req.sentences[:5]

    async def _prefetch():
        async with AsyncSessionLocal() as new_db:
            for sentence in sentences_to_prefetch:
                try:
                    await sentence_study_service.get_or_detect_collocations(
                        new_db, sentence
                    )
                except Exception:
                    pass

    asyncio.create_task(_prefetch())
    return {"status": "prefetching", "count": len(sentences_to_prefetch)}


@router.post(
    "/detect-collocations-batch", response_model=DetectCollocationsBatchResponse
)
async def detect_collocations_batch(
    req: DetectCollocationsBatchRequest, db: AsyncSession = Depends(get_db)
):
    """
    Detect collocations for multiple sentences at once (max 10).
    Useful for batch loading when scrolling through content.
    Backend has 3-layer cache (Memory -> DB -> LLM), so cached sentences return instantly.
    """
    import asyncio

    sentences = req.sentences[:10]  # Limit to 10 sentences

    async def detect_one(sentence: str):
        try:
            collocations = await sentence_study_service.get_or_detect_collocations(
                db=db, sentence=sentence
            )
            # Convert dict to CollocationItem
            return sentence, [CollocationItem(**c) for c in collocations]
        except Exception as e:
            print(f"Collocation detection failed for sentence: {e}")
            return sentence, []

    # Run all detections in parallel
    results = await asyncio.gather(*[detect_one(s) for s in sentences])

    return DetectCollocationsBatchResponse(results=dict(results))


# ============================================================
# SRS (Spaced Repetition) Scheduling
# ============================================================


@router.get("/queue", response_model=List[ReviewQueueItem])
async def get_review_queue(
    user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)
):
    """Get sentences due for review (scheduled_review <= now)."""
    now = datetime.utcnow()
    result = await db.execute(
        select(SentenceLearningRecord)
        .where(
            SentenceLearningRecord.user_id == user_id,
            SentenceLearningRecord.scheduled_review <= now,
            SentenceLearningRecord.diagnosed_gap_type.isnot(None),
        )
        .order_by(SentenceLearningRecord.scheduled_review.asc())
        .limit(50)
    )
    records = result.scalars().all()

    return [
        ReviewQueueItem(
            record_id=r.id,
            source_type=r.source_type,
            source_id=r.source_id,
            sentence_index=r.sentence_index,
            sentence_text=r.sentence_text,
            diagnosed_gap_type=r.diagnosed_gap_type,
            scheduled_review=r.scheduled_review.isoformat()
            if r.scheduled_review
            else "",
            review_count=r.review_count or 0,
        )
        for r in records
    ]


@router.post("/review")
async def complete_review(
    req: ReviewRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Complete a review and reschedule the sentence."""
    result = await db.execute(
        select(SentenceLearningRecord)
        .where(SentenceLearningRecord.id == req.record_id)
        .where(SentenceLearningRecord.user_id == user_id)
    )
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    if req.result == "clear":
        # User understood -> schedule further out
        record.review_count = (record.review_count or 0) + 1
        record.scheduled_review = (
            datetime.utcnow()
            + sentence_study_service.calculate_review_interval(
                record.review_count, record.diagnosed_gap_type
            )
        )
    else:
        # User still unclear -> reset to short interval
        record.scheduled_review = (
            datetime.utcnow()
            + sentence_study_service.calculate_review_interval(
                0, record.diagnosed_gap_type
            )
        )
        # Don't reset review_count to preserve history

    await db.commit()

    return {
        "status": "ok",
        "next_review": record.scheduled_review.isoformat(),
        "review_count": record.review_count,
    }


@router.get("/profile", response_model=ProfileResponse)
async def get_user_profile(
    user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)
):
    # 1. Get study stats from SentenceLearningRecord
    stats_result = await db.execute(
        select(
            func.count(SentenceLearningRecord.id).label("total"),
            func.sum(
                case((SentenceLearningRecord.initial_response == "clear", 1), else_=0)
            ).label("clear"),
            func.sum(
                case(
                    (SentenceLearningRecord.diagnosed_gap_type == "vocabulary", 1),
                    else_=0,
                )
            ).label("vocab"),
            func.sum(
                case(
                    (SentenceLearningRecord.diagnosed_gap_type == "structure", 1),
                    else_=0,
                )
            ).label("grammar"),
            func.sum(
                case(
                    (SentenceLearningRecord.diagnosed_gap_type == "meaning", 1), else_=0
                )
            ).label("meaning"),
            func.sum(
                case(
                    (SentenceLearningRecord.diagnosed_gap_type == "collocation", 1),
                    else_=0,
                )
            ).label("collocation"),
        ).where(SentenceLearningRecord.user_id == user_id)
    )
    stats = stats_result.one()
    total = stats.total or 0
    clear = stats.clear or 0
    unclear = total - clear

    # 2. Get words needing practice from WordProficiency
    words_result = await db.execute(
        select(WordProficiency)
        .where(
            WordProficiency.user_id == user_id, WordProficiency.difficulty_score > 0.3
        )
        .order_by(WordProficiency.difficulty_score.desc())
        .limit(15)
    )
    difficult_words = words_result.scalars().all()

    # 3. Generate insights from patterns
    profile_result = await db.execute(
        select(UserComprehensionProfile).where(
            UserComprehensionProfile.user_id == user_id
        )
    )
    profile = profile_result.scalar_one_or_none()

    insights = []
    if profile and profile.common_grammar_gaps:
        pattern_translations = {
            "slow_reading": "阅读速度较慢，建议多练习限时阅读",
            "phrase_lookup": "固定搭配是弱项，建议专项练习 collocations",
            "multi_word_query": "多词表达查询频繁，注意积累短语",
            "deep_dive_needed": "需要深入解释才能理解，语境理解能力待提升",
            "long_sentence_struggle": "长句理解困难，建议练习句子结构拆解",
        }
        from collections import Counter

        counts = Counter(profile.common_grammar_gaps)
        for pattern, count in counts.most_common(3):
            if pattern in pattern_translations and count >= 2:
                insights.append(pattern_translations[pattern])

    # 4. Generate recommendation
    recommendation = None
    if total == 0:
        recommendation = "开始你的第一次句子学习之旅"
    elif unclear > clear:
        recommendation = "多练习! 试试选择较简单的文章开始"
    elif len(difficult_words) > 5:
        recommendation = f"有 {len(difficult_words)} 个词汇需要加强（见下方列表）"
    elif stats.collocation and stats.collocation > stats.vocab:
        recommendation = "固定搭配是主要弱点，多关注短语积累"
    else:
        recommendation = "继续保持! 挑战更难的文章吧"

    return ProfileResponse(
        user_id=user_id,
        total_sentences_studied=total,
        clear_count=clear,
        unclear_count=unclear,
        clear_rate=round(clear / max(total, 1), 2),
        vocab_gap_count=stats.vocab or 0,
        grammar_gap_count=stats.grammar or 0,
        meaning_gap_count=stats.meaning or 0,
        collocation_gap_count=stats.collocation or 0,
        words_to_review=[
            WordToReview(
                word=w.word,
                difficulty_score=round(w.difficulty_score, 2),
                exposure_count=w.exposure_count,
            )
            for w in difficult_words
        ],
        insights=insights,
        recommendation=recommendation,
    )
