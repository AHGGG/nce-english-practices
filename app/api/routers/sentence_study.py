"""
Sentence Study API Router for Adaptive Sentence Learning (ASL) mode.
Endpoints for tracking study progress, recording learning results, and generating simplifications.
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, Integer, case
import hashlib
from datetime import datetime, timedelta

from app.core.db import get_db
from app.models.orm import SentenceLearningRecord, UserComprehensionProfile, WordProficiency
from app.services.llm import llm_service

router = APIRouter(prefix="/api/sentence-study", tags=["sentence-study"])

# In-memory cache for article overviews (key: title_hash, value: OverviewResponse dict)
_overview_cache: Dict[str, dict] = {}


# ============================================================
# Request/Response Models
# ============================================================

class StudyProgressResponse(BaseModel):
    source_id: str
    studied_count: int
    clear_count: int
    unclear_count: int
    current_index: int  # Next sentence to study (0-indexed)


class RecordRequest(BaseModel):
    source_type: str
    source_id: str
    sentence_index: int
    sentence_text: Optional[str] = None  # Store for review display
    initial_response: str  # clear, unclear
    unclear_choice: Optional[str] = None  # vocabulary, grammar, both
    simplified_response: Optional[str] = None  # got_it, still_unclear
    word_clicks: List[str] = []
    phrase_clicks: List[str] = []  # Collocation/phrase clicks
    dwell_time_ms: int = 0
    word_count: int = 0  # Number of words in the sentence
    user_id: str = "default_user"  # Added field
    
    # Detailed interaction log (e.g. sequence of "lookup_word", "req_simple_english")
    # Format: [{"action": "lookup", "target": "foo", "timestamp": 123}, ...]
    interaction_events: List[Dict] = []


class SimplifyRequest(BaseModel):
    sentence: str
    simplify_type: str  # vocabulary, grammar, both
    # Optional context for "both" mode
    prev_sentence: Optional[str] = None
    next_sentence: Optional[str] = None


class SimplifyResponse(BaseModel):
    original: str
    simplified: str
    simplify_type: str


class OverviewRequest(BaseModel):
    """Request to generate article overview with context."""
    title: str
    full_text: str  # First ~500 words for context
    total_sentences: int


class OverviewResponse(BaseModel):
    """Article overview with English summary and Chinese translation."""
    summary_en: str      # 2-3 sentence English summary
    summary_zh: str      # Chinese translation
    key_topics: List[str]  # 3-5 key topics/themes
    difficulty_hint: str   # e.g. "Advanced vocabulary, complex sentences"


class ExplainWordRequest(BaseModel):
    """Request to explain a word or phrase in its sentence context via streaming LLM."""
    word: Optional[str] = None  # Deprecated, use 'text' instead
    text: Optional[str] = None  # The word or phrase to explain
    sentence: str
    prev_sentence: Optional[str] = None
    next_sentence: Optional[str] = None
    style: str = "default"  # default, simple, chinese_deep

class LastSessionResponse(BaseModel):
    source_id: str
    source_type: str
    last_studied_at: str  # ISO format string


# ============================================================
# Endpoints
# ============================================================

@router.get("/last-session", response_model=Optional[LastSessionResponse])
async def get_last_session(db: AsyncSession = Depends(get_db)):
    """Get the user's last studied article/session."""
    # Find the most recent learning record
    result = await db.execute(
        select(SentenceLearningRecord)
        .order_by(SentenceLearningRecord.created_at.desc())
        .limit(1)
    )
    record = result.scalar_one_or_none()
    
    if not record:
        return None
        
    return LastSessionResponse(
        source_id=record.source_id,
        source_type=record.source_type,
        last_studied_at=record.created_at.isoformat()
    )

