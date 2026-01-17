"""
Review System API Router for SM-2 based spaced repetition.
Endpoints for managing review queue, completing reviews, and memory curve statistics.
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import math

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.engine import Result

from app.core.db import get_db
from app.models.orm import ReviewItem, ReviewLog


router = APIRouter(prefix="/api/review", tags=["review"])


# ============================================================
# Request/Response Models
# ============================================================


class ReviewQueueItem(BaseModel):
    """Item in the review queue."""

    id: int
    source_id: str
    sentence_index: int
    sentence_text: str
    highlighted_items: List[str]
    difficulty_type: str
    interval_days: float
    repetition: int
    next_review_at: str
    created_at: str


class ReviewQueueResponse(BaseModel):
    """Response with review queue items."""

    items: List[ReviewQueueItem]
    count: int


class CompleteReviewRequest(BaseModel):
    """Request to complete a review."""

    item_id: int
    quality: int  # 1=forgot, 2=remembered after help, 3=remembered, 5=easy
    duration_ms: int = 0


class CompleteReviewResponse(BaseModel):
    """Response after completing a review."""

    next_review_at: str
    new_interval: float
    new_ef: float
    repetition: int


class CreateReviewRequest(BaseModel):
    """Request to create a review item."""

    source_id: str
    sentence_index: int
    sentence_text: str
    highlighted_items: List[str] = []
    difficulty_type: str = "vocabulary"
    user_id: str = "default_user"


class CreateReviewResponse(BaseModel):
    """Response after creating review item."""

    id: int
    next_review_at: str


class MemoryCurvePoint(BaseModel):
    """A point on the memory curve."""

    days_since_first_review: int
    retention_rate: float


class MemoryCurveResponse(BaseModel):
    """Memory curve statistics."""

    theoretical: List[MemoryCurvePoint]
    actual: List[MemoryCurvePoint]
    total_reviews: int
    successful_reviews: int


class ReviewContextResponse(BaseModel):
    """Context for a review item."""

    previous_sentence: Optional[str] = None
    target_sentence: str
    next_sentence: Optional[str] = None
    source_title: Optional[str] = None
    chapter_title: Optional[str] = None


# ============================================================
# SM-2 Algorithm Implementation
# ============================================================


def calculate_sm2(
    quality: int, ef: float, interval: float, repetition: int
) -> Dict[str, Any]:
    """
    SM-2 algorithm implementation (matching the original SuperMemo 2 paper).

    Reference: https://github.com/open-spaced-repetition/sm-2

    Algorithm rules:
    1. EF (Easiness Factor) is ONLY updated on successful reviews (quality >= 3)
    2. On failure (quality < 3): EF stays unchanged, repetition resets to 0
    3. Interval progression: 1 day -> 6 days -> (interval * EF)

    Args:
        quality: Review quality (1=forgot, 3=remembered, 5=easy)
        ef: Current easiness factor (minimum 1.3)
        interval: Current interval in days
        repetition: Number of consecutive successful reviews

    Returns:
        Dictionary with new_ef, new_interval, new_repetition
    """
    if quality < 3:  # Failed review
        # On failure: reset repetition, set short interval, but keep EF unchanged
        new_repetition = 0
        new_interval = 1.0  # Reset to 1 day
        new_ef = ef  # EF does NOT change on incorrect responses (per original SM-2)
    else:  # Successful review (quality >= 3)
        # Update EF only on success
        # EF' = EF + (0.1 - (5 - Q) * (0.08 + (5 - Q) * 0.02))
        # When Q=5: EF increases by 0.1
        # When Q=4: EF stays same (0.0)
        # When Q=3: EF decreases by 0.14
        new_ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        new_ef = max(1.3, new_ef)  # EF minimum is 1.3

        new_repetition = repetition + 1

        if new_repetition == 1:
            new_interval = 1.0
        elif new_repetition == 2:
            new_interval = 6.0
        else:
            new_interval = interval * new_ef

    return {
        "new_ef": round(new_ef, 2),
        "new_interval": round(new_interval, 1),
        "new_repetition": new_repetition,
    }


def calculate_theoretical_retention(days: int, stability: float = 10.0) -> float:
    """
    Calculate theoretical Ebbinghaus retention rate.
    R(t) = e^(-t/S) where S is stability constant.
    """
    return math.exp(-days / stability)


# ============================================================
# API Endpoints
# ============================================================

class ReviewScheduleItem(BaseModel):
    id: int
    text: str
    next_review_at: datetime
    ef: float
    interval: float
    repetition: int
    last_review: Optional[Dict[str, Any]] = None

class ReviewScheduleResponse(BaseModel):
    schedule: Dict[str, List[ReviewScheduleItem]]

@router.get("/debug/schedule", response_model=ReviewScheduleResponse)
async def get_review_schedule_debug(
    days: int = 14,
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed review schedule for debugging purposes.
    Returns items grouped by date (YYYY-MM-DD), including logic trace.
    """
    now = datetime.utcnow()
    end_date = now + timedelta(days=days)

    # 1. Fetch items due in range (or overdue)
    # We want everything that IS due or WILL BE due shortly.
    # Actually, let's just fetch all active items sorted by date for simplicity of debugging?
    # No, limit to range.
    
    stmt = (
        select(ReviewItem)
        .where(ReviewItem.next_review_at <= end_date)
        .order_by(ReviewItem.next_review_at.asc())
        # .limit(200) # Safety limit?
    )
    
    result = await db.execute(stmt)
    items = result.scalars().all()

    # 2. Fetch last logs for these items to explain logic
    # We can do a second query or join. N+1 is okay for debug endpoint usually, but let's be efficient.
    # Group ids
    item_ids = [item.id for item in items]
    
    # Fetch latest log for each item
    # This is a bit complex in SQL (Window function), let's just lazy load or separate queries for now.
    # Since it's a debug page, let's fetch logs in bulk where item_id IN (...)
    # And allow multiple logs? No, just need the last one.
    
    logs_map = {}
    if item_ids:

        
        # Simple approach: fetch all logs for these items, sort desc, pick first in python
        # (Not efficient for production, fine for debug)
        log_stmt = (
            select(ReviewLog)
            .where(ReviewLog.review_item_id.in_(item_ids))
            .order_by(ReviewLog.reviewed_at.desc())
        )
        log_result = await db.execute(log_stmt)
        all_logs = log_result.scalars().all()
        
        for log in all_logs:
            if log.review_item_id not in logs_map:
                logs_map[log.review_item_id] = log

    # 3. Group by Day
    schedule: Dict[str, List[ReviewScheduleItem]] = {}
    
    for item in items:
        # Determine Key (Date)
        # Convert to YYYY-MM-DD
        due_date = item.next_review_at.strftime("%Y-%m-%d")
        
        if due_date not in schedule:
            schedule[due_date] = []
            
        last_log = logs_map.get(item.id)
        last_review_info = None
        if last_log:
            last_review_info = {
                "date": last_log.reviewed_at.isoformat(),
                "quality": last_log.quality,
                "duration_ms": last_log.duration_ms,
                "interval_before": last_log.interval_at_review
            }
            
        schedule[due_date].append(
            ReviewScheduleItem(
                id=item.id,
                text=item.sentence_text,
                next_review_at=item.next_review_at,
                ef=item.easiness_factor,
                interval=item.interval_days,
                repetition=item.repetition,
                last_review=last_review_info
            )
        )

    return ReviewScheduleResponse(schedule=schedule)


