from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ReviewQueueItem(BaseModel):
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
    items: List[ReviewQueueItem]
    count: int


class CompleteReviewRequest(BaseModel):
    item_id: int
    quality: int
    duration_ms: int = 0


class CompleteReviewResponse(BaseModel):
    next_review_at: str
    new_interval: float
    new_ef: float
    repetition: int


class CreateReviewRequest(BaseModel):
    source_id: str
    sentence_index: int
    sentence_text: str
    highlighted_items: List[str] = []
    difficulty_type: str = "vocabulary"


class CreateReviewResponse(BaseModel):
    id: int
    next_review_at: str


class MemoryCurvePoint(BaseModel):
    days_since_first_review: int
    retention_rate: float


class MemoryCurveResponse(BaseModel):
    theoretical: List[MemoryCurvePoint]
    actual: List[MemoryCurvePoint]
    total_reviews: int
    successful_reviews: int


class ReviewContextResponse(BaseModel):
    previous_sentence: Optional[str] = None
    target_sentence: str
    next_sentence: Optional[str] = None
    source_title: Optional[str] = None
    chapter_title: Optional[str] = None


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


class MemoryCurveDebugBucket(BaseModel):
    day: int
    interval_range: str
    sample_size: int
    success_count: int
    retention_rate: Optional[float]


class MemoryCurveDebugLog(BaseModel):
    id: int
    review_item_id: int
    interval_at_review: float
    quality: int
    reviewed_at: str
    duration_ms: int
    sentence_preview: Optional[str] = None


class MemoryCurveDebugResponse(BaseModel):
    total_logs: int
    interval_distribution: Dict[str, int]
    buckets: List[MemoryCurveDebugBucket]
    recent_logs: List[MemoryCurveDebugLog]
    summary: Dict[str, Any]
