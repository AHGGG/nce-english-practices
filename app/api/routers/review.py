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


# ============================================================
# SM-2 Algorithm Implementation
# ============================================================

def calculate_sm2(quality: int, ef: float, interval: float, repetition: int) -> Dict[str, Any]:
    """
    SM-2 algorithm implementation.
    
    Args:
        quality: Review quality (1=forgot, 3=remembered, 5=easy)
        ef: Current easiness factor
        interval: Current interval in days
        repetition: Number of consecutive successful reviews
    
    Returns:
        Dictionary with new_ef, new_interval, new_repetition
    """
    # Map our 3-option quality to SM-2 scale (0-5)
    # 1 (忘了) -> 1, 3 (想起来了) -> 3, 5 (太简单) -> 5
    
    # Calculate new EF (Easiness Factor)
    # EF' = EF + (0.1 - (5 - Q) * (0.08 + (5 - Q) * 0.02))
    new_ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    new_ef = max(1.3, new_ef)  # EF minimum is 1.3
    
    if quality < 3:  # Failed review
        new_repetition = 0
        new_interval = 1.0  # Reset to 1 day
    else:  # Successful review
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
        "new_repetition": new_repetition
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

@router.get("/queue", response_model=ReviewQueueResponse)
async def get_review_queue(
    user_id: str = "default_user",
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
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
                created_at=item.created_at.isoformat()
            )
            for item in items
        ],
        count=total_count
    )


@router.post("/complete", response_model=CompleteReviewResponse)
async def complete_review(
    req: CompleteReviewRequest,
    db: AsyncSession = Depends(get_db)
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
        repetition=item.repetition
    )
    
    # Create review log
    log = ReviewLog(
        review_item_id=item.id,
        quality=req.quality,
        interval_at_review=item.interval_days
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
        repetition=item.repetition
    )


@router.post("/create", response_model=CreateReviewResponse)
async def create_review_item(
    req: CreateReviewRequest,
    db: AsyncSession = Depends(get_db)
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
            id=existing.id,
            next_review_at=existing.next_review_at.isoformat()
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
        next_review_at=now + timedelta(days=1)  # First review in 1 day
    )
    
    db.add(item)
    await db.commit()
    await db.refresh(item)
    
    return CreateReviewResponse(
        id=item.id,
        next_review_at=item.next_review_at.isoformat()
    )


@router.get("/memory-curve", response_model=MemoryCurveResponse)
async def get_memory_curve(
    user_id: str = "default_user",
    db: AsyncSession = Depends(get_db)
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
            days_since_first_review=point['day'],
            retention_rate=round(point['retention'] * 100, 1)
        )
        for point in data['ebbinghaus']
    ]
    
    actual_points = [
        MemoryCurvePoint(
            days_since_first_review=point['day'],
            retention_rate=round(point['retention'] * 100, 1) if point['retention'] is not None else round(calculate_theoretical_retention(point['day']) * 100, 1)
        )
        for point in data['actual']
    ]
    
    return MemoryCurveResponse(
        theoretical=theoretical,
        actual=actual_points,
        total_reviews=data['total_reviews'],
        successful_reviews=data['successful_reviews']
    )


@router.get("/stats")
async def get_review_stats(
    user_id: str = "default_user",
    db: AsyncSession = Depends(get_db)
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
    avg_ef_stmt = (
        select(func.avg(ReviewItem.easiness_factor))
        .where(ReviewItem.user_id == user_id)
    )
    avg_ef_result = await db.execute(avg_ef_stmt)
    avg_ef = avg_ef_result.scalar() or 2.5
    
    return {
        "total_items": total_items,
        "due_items": due_items,
        "total_reviews": total_reviews,
        "average_easiness_factor": round(avg_ef, 2)
    }
