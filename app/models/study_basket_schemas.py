from datetime import datetime
from typing import List, Literal

from pydantic import BaseModel, Field


class StudyBasketLookupItem(BaseModel):
    key: str
    kind: Literal["word", "phrase"]
    text: str
    sentence: str = ""
    sentence_index: int = 0
    source_id: str
    count: int = 1


class StudyBasketSentenceItem(BaseModel):
    key: str
    sentence: str
    sentence_index: int
    source_id: str


class StudyBasketPayload(BaseModel):
    lookup_items: List[StudyBasketLookupItem] = Field(default_factory=list)
    bookmarked_sentences: List[StudyBasketSentenceItem] = Field(default_factory=list)


class StudyBasketResponse(StudyBasketPayload):
    source_type: Literal["podcast", "audiobook"]
    content_id: str
    updated_at: datetime | None = None
