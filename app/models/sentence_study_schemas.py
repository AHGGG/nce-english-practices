"""
Pydantic schemas for Sentence Study API (ASL - Adaptive Sentence Learning).

Extracted from sentence_study.py router for better separation of concerns.
"""

from typing import Optional, List, Dict
from pydantic import BaseModel


# ============================================================
# Study Progress Models
# ============================================================


class StudyProgressResponse(BaseModel):
    source_id: str
    studied_count: int
    clear_count: int
    unclear_count: int
    current_index: int  # Next sentence to study (0-indexed)


class LastSessionResponse(BaseModel):
    source_id: str
    source_type: str
    last_studied_at: str  # ISO format string


class UnclearSentenceInfo(BaseModel):
    """Info about an unclear sentence for highlighting."""

    sentence_index: int
    unclear_choice: Optional[str] = (
        None  # vocabulary (words), grammar (structure), meaning (context), both (everything)
    )
    max_simplify_stage: int = 0  # Highest stage reached (1-3)


class StudyHighlightsResponse(BaseModel):
    """All words/phrases looked up during study of an article."""

    source_id: str
    word_clicks: List[str]  # All unique words clicked across all sentences
    phrase_clicks: List[str]  # All unique phrases clicked across all sentences
    unclear_sentences: List[UnclearSentenceInfo] = []  # Sentences marked unclear
    studied_count: int  # Number of sentences studied
    clear_count: int  # Number of sentences marked clear
    is_complete: bool  # True if all sentences have been studied


# ============================================================
# Record Learning Models
# ============================================================


class RecordRequest(BaseModel):
    source_type: str
    source_id: str
    sentence_index: int
    sentence_text: Optional[str] = None  # Store for review display
    initial_response: str  # clear, unclear
    unclear_choice: Optional[str] = (
        None  # vocabulary (words), grammar (structure), meaning (context), both (everything)
    )
    simplified_response: Optional[str] = None  # got_it, still_unclear
    word_clicks: List[str] = []
    phrase_clicks: List[str] = []  # Collocation/phrase clicks
    dwell_time_ms: int = 0
    word_count: int = 0  # Number of words in the sentence
    max_simplify_stage: Optional[int] = None  # 1=English, 2=Detailed, 3=Chinese
    user_id: str = "default_user"  # Added field

    # Detailed interaction log (e.g. sequence of "lookup_word", "req_simple_english")
    # Format: [{"action": "lookup", "target": "foo", "timestamp": 123}, ...]
    interaction_events: List[Dict] = []


# ============================================================
# Simplification Models
# ============================================================


class SimplifyRequest(BaseModel):
    sentence: str
    simplify_type: str  # vocabulary (words), grammar (structure), meaning (context), both (everything)
    stage: int = 1  # 1=English, 2=Detailed English with examples, 3=Chinese deep dive
    # Optional context for "both" mode
    prev_sentence: Optional[str] = None
    next_sentence: Optional[str] = None


class SimplifyResponse(BaseModel):
    original: str
    simplified: str
    simplify_type: str
    stage: int
    has_next_stage: bool  # True if stage < 3


# ============================================================
# Overview Models
# ============================================================


class OverviewRequest(BaseModel):
    """Request to generate article overview with context."""

    title: str
    full_text: str  # First ~500 words for context
    total_sentences: int


class OverviewResponse(BaseModel):
    """Article overview with English summary and Chinese translation."""

    summary_en: str  # 2-3 sentence English summary
    summary_zh: str  # Chinese translation
    key_topics: List[str]  # 3-5 key topics/themes
    difficulty_hint: str  # e.g. "Advanced vocabulary, complex sentences"


# ============================================================
# Word Explanation Models
# ============================================================


class ExplainWordRequest(BaseModel):
    """Request to explain a word or phrase in its sentence context via streaming LLM."""

    word: Optional[str] = None  # Deprecated, use 'text' instead
    text: Optional[str] = None  # The word or phrase to explain
    sentence: str
    prev_sentence: Optional[str] = None
    next_sentence: Optional[str] = None
    style: str = "default"  # default, simple, chinese_deep


# ============================================================
# Collocation Detection Models
# ============================================================


class DetectCollocationsRequest(BaseModel):
    """Request to detect collocations/phrases in a sentence."""

    sentence: str


class CollocationItem(BaseModel):
    """A detected collocation/phrase."""

    text: str  # The collocation text, e.g. "sit down"
    key_word: Optional[str] = (
        None  # The key word of the phrase for dictionary lookup, e.g. "sit"
    )
    start_word_idx: int  # Start word index (0-based)
    end_word_idx: int  # End word index (inclusive)


class DetectCollocationsResponse(BaseModel):
    """Response with detected collocations."""

    collocations: List[CollocationItem]


class PrefetchCollocationsRequest(BaseModel):
    """Request to prefetch collocations for upcoming sentences."""

    sentences: List[str]  # Up to 5 sentences to prefetch


# ============================================================
# SRS Review Models
# ============================================================


class ReviewQueueItem(BaseModel):
    """Item in the review queue."""

    record_id: int
    source_type: str
    source_id: str
    sentence_index: int
    sentence_text: Optional[str]  # The actual sentence for display
    diagnosed_gap_type: Optional[str]
    scheduled_review: str  # ISO format
    review_count: int


class ReviewRequest(BaseModel):
    """Request to complete a review."""

    record_id: int
    result: str  # "clear" or "unclear"


# ============================================================
# User Profile Models
# ============================================================


class WordToReview(BaseModel):
    """A word that needs practice."""

    word: str
    difficulty_score: float
    exposure_count: int


class ProfileResponse(BaseModel):
    """User comprehension profile stats."""

    user_id: str
    # Study Stats
    total_sentences_studied: int
    clear_count: int
    unclear_count: int
    clear_rate: float  # 0-1
    # Gap Breakdown
    vocab_gap_count: int
    grammar_gap_count: int
    meaning_gap_count: int
    collocation_gap_count: int
    # Words needing practice (from WordProficiency)
    words_to_review: List[WordToReview]
    # Learning Insights (translated patterns)
    insights: List[str]
    # Next action recommendation
    recommendation: Optional[str] = None
