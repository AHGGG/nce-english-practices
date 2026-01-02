"""
Sentence Study API Router for Adaptive Sentence Learning (ASL) mode.
Endpoints for tracking study progress, recording learning results, and generating simplifications.
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, Integer, case
import hashlib

from app.core.db import get_db
from app.models.orm import SentenceLearningRecord
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
    initial_response: str  # clear, unclear
    unclear_choice: Optional[str] = None  # vocabulary, grammar, both
    simplified_response: Optional[str] = None  # got_it, still_unclear
    word_clicks: List[str] = []
    phrase_clicks: List[str] = []  # Collocation/phrase clicks
    dwell_time_ms: int = 0
    word_count: int = 0  # Number of words in the sentence


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
    record = SentenceLearningRecord(
        source_type=req.source_type,
        source_id=req.source_id,
        sentence_index=req.sentence_index,
        initial_response=req.initial_response,
        unclear_choice=req.unclear_choice,
        simplified_response=req.simplified_response,
        word_clicks=req.word_clicks,
        phrase_clicks=req.phrase_clicks,
        dwell_time_ms=req.dwell_time_ms,
        word_count=req.word_count
    )
    
    # Diagnose gap type based on responses
    if req.initial_response == "clear":
        if req.word_clicks:
            record.diagnosed_gap_type = "vocabulary"
            record.confidence = 0.7
        else:
            record.diagnosed_gap_type = None  # No gap
            record.confidence = 1.0
    elif req.unclear_choice == "vocabulary" and req.simplified_response == "got_it":
        record.diagnosed_gap_type = "vocabulary"
        record.confidence = 0.9
    elif req.unclear_choice == "grammar" and req.simplified_response == "got_it":
        record.diagnosed_gap_type = "structure"
        record.confidence = 0.9
    elif req.unclear_choice == "both":
        record.diagnosed_gap_type = "fundamental"
        record.confidence = 0.7
    elif req.unclear_choice and req.simplified_response == "still_unclear":
        # User still unclear after simplification - mixed problem
        record.diagnosed_gap_type = "mixed"
        record.confidence = 0.6
    
    db.add(record)
    await db.commit()
    await db.refresh(record)
    
    return {"status": "ok", "record_id": record.id}


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
