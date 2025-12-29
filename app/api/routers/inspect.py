"""
Inspect Router - Word inspection with source context tracking.

This endpoint combines dictionary lookup with learning context recording,
enabling "Where did I learn this word?" features during review.
"""

from fastapi import APIRouter, Depends, Query
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.db import get_db
from app.services.dictionary import dict_manager
from app.services.collins_parser import collins_parser
from app.services.ldoce_parser import ldoce_parser
from app.models.orm import VocabLearningLog
from app.models.collins_schemas import CollinsWord
from app.models.ldoce_schemas import LDOCEWord

router = APIRouter(prefix="/api", tags=["inspect"])


@router.get("/inspect")
async def inspect_word(
    word: str,
    source_type: Optional[str] = Query(
        "dictionary",
        description="Source type: epub, rss, podcast, plain_text, dictionary"
    ),
    source_id: Optional[str] = Query(
        None,
        description="Source identifier: e.g., 'epub:economist_2024_01'"
    ),
    context: Optional[str] = Query(
        None,
        description="The sentence where the word was encountered"
    ),
    timestamp: Optional[float] = Query(
        None,
        description="Audio timestamp in seconds (for podcast/audio sources)"
    ),
    user_id: str = Query("default_user"),
    db: AsyncSession = Depends(get_db)
):
    """
    Inspect a word: look up definition AND record learning context.
    
    This endpoint:
    1. Returns dictionary definition (Collins + LDOCE if available)
    2. Records the source context in VocabLearningLog for later review
    
    Example:
        GET /api/inspect?word=pivot&source_id=epub:economist&context=Let's+pivot
    """
    # 1. Dictionary lookup (runs in threadpool)
    results = await run_in_threadpool(dict_manager.lookup, word)
    
    # Parse structured data from Collins and LDOCE
    collins_data = None
    ldoce_data = None
    
    for result in results:
        dict_name = result.get("dictionary", "").lower()
        html = result.get("definition", "")
        
        if "collins" in dict_name and not collins_data:
            parsed = collins_parser.parse(html, word)
            if parsed.found:
                collins_data = parsed
        elif ("ldoce" in dict_name or "longman" in dict_name) and not ldoce_data:
            parsed = ldoce_parser.parse(html, word)
            if parsed.found:
                ldoce_data = parsed
    
    # 2. Record learning context (async DB operation)
    log_entry = VocabLearningLog(
        user_id=user_id,
        word=word.lower().strip(),
        source_type=source_type or "dictionary",
        source_id=source_id,
        context_sentence=context,
        audio_timestamp=timestamp
    )
    db.add(log_entry)
    await db.commit()
    
    # 3. Return combined response
    return {
        "word": word,
        "logged": True,
        "log_id": log_entry.id,
        "collins": collins_data.model_dump() if collins_data else None,
        "ldoce": ldoce_data.model_dump() if ldoce_data else None,
        "raw_results": results  # Fallback for other dictionaries
    }


@router.get("/inspect/history")
async def get_word_history(
    word: str,
    user_id: str = Query("default_user"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get learning history for a word: all contexts where it was encountered.
    
    Enables "Where did I learn this word?" feature during review.
    """
    from sqlalchemy import select
    
    stmt = select(VocabLearningLog).where(
        VocabLearningLog.user_id == user_id,
        VocabLearningLog.word == word.lower().strip()
    ).order_by(VocabLearningLog.created_at.desc())
    
    result = await db.execute(stmt)
    logs = result.scalars().all()
    
    return {
        "word": word,
        "total_encounters": len(logs),
        "history": [
            {
                "id": log.id,
                "source_type": log.source_type,
                "source_id": log.source_id,
                "context_sentence": log.context_sentence,
                "audio_timestamp": log.audio_timestamp,
                "created_at": log.created_at.isoformat() if log.created_at else None
            }
            for log in logs
        ]
    }
