"""
Sentence Study API Router for Adaptive Sentence Learning (ASL) mode.
Endpoints for tracking study progress, recording learning results, and generating simplifications.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, Integer, case

from app.core.db import get_db
from app.models.orm import SentenceLearningRecord
from app.services.llm import llm_service

router = APIRouter(prefix="/api/sentence-study", tags=["sentence-study"])


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
    dwell_time_ms: int = 0


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

# ============================================================
# Endpoints
# ============================================================

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
        dwell_time_ms=req.dwell_time_ms
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


@router.post("/overview", response_model=OverviewResponse)
async def generate_overview(req: OverviewRequest):
    """
    Generate article overview with English summary and Chinese translation.
    Called before sentence-by-sentence study begins to provide context.
    """
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

    try:
        response = await llm_service.async_client.chat.completions.create(
            model=llm_service.model_name,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.3
        )
        content = response.choices[0].message.content.strip()
        
        # Parse JSON response
        import json
        # Handle potential markdown code blocks
        if content.startswith("```"):
            content = content.split("\n", 1)[1].rsplit("```", 1)[0]
        
        data = json.loads(content)
        
        return OverviewResponse(
            summary_en=data.get("summary_en", "Unable to generate summary."),
            summary_zh=data.get("summary_zh", "无法生成摘要。"),
            key_topics=data.get("key_topics", []),
            difficulty_hint=data.get("difficulty_hint", "")
        )
    except json.JSONDecodeError:
        # Fallback if JSON parsing fails
        return OverviewResponse(
            summary_en="This article covers various topics. Study the sentences to learn more.",
            summary_zh="本文涵盖多个主题。通过逐句学习了解更多。",
            key_topics=[],
            difficulty_hint="Unable to analyze difficulty."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM error: {str(e)}")