class MemoryCurveDebugBucket(BaseModel):
    """Debug info for a memory curve bucket."""
    day: int
    interval_range: str
    sample_size: int
    success_count: int
    retention_rate: Optional[float]


class MemoryCurveDebugLog(BaseModel):
    """Debug info for a single review log."""
    id: int
    review_item_id: int
    interval_at_review: float
    quality: int
    reviewed_at: str
    duration_ms: int
    sentence_preview: Optional[str] = None


class MemoryCurveDebugResponse(BaseModel):
    """Debug response for memory curve analysis."""
    total_logs: int
    interval_distribution: Dict[str, int]  # interval range -> count
    buckets: List[MemoryCurveDebugBucket]
    recent_logs: List[MemoryCurveDebugLog]
    summary: Dict[str, Any]


@router.get("/debug/memory-curve", response_model=MemoryCurveDebugResponse)
async def get_memory_curve_debug(
    user_id: str = "default_user",
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed debug info for memory curve analysis.
    Shows ReviewLog data, interval distribution, and bucket statistics.
    """
    # SM-2 Optimized Buckets (same as in get_memory_curve_data)
    # SM-2 intervals: 1 → 6 → ~15 → ~37 days
    bucket_ranges = {
        1: (0, 3),     # Day 1: First review (interval=1)
        6: (3, 10),    # Day 6: Second review (interval=6)
        15: (10, 25),  # Day 15: Third review (interval≈15)
        40: (25, 60),  # Day 40: Fourth+ review (interval≈37+)
    }

    # 1. Get total log count
    total_stmt = (
        select(func.count())
        .select_from(ReviewLog)
        .join(ReviewItem)
        .where(ReviewItem.user_id == user_id)
    )
    total_result = await db.execute(total_stmt)
    total_logs = total_result.scalar() or 0

    # 2. Get interval distribution
    interval_dist_stmt = (
        select(
            ReviewLog.interval_at_review,
            func.count().label("count")
        )
        .join(ReviewItem)
        .where(ReviewItem.user_id == user_id)
        .group_by(ReviewLog.interval_at_review)
        .order_by(ReviewLog.interval_at_review)
    )
    dist_result = await db.execute(interval_dist_stmt)
    dist_rows = dist_result.all()

    interval_distribution = {}
    for row in dist_rows:
        interval_val = row.interval_at_review
        count = row.count
        # Group into SM-2 aligned ranges
        if interval_val < 3:
            key = "0-3 days"
        elif interval_val < 10:
            key = "3-10 days"
        elif interval_val < 25:
            key = "10-25 days"
        elif interval_val < 60:
            key = "25-60 days"
        else:
            key = "60+ days"
        interval_distribution[key] = interval_distribution.get(key, 0) + count

    # 3. Get bucket statistics
    from sqlalchemy import and_, case
    buckets = []
    sorted_days = sorted(bucket_ranges.keys())

    for day in sorted_days:
        min_int, max_int = bucket_ranges[day]
        bucket_stmt = (
            select(
                func.count().label("total"),
                func.count(case((ReviewLog.quality >= 3, 1), else_=None)).label("success")
            )
            .select_from(ReviewLog)
            .join(ReviewItem)
            .where(ReviewItem.user_id == user_id)
            .where(ReviewLog.interval_at_review >= min_int)
            .where(ReviewLog.interval_at_review < max_int)
        )
        bucket_result = await db.execute(bucket_stmt)
        bucket_row = bucket_result.one()

        sample_size = bucket_row.total or 0
        success_count = bucket_row.success or 0
        retention_rate = round(success_count / sample_size, 2) if sample_size > 0 else None

        buckets.append(MemoryCurveDebugBucket(
            day=day,
            interval_range=f"{min_int}-{max_int}",
            sample_size=sample_size,
            success_count=success_count,
            retention_rate=retention_rate
        ))

    # 4. Get recent logs with sentence preview
    logs_stmt = (
        select(ReviewLog, ReviewItem.sentence_text)
        .join(ReviewItem)
        .where(ReviewItem.user_id == user_id)
        .order_by(ReviewLog.reviewed_at.desc())
        .limit(limit)
    )
    logs_result = await db.execute(logs_stmt)
    logs_rows = logs_result.all()

    recent_logs = []
    for row in logs_rows:
        log = row[0]
        sentence = row[1]
        recent_logs.append(MemoryCurveDebugLog(
            id=log.id,
            review_item_id=log.review_item_id,
            interval_at_review=log.interval_at_review,
            quality=log.quality,
            reviewed_at=log.reviewed_at.isoformat(),
            duration_ms=log.duration_ms,
            sentence_preview=sentence[:50] + "..." if sentence and len(sentence) > 50 else sentence
        ))

    # 5. Summary stats
    avg_quality_stmt = (
        select(func.avg(ReviewLog.quality))
        .join(ReviewItem)
        .where(ReviewItem.user_id == user_id)
    )
    avg_result = await db.execute(avg_quality_stmt)
    avg_quality = avg_result.scalar()

    summary = {
        "total_logs": total_logs,
        "avg_quality": round(avg_quality, 2) if avg_quality else None,
        "buckets_with_data": sum(1 for b in buckets if b.sample_size > 0),
        "total_buckets": len(buckets),
        "explanation": (
            "Memory curve uses interval_at_review to bucket reviews. "
            "Buckets are SM-2 aligned: Day 1 (0-3), Day 6 (3-10), Day 15 (10-25), Day 40 (25-60). "
            "Later buckets have data after successful reviews increase the interval."
        )
    }

    return MemoryCurveDebugResponse(
        total_logs=total_logs,
        interval_distribution=interval_distribution,
        buckets=buckets,
        recent_logs=recent_logs,
        summary=summary
    )


@router.get("/context/{item_id}", response_model=ReviewContextResponse)
async def get_review_context(item_id: int, db: AsyncSession = Depends(get_db)):
    """
    Get context (surrounding sentences) for a review item.
    Resolves the source content via ContentService.
    """
    # 1. Get Review Item
    stmt = select(ReviewItem).where(ReviewItem.id == item_id)
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Review item not found")

    # 2. Parse Source ID
    # Format: "type:id_part1:id_part2..."
    parts = item.source_id.split(":")
    if len(parts) < 2:
        return ReviewContextResponse(target_sentence=item.sentence_text)

    source_type = parts[0]

    try:
        from app.services.content_service import content_service
        from app.models.content_schemas import BlockType, SourceType

        # 3. Fetch Content Bundle
        if source_type == "epub":
            if len(parts) < 3:
                return ReviewContextResponse(target_sentence=item.sentence_text)
            filename = parts[1]
            chapter_index = int(parts[2])

            bundle = await content_service.get_content(
                source_type=SourceType.EPUB,
                filename=filename,
                chapter_index=chapter_index,
            )

            # Flatten sentences from blocks
            all_sentences = []
            for block in bundle.blocks:
                if block.type == BlockType.PARAGRAPH:
                    all_sentences.extend(block.sentences)

        else:
            # RSS, Podcast, PlainText - usually flat lists or handle differently
            # For now, best effort parsing based on source_id conventions in those providers
            # Assuming they implement fetch() similar to standard interface
            # This part might need adjustment based on specific provider implementations
            return ReviewContextResponse(target_sentence=item.sentence_text)

        # 4. Find Target and Neighbors
        # Use stored index if valid
        target_idx = item.sentence_index

        # Verify index points to correct sentence (handle content updates)
        if 0 <= target_idx < len(all_sentences):
            # Fuzzy check or exact check? Let's trust index first, but verify length
            pass
        else:
            # Fallback: find by text
            try:
                target_idx = all_sentences.index(item.sentence_text)
            except ValueError:
                # Text mismatch (maybe cleaned?), return just target
                return ReviewContextResponse(
                    target_sentence=item.sentence_text, source_title=bundle.title
                )

        # 5. Extract Context
        prev_sent = all_sentences[target_idx - 1] if target_idx > 0 else None
        next_sent = (
            all_sentences[target_idx + 1]
            if target_idx < len(all_sentences) - 1
            else None
        )

        return ReviewContextResponse(
            previous_sentence=prev_sent,
            target_sentence=item.sentence_text,
            next_sentence=next_sent,
            source_title=bundle.metadata.get("filename", source_type),
            chapter_title=bundle.title,
        )

    except Exception as e:
        print(f"Error fetching context: {e}")
        # Graceful fallback
        return ReviewContextResponse(target_sentence=item.sentence_text)


@router.get("/queue", response_model=ReviewQueueResponse)
async def get_review_queue(
    user_id: str = "default_user", limit: int = 20, db: AsyncSession = Depends(get_db)
):
    """Get review items that are due for review (next_review_at <= now)."""
    now = datetime.utcnow()

    stmt = (
        select(ReviewItem)
        .where(ReviewItem.user_id == user_id)
        .where(ReviewItem.next_review_at <= now)
        .order_by(ReviewItem.next_review_at.asc())
        .limit(limit)
    )

    result = await db.execute(stmt)
    items = result.scalars().all()

    # Get total count of due items
    count_stmt = (
        select(func.count())
        .select_from(ReviewItem)
        .where(ReviewItem.user_id == user_id)
        .where(ReviewItem.next_review_at <= now)
    )
    count_result = await db.execute(count_stmt)
    total_count = count_result.scalar() or 0

    return ReviewQueueResponse(
        items=[
            ReviewQueueItem(
                id=item.id,
                source_id=item.source_id,
                sentence_index=item.sentence_index,
                sentence_text=item.sentence_text,
                highlighted_items=item.highlighted_items or [],
                difficulty_type=item.difficulty_type,
                interval_days=item.interval_days,
                repetition=item.repetition,
                next_review_at=item.next_review_at.isoformat(),
                created_at=item.created_at.isoformat(),
            )
            for item in items
        ],
        count=total_count,
    )


@router.get("/random", response_model=ReviewQueueResponse)
async def get_random_review(
    user_id: str = "default_user", limit: int = 20, db: AsyncSession = Depends(get_db)
):
    """Get random review items for extra practice (does not affect SM-2 schedule)."""
    # Use random ordering
    stmt = (
        select(ReviewItem)
        .where(ReviewItem.user_id == user_id)
        .order_by(func.random())
        .limit(limit)
    )

    result = await db.execute(stmt)
    items = result.scalars().all()

    return ReviewQueueResponse(
        items=[
            ReviewQueueItem(
                id=item.id,
                source_id=item.source_id,
                sentence_index=item.sentence_index,
                sentence_text=item.sentence_text,
                highlighted_items=item.highlighted_items or [],
                difficulty_type=item.difficulty_type,
                interval_days=item.interval_days,
                repetition=item.repetition,
                next_review_at=item.next_review_at.isoformat(),
                created_at=item.created_at.isoformat(),
            )
            for item in items
        ],
        count=len(items),
    )


@router.post("/complete", response_model=CompleteReviewResponse)
async def complete_review(
    req: CompleteReviewRequest, db: AsyncSession = Depends(get_db)
):
    """Complete a review and update SM-2 scheduling parameters."""
    # Validate quality: 1=forgot, 2=remembered after help, 3=remembered, 5=easy
    if req.quality not in (1, 2, 3, 5):
        raise HTTPException(status_code=400, detail="Quality must be 1, 2, 3, or 5")

    # Get the review item
    stmt = select(ReviewItem).where(ReviewItem.id == req.item_id)
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Review item not found")

    # Calculate new SM-2 parameters
    sm2_result = calculate_sm2(
        quality=req.quality,
        ef=item.easiness_factor,
        interval=item.interval_days,
        repetition=item.repetition,
    )

    # Create review log
    log = ReviewLog(
        review_item_id=item.id,
        quality=req.quality,
        interval_at_review=item.interval_days,
        duration_ms=req.duration_ms,
    )
    db.add(log)

    # Update review item
    now = datetime.utcnow()
    item.easiness_factor = sm2_result["new_ef"]
    item.interval_days = sm2_result["new_interval"]
    item.repetition = sm2_result["new_repetition"]
    item.last_reviewed_at = now
    item.next_review_at = now + timedelta(days=sm2_result["new_interval"])

    await db.commit()

    return CompleteReviewResponse(
        next_review_at=item.next_review_at.isoformat(),
        new_interval=item.interval_days,
        new_ef=item.easiness_factor,
        repetition=item.repetition,
    )


@router.post("/create", response_model=CreateReviewResponse)
async def create_review_item(
    req: CreateReviewRequest, db: AsyncSession = Depends(get_db)
):
    """Create a new review item (typically called when user studies a sentence)."""
    # Check if item already exists (prevent duplicates)
    stmt = (
        select(ReviewItem)
        .where(ReviewItem.user_id == req.user_id)
        .where(ReviewItem.source_id == req.source_id)
        .where(ReviewItem.sentence_index == req.sentence_index)
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        # Update highlighted items if new ones are provided
        if req.highlighted_items:
            current_items = set(existing.highlighted_items or [])
            current_items.update(req.highlighted_items)
            existing.highlighted_items = list(current_items)
            await db.commit()

        return CreateReviewResponse(
            id=existing.id, next_review_at=existing.next_review_at.isoformat()
        )

    # Create new review item
    now = datetime.utcnow()
    item = ReviewItem(
        user_id=req.user_id,
        source_id=req.source_id,
        sentence_index=req.sentence_index,
        sentence_text=req.sentence_text,
        highlighted_items=req.highlighted_items,
        difficulty_type=req.difficulty_type,
        easiness_factor=2.5,
        interval_days=1.0,
        repetition=0,
        next_review_at=now + timedelta(days=1),  # First review in 1 day
    )

    db.add(item)
    await db.commit()
    await db.refresh(item)

    return CreateReviewResponse(
        id=item.id, next_review_at=item.next_review_at.isoformat()
    )


@router.get("/memory-curve", response_model=MemoryCurveResponse)
async def get_memory_curve(
    user_id: str = "default_user", db: AsyncSession = Depends(get_db)
):
    """
    Get memory curve statistics comparing theoretical Ebbinghaus curve
    with user's actual retention rate at key time points.

    Delegates to shared function in app.database.performance.
    """
    from app.database import get_memory_curve_data

    data = await get_memory_curve_data(user_id)

    # Transform to response model format
    theoretical = [
        MemoryCurvePoint(
            days_since_first_review=point["day"],
            retention_rate=round(point["retention"] * 100, 1),
        )
        for point in data["ebbinghaus"]
    ]

    actual_points = [
        MemoryCurvePoint(
            days_since_first_review=point["day"],
            retention_rate=round(point["retention"] * 100, 1)
            if point["retention"] is not None
            else round(calculate_theoretical_retention(point["day"]) * 100, 1),
        )
        for point in data["actual"]
    ]

    return MemoryCurveResponse(
        theoretical=theoretical,
        actual=actual_points,
        total_reviews=data["total_reviews"],
        successful_reviews=data["successful_reviews"],
    )


@router.get("/stats")
async def get_review_stats(
    user_id: str = "default_user", db: AsyncSession = Depends(get_db)
):
    """Get overall review statistics for the user."""
    # Total items
    total_stmt = (
        select(func.count())
        .select_from(ReviewItem)
        .where(ReviewItem.user_id == user_id)
    )
    total_result = await db.execute(total_stmt)
    total_items = total_result.scalar() or 0

    # Due items
    now = datetime.utcnow()
    due_stmt = (
        select(func.count())
        .select_from(ReviewItem)
        .where(ReviewItem.user_id == user_id)
        .where(ReviewItem.next_review_at <= now)
    )
    due_result = await db.execute(due_stmt)
    due_items = due_result.scalar() or 0

    # Total reviews done
    reviews_stmt = (
        select(func.count())
        .select_from(ReviewLog)
        .join(ReviewItem)
        .where(ReviewItem.user_id == user_id)
    )
    reviews_result = await db.execute(reviews_stmt)
    total_reviews = reviews_result.scalar() or 0

    # Average EF
    avg_ef_stmt = select(func.avg(ReviewItem.easiness_factor)).where(
        ReviewItem.user_id == user_id
    )
    avg_ef_result = await db.execute(avg_ef_stmt)
    avg_ef = avg_ef_result.scalar() or 2.5

    return {
        "total_items": total_items,
        "due_items": due_items,
        "total_reviews": total_reviews,
        "average_easiness_factor": round(avg_ef, 2),
    }
