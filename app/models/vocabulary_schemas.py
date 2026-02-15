from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel


class VocabularyContext(BaseModel):
    source_type: str
    source_id: Optional[str] = None
    source_title: Optional[str] = None
    source_label: Optional[str] = None
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