@router.get("/{source_id:path}/progress", response_model=StudyProgressResponse)
async def get_study_progress(
    source_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get study progress for an article."""
    # Count studied sentences and clear count
    result = await db.execute(
        select(
            func.count(SentenceLearningRecord.id).label("total"),
            func.sum(
                case(
                    (SentenceLearningRecord.initial_response == "clear", 1),
                    else_=0
                )
            ).label("clear_count")
        ).where(SentenceLearningRecord.source_id == source_id)
    )
    row = result.first()
    
    studied = row.total if row and row.total else 0
    clear = int(row.clear_count) if row and row.clear_count else 0
    
    # Get last studied index to determine current position
    last_result = await db.execute(
        select(SentenceLearningRecord.sentence_index)
        .where(SentenceLearningRecord.source_id == source_id)
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
        current_index=current_index
    )


@router.post("/record")
async def record_learning(
    req: RecordRequest,
    db: AsyncSession = Depends(get_db)
):
    """Record a sentence learning result."""
    
    # Deduplicate clicks while preserving order
    unique_word_clicks = list(dict.fromkeys(req.word_clicks))
    unique_phrase_clicks = list(dict.fromkeys(req.phrase_clicks))

    record = SentenceLearningRecord(
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
        interaction_log=req.interaction_events or []
    )
    
    # ============================================================
    # Deep Diagnosis & Profile Update
    # ============================================================
    
    # Use the new comprehensive diagnosis engine
    alias_word_clicks = list(dict.fromkeys(req.word_clicks))
    alias_phrase_clicks = list(dict.fromkeys(req.phrase_clicks))

    diagnosis_result = await _perform_deep_diagnosis(
        db=db,
        user_id=req.user_id,
        initial=req.initial_response,
        choice=req.unclear_choice,
        simplified=req.simplified_response,
        word_clicks=alias_word_clicks,
        phrase_clicks=alias_phrase_clicks,
        interactions=req.interaction_events or [],
        dwell_ms=req.dwell_time_ms,
        word_count=req.word_count
    )

    record.diagnosed_gap_type = diagnosis_result["gap_type"]
    record.diagnosed_patterns = diagnosis_result["patterns"]
    record.confidence = diagnosis_result["confidence"]
    
    # --- SRS Scheduling ---
    # Set scheduled_review for sentences with gaps
    if diagnosis_result["gap_type"] is not None:
        record.scheduled_review = datetime.utcnow() + _calculate_review_interval(0)  # First review
        record.review_count = 0

    db.add(record)
    
    # --- Update UserComprehensionProfile (Deep Integration) ---
    await _update_user_profile_deep(
        db, 
        req.user_id, 
        diagnosis_result, 
        alias_word_clicks
    )

    await db.commit()
    await db.refresh(record)
    
    return {
        "status": "ok", 
        "record_id": record.id, 
        "diagnosed_gap": diagnosis_result["gap_type"],
        "confidence": diagnosis_result["confidence"],
        "patterns": diagnosis_result["patterns"]
    }


@router.post("/simplify", response_model=SimplifyResponse)
async def simplify_sentence(req: SimplifyRequest):
    """Generate simplified version of a sentence using LLM."""
    if req.simplify_type == "vocabulary":
        prompt = f"""Rewrite this sentence using simpler vocabulary (COCA 0-3000 most common words), 
but keep the exact grammatical structure unchanged:
"{req.sentence}"

Return ONLY the simplified sentence, no explanation."""
    
    elif req.simplify_type == "grammar":
        prompt = f"""Break this sentence into 2-3 shorter, simpler sentences 
while keeping the same vocabulary words:
"{req.sentence}"

Return ONLY the simplified sentences, no explanation."""
    
    else:  # "both" - full context mode
        context_parts = []
        if req.prev_sentence:
            context_parts.append(f'Previous: "{req.prev_sentence}"')
        context_parts.append(f'Current: "{req.sentence}"')
        if req.next_sentence:
            context_parts.append(f'Next: "{req.next_sentence}"')
        context = "\n".join(context_parts)
        
        prompt = f"""Explain this sentence in the simplest possible English (A1 level).
Consider the context:

{context}

Return ONLY a simple explanation of the CURRENT sentence, no extra text."""
    
    try:
        response = await llm_service.async_client.chat.completions.create(
            model=llm_service.model_name,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.3
        )
        simplified = response.choices[0].message.content.strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM error: {str(e)}")
    
    return SimplifyResponse(
        original=req.sentence,
        simplified=simplified,
        simplify_type=req.simplify_type
    )


@router.post("/overview")
async def generate_overview(req: OverviewRequest):
    """
    Generate article overview with English summary and Chinese translation.
    First request streams via SSE, subsequent requests return cached JSON.
    
    SSE format:
    - data: {"type": "chunk", "content": "..."} - streaming content
    - data: {"type": "done", "overview": {...}} - final result with full overview
    - data: {"type": "cached", "overview": {...}} - cache hit
    """
    import json
    
    # Generate cache key from title
    cache_key = hashlib.md5(req.title.encode()).hexdigest()
    
    # Check cache first - return JSON directly for cache hits
    if cache_key in _overview_cache:
        cached = _overview_cache[cache_key]
        return OverviewResponse(**cached)
    
    # Truncate to first ~500 words for efficiency
    words = req.full_text.split()
    text_excerpt = " ".join(words[:500]) + ("..." if len(words) > 500 else "")
    
    prompt = f"""Analyze this article and provide a brief overview to help a learner understand the context before studying it sentence by sentence.

Article Title: {req.title}
Total Sentences: {req.total_sentences}

Article Excerpt:
{text_excerpt}

Respond in this exact JSON format:
{{
  "summary_en": "2-3 sentence summary of what this article is about",
  "summary_zh": "中文翻译：2-3句话概括文章内容",
  "key_topics": ["topic1", "topic2", "topic3"],
  "difficulty_hint": "Brief note about vocabulary/grammar complexity"
}}

Return ONLY the JSON, no markdown formatting."""

    async def generate():
        full_content = ""
        try:
            stream = await llm_service.async_client.chat.completions.create(
                model=llm_service.model_name,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
                temperature=0.3,
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    text = chunk.choices[0].delta.content
                    full_content += text
                    yield f"data: {json.dumps({'type': 'chunk', 'content': text})}\n\n"
            
            # Parse the accumulated content
            content = full_content.strip()
            if content.startswith("```"):
                content = content.split("\n", 1)[1].rsplit("```", 1)[0]
            
            try:
                data = json.loads(content)
                result = {
                    "summary_en": data.get("summary_en", "Unable to generate summary."),
                    "summary_zh": data.get("summary_zh", "无法生成摘要。"),
                    "key_topics": data.get("key_topics", []),
                    "difficulty_hint": data.get("difficulty_hint", "")
                }
            except json.JSONDecodeError:
                result = {
                    "summary_en": "This article covers various topics. Study the sentences to learn more.",
                    "summary_zh": "本文涵盖多个主题。通过逐句学习了解更多。",
                    "key_topics": [],
                    "difficulty_hint": "Unable to analyze difficulty."
                }
            
            # Cache the result
            _overview_cache[cache_key] = result
            
            yield f"data: {json.dumps({'type': 'done', 'overview': result})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.post("/explain-word")
async def explain_word_in_context(req: ExplainWordRequest):
    """
    Stream LLM explanation of a word in its sentence context.
    Returns Server-Sent Events with text chunks.
    """
    # Build context with surrounding sentences
    context_parts = []
    if req.prev_sentence:
        context_parts.append(f'Previous: "{req.prev_sentence}"')
    context_parts.append(f'Current: "{req.sentence}"')
    if req.next_sentence:
        context_parts.append(f'Next: "{req.next_sentence}"')
    context = "\n".join(context_parts)
    
    # Support both 'text' (new) and 'word' (deprecated) fields
    text_to_explain = req.text or req.word
    if not text_to_explain:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Either 'text' or 'word' must be provided")
    
    # Detect if it's a phrase (multiple words) to adjust the prompt
    is_phrase = ' ' in text_to_explain.strip()
    
    if req.style == "simple":
        prompt = f"""Explain the {"phrase" if is_phrase else "word"} "{text_to_explain}" in the context of the sentence below.
Explanation must be in SIMPLE ENGLISH, suitable for a beginner learner.
Use simple vocabulary and short sentences.

Context:
{context}

Target: "{text_to_explain}"

Give only the explanation, no preamble."""

    elif req.style == "chinese_deep":
        prompt = f"""请详细讲解句子中“{text_to_explain}”这个{"短语" if is_phrase else "单词"}的含义和用法。
结合以下上下文进行全方位的中文讲解：

上下文：
{context}

讲解要求：
1. 解释在当前语境下的确切含义
2. 分析语法结构或搭配用法
3. 如果有引申义或特殊语气，请指出
4. 使用中文回答，讲解要深入浅出

目标词汇："{text_to_explain}"

直接给出讲解内容，不要有多余的开场白。"""

    else:  # default
        if is_phrase:
            prompt = f"""Explain the phrase/expression "{text_to_explain}" as it is used in the following sentence context.
The explanation should be in English, clear and concise (2-3 sentences max).
Focus on what this phrase/collocation means IN THIS SPECIFIC CONTEXT.
If it's an idiomatic expression or common collocation, briefly mention that.

Context:
{context}

The phrase to explain: "{text_to_explain}"

Give only the explanation, no preamble or labels."""
        else:
            prompt = f"""Explain the word "{text_to_explain}" as it is used in the following sentence context. 
The explanation should be in English, clear and concise (2-3 sentences max).
Focus on what the word means IN THIS SPECIFIC CONTEXT, not a general dictionary definition.

Context:
{context}

The word to explain: "{text_to_explain}"

Give only the explanation, no preamble or labels."""

    async def generate():
        try:
            stream = await llm_service.async_client.chat.completions.create(
                model=llm_service.model_name,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1000,
                temperature=0.3,
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    text = chunk.choices[0].delta.content
                    yield f"data: {text}\n\n"
            
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


# ============================================================
# Collocation Detection
# ============================================================

class DetectCollocationsRequest(BaseModel):
    """Request to detect collocations/phrases in a sentence."""
    sentence: str


class CollocationItem(BaseModel):
    """A detected collocation/phrase."""
    text: str  # The collocation text, e.g. "sit down"
    start_word_idx: int  # Start word index (0-based)
    end_word_idx: int  # End word index (inclusive)


class DetectCollocationsResponse(BaseModel):
    """Response with detected collocations."""
    collocations: List[CollocationItem]


# Simple cache for collocation detection (sentence hash -> collocations)
_collocation_cache: Dict[str, List[dict]] = {}


@router.post("/detect-collocations", response_model=DetectCollocationsResponse)
async def detect_collocations(req: DetectCollocationsRequest):
    """
    Detect common collocations/phrases in a sentence using LLM.
    Results are cached for efficiency.
    """
    import json
    
    # Check cache
    cache_key = hashlib.md5(req.sentence.encode()).hexdigest()
    if cache_key in _collocation_cache:
        return DetectCollocationsResponse(collocations=_collocation_cache[cache_key])
    
    # Tokenize sentence to get word list with indices
    words = req.sentence.split()
    
    prompt = f"""Analyze this sentence and identify ALL common English collocations, phrasal verbs, and fixed expressions.

Sentence: "{req.sentence}"

Word list with indices:
{chr(10).join([f'{i}: {w}' for i, w in enumerate(words)])}

Return a JSON array of detected collocations. For each, provide:
- "text": the exact collocation text
- "start_word_idx": starting word index
- "end_word_idx": ending word index (inclusive)

Examples of collocations to detect:
- Phrasal verbs: "sit down", "give up", "look forward to"
- Fixed expressions: "in terms of", "as a result", "take advantage of"
- Common combinations: "make a decision", "pay attention", "climate change"

Return ONLY the JSON array, no explanation. If no collocations found, return [].
Example output: [{{"text": "sit down", "start_word_idx": 2, "end_word_idx": 3}}]"""

    try:
        response = await llm_service.async_client.chat.completions.create(
            model=llm_service.model_name,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.1  # Low temp for consistent detection
        )
        content = response.choices[0].message.content.strip()
        
        # Parse JSON response
        if content.startswith("```"):
            content = content.split("\n", 1)[1].rsplit("```", 1)[0]
        
        collocations = json.loads(content)
        
        # Validate and clean up results
        valid_collocations = []
        for c in collocations:
            if all(k in c for k in ["text", "start_word_idx", "end_word_idx"]):
                valid_collocations.append(CollocationItem(**c))
        
        # Cache results
        _collocation_cache[cache_key] = [c.model_dump() for c in valid_collocations]
        
        return DetectCollocationsResponse(collocations=valid_collocations)
        
    except Exception as e:
        # On error, return empty list (graceful degradation)
        return DetectCollocationsResponse(collocations=[])

# ============================================================
# SRS (Spaced Repetition) Scheduling
# ============================================================

def _calculate_review_interval(review_count: int, gap_type: str = None) -> timedelta:
    """
    Smart SRS interval based on review count and gap type.
    Collocations are harder to remember, use shorter intervals.
    """
    base_intervals = [1, 3, 7, 14, 30]  # days
    
    # Collocation gaps get shorter intervals (harder to retain)
    if gap_type and 'collocation' in gap_type:
        base_intervals = [1, 2, 4, 7, 14]  
    
    idx = min(review_count, len(base_intervals) - 1)
    return timedelta(days=base_intervals[idx])


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
    collocation_gap_count: int
    # Words needing practice (from WordProficiency)
    words_to_review: List[WordToReview]
    # Learning Insights (translated patterns)
    insights: List[str]
    # Next action recommendation
    recommendation: Optional[str] = None


@router.get("/queue", response_model=List[ReviewQueueItem])
async def get_review_queue(
    user_id: str = "default_user",
    db: AsyncSession = Depends(get_db)
):
    """Get sentences due for review (scheduled_review <= now)."""
    now = datetime.utcnow()
    result = await db.execute(
        select(SentenceLearningRecord)
        .where(
            SentenceLearningRecord.user_id == user_id,
            SentenceLearningRecord.scheduled_review <= now,
            SentenceLearningRecord.diagnosed_gap_type.isnot(None)
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
            scheduled_review=r.scheduled_review.isoformat() if r.scheduled_review else "",
            review_count=r.review_count or 0
        )
        for r in records
    ]


@router.post("/review")
async def complete_review(
    req: ReviewRequest,
    db: AsyncSession = Depends(get_db)
):
    """Complete a review and reschedule the sentence."""
    result = await db.execute(
        select(SentenceLearningRecord).where(SentenceLearningRecord.id == req.record_id)
    )
    record = result.scalar_one_or_none()
    
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    if req.result == "clear":
        # User understood -> schedule further out
        record.review_count = (record.review_count or 0) + 1
        record.scheduled_review = datetime.utcnow() + _calculate_review_interval(
            record.review_count, record.diagnosed_gap_type
        )
    else:
        # User still unclear -> reset to short interval (keep gap type for next calculation)
        record.scheduled_review = datetime.utcnow() + _calculate_review_interval(0, record.diagnosed_gap_type)
        # Don't reset review_count to preserve history
    
    await db.commit()
    
    return {
        "status": "ok",
        "next_review": record.scheduled_review.isoformat(),
        "review_count": record.review_count
    }


@router.get("/profile", response_model=ProfileResponse)
async def get_user_profile(
    user_id: str = "default_user",
    db: AsyncSession = Depends(get_db)
):
    """Get user comprehension profile with actionable stats."""
    
    # 1. Get study stats from SentenceLearningRecord
    stats_result = await db.execute(
        select(
            func.count(SentenceLearningRecord.id).label("total"),
            func.sum(case((SentenceLearningRecord.initial_response == "clear", 1), else_=0)).label("clear"),
            func.sum(case((SentenceLearningRecord.diagnosed_gap_type == "vocabulary", 1), else_=0)).label("vocab"),
            func.sum(case((SentenceLearningRecord.diagnosed_gap_type == "structure", 1), else_=0)).label("grammar"),
            func.sum(case((SentenceLearningRecord.diagnosed_gap_type == "collocation", 1), else_=0)).label("collocation"),
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
            WordProficiency.user_id == user_id,
            WordProficiency.difficulty_score > 0.3
        )
        .order_by(WordProficiency.difficulty_score.desc())
        .limit(15)
    )
    difficult_words = words_result.scalars().all()
    
    # 3. Generate insights from patterns
    profile_result = await db.execute(
        select(UserComprehensionProfile).where(UserComprehensionProfile.user_id == user_id)
    )
    profile = profile_result.scalar_one_or_none()
    
    insights = []
    if profile and profile.common_grammar_gaps:
        pattern_translations = {
            'slow_reading': '阅读速度较慢，建议多练习限时阅读',
            'phrase_lookup': '固定搭配是弱项，建议专项练习 collocations',
            'multi_word_query': '多词表达查询频繁，注意积累短语',
            'deep_dive_needed': '需要深入解释才能理解，语境理解能力待提升',
            'long_sentence_struggle': '长句理解困难，建议练习句子结构拆解',
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
        collocation_gap_count=stats.collocation or 0,
        words_to_review=[
            WordToReview(word=w.word, difficulty_score=round(w.difficulty_score, 2), exposure_count=w.exposure_count)
            for w in difficult_words
        ],
        insights=insights,
        recommendation=recommendation
    )


# ============================================================
# Diagnosis Utilities
# ============================================================

async def _analyze_user_history(db: AsyncSession, user_id: str = "default_user") -> Dict[str, str]:
    """
    Analyze recent user history to find patterns in learning gaps.
    Returns a dict with 'common_gap': 'vocabulary' | 'structure' | 'mixed' | None
    """
    try:
        # Get last 20 records where user had trouble
        result = await db.execute(
            select(SentenceLearningRecord)
            .where(
                SentenceLearningRecord.user_id == user_id,
                SentenceLearningRecord.initial_response == "unclear"
            )
            .order_by(SentenceLearningRecord.created_at.desc())
            .limit(20)
        )
        records = result.scalars().all()
        
        if not records:
            return {"common_gap": None}
            
        vocab_count = 0
        structure_count = 0
        
        for r in records:
            if r.diagnosed_gap_type == "vocabulary":
                vocab_count += 1
            elif r.diagnosed_gap_type == "structure":
                structure_count += 1
                
        total = len(records)
        if vocab_count / total > 0.6:
            return {"common_gap": "vocabulary"}
        elif structure_count / total > 0.4:
            return {"common_gap": "structure"}
            
        # Optimization: Check for length correlation
        long_sentence_fail_count = 0
        for r in records:
             if r.word_count > 20:
                 long_sentence_fail_count += 1
        
        if long_sentence_fail_count / total > 0.5:
             # User consistently fails long sentences -> likely a parsing/structure endurance issue
             return {"common_gap": "structure"} # Bias towards structure for long sentences

        return {"common_gap": "mixed"}
        
    except Exception:
        return {"common_gap": None}


# ============================================================
# Deep Diagnosis Engine
# ============================================================

async def _perform_deep_diagnosis(
    db: AsyncSession,
    user_id: str,
    initial: str,
    choice: Optional[str],
    simplified: Optional[str],
    word_clicks: List[str],
    phrase_clicks: List[str],
    interactions: List[Dict],
    dwell_ms: int,
    word_count: int
) -> Dict[str, Any]:
    """
    Comprehensive diagnosis logic combining explicit choices, implicit behaviors,
    reading speed, history, and interaction patterns.
    """
    gap_type = None
    confidence = 0.0
    patterns = []
    
    # --- 1. Base Diagnosis (Explicit Choice) ---
    if initial == "clear":
        gap_type = None
        confidence = 1.0 # Tentative, reviewed below
    elif choice == "vocabulary":
        gap_type = "vocabulary"
        confidence = 0.9 if simplified == "got_it" else 0.7
    elif choice == "grammar":
        gap_type = "structure"
        confidence = 0.9 if simplified == "got_it" else 0.7
    elif choice == "collocation":
        gap_type = "collocation"
        confidence = 0.9
    elif choice == "both":
        gap_type = "fundamental"
        confidence = 0.7
        
    # --- 2. Implicit Signals Overrides ---
    
    # A. Phrase Clicks -> Strong Collocation Signal
    # If user clicked on phrases, they're struggling with collocations regardless of initial choice
    if phrase_clicks:
        gap_type = "collocation"
        confidence = 0.85
        patterns.append("phrase_lookup")

    # B. Multi-word Lookups -> Collocation Signal
    for event in interactions:
        target = event.get("text") or event.get("word")
        if target and isinstance(target, str) and " " in target.strip():
            if gap_type != "collocation":
                gap_type = "collocation"
                confidence = 0.8
                patterns.append("multi_word_query")
            break

    # C. Speed Analysis (The "False Clear" Detector)
    if word_count > 0:
        ms_per_word = dwell_ms / word_count
        if ms_per_word > 800 and initial == "clear": 
            confidence = 0.6
            patterns.append("slow_reading")
            
    # D. Interaction Depth (The "Confusion" Detector)
    deep_dive_count = sum(1 for e in interactions if e.get("style") in ["chinese_deep", "simple"])
    if deep_dive_count > 0:
        if gap_type is None:
            gap_type = "vocabulary"
            confidence = 0.6
            patterns.append("deep_dive_needed")
        elif gap_type == "vocabulary":
            patterns.append("nuance_confusion")

    # --- 3. Historical & Structural Analysis ---
    if gap_type == "fundamental" or choice == "both":
        history = await _analyze_user_history(db, user_id)
        if history["common_gap"]:
            patterns.append(f"history_{history['common_gap']}")
            if history["common_gap"] == "vocabulary":
                gap_type = "fundamental (vocab-heavy)"
            elif history["common_gap"] == "structure":
                gap_type = "fundamental (structure-heavy)"

    # --- 4. Length Bias (Structure Endurance) ---
    if word_count > 25 and gap_type in ["fundamental", "fundamental (structure-heavy)"]:
        patterns.append("long_sentence_struggle")
        gap_type = "structure"
        confidence = 0.8

    return {
        "gap_type": gap_type,
        "confidence": confidence,
        "patterns": patterns
    }


async def _update_user_profile_deep(
    db: AsyncSession, 
    user_id: str, 
    diagnosis: Dict[str, Any], 
    word_clicks: List[str]
):
    """
    Updates profile with granular insights from the deep diagnosis.
    """
    profile_result = await db.execute(select(UserComprehensionProfile).where(UserComprehensionProfile.user_id == user_id))
    profile = profile_result.scalar_one_or_none()
    
    if not profile:
        profile = UserComprehensionProfile(user_id=user_id)
        db.add(profile)
        
    gap = diagnosis["gap_type"]
    patterns = diagnosis["patterns"]
    
    # 1. Update Scores (handle None values)
    if gap == "vocabulary" or gap == "collocation":
        current_vocab = float(profile.vocabulary_score or 0.0)
        profile.vocabulary_score = max(0.0, current_vocab - 0.1)
    elif gap == "structure":
        current_grammar = float(profile.grammar_score or 0.0)
        profile.grammar_score = max(0.0, current_grammar - 0.1)
    elif gap is None:
        current_overall = float(profile.overall_score or 0.0)
        profile.overall_score = current_overall + 0.01

    # 2. Update Weak Topics (Vocabulary / Collocations)
    if word_clicks:
        current_weak_topics = list(profile.weak_vocabulary_topics) if profile.weak_vocabulary_topics else []
        for word in word_clicks:
            if word not in current_weak_topics:
                current_weak_topics.append(word)
        profile.weak_vocabulary_topics = current_weak_topics[-50:]
        
        # Word Proficiency Logic
        for word in word_clicks:
            wp_result = await db.execute(select(WordProficiency).where(WordProficiency.user_id == user_id, WordProficiency.word == word))
            wp = wp_result.scalar_one_or_none()
            if wp:
                wp.exposure_count += 1
                wp.huh_count += 1
                wp.last_seen_at = func.now()
                wp.difficulty_score = float(wp.huh_count) / max(1, wp.exposure_count)
                if wp.difficulty_score > 0.3: 
                    wp.status = "learning"
            else:
                db.add(WordProficiency(user_id=user_id, word=word, exposure_count=1, huh_count=1, difficulty_score=1.0, status="new"))

    # 3. Update Common Gaps (Grammar/Patterns)
    if patterns:
        current_gaps = list(profile.common_grammar_gaps) if profile.common_grammar_gaps else []
        for p in patterns:
            current_gaps.append(p)
        profile.common_grammar_gaps = current_gaps[-20:]
