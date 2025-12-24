"""
Context Router - API endpoints for context resources and learning progress.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
import io

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models.context_schemas import (
    ContextType,
    LearningStatus,
    ContextResource,
    ContextResourceWithAudio,
    WordContextProgress,
    UpdateLearningStatusRequest,
)
from app.services.context_service import context_service


router = APIRouter(prefix="/api/context", tags=["Context Resources"])


@router.get(
    "/{word}",
    response_model=List[ContextResourceWithAudio],
    summary="Get all context resources for a word",
)
async def get_word_contexts(
    word: str,
    context_type: Optional[ContextType] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Get all saved context resources for a word.
    Optionally filter by context type.
    """
    contexts = await context_service.get_contexts_for_word(word, db, context_type)
    
    # Add audio endpoint info
    return [
        ContextResourceWithAudio(
            **ctx.model_dump(),
            audio_available=True,
            audio_endpoint=f"/api/context/{ctx.id}/audio",
        )
        for ctx in contexts
    ]


@router.post(
    "/{word}/extract",
    response_model=List[ContextResource],
    summary="Extract contexts from dictionary and save",
)
async def extract_and_save_contexts(
    word: str,
    save: bool = True,
    db: AsyncSession = Depends(get_db),
):
    """
    Extract example sentences from loaded dictionaries.
    Optionally save to database (default: True).
    """
    contexts = await context_service.extract_from_dictionary(word)
    
    if not contexts:
        return []
    
    if save:
        saved = await context_service.save_contexts(contexts, db)
        return saved
    
    return contexts


@router.get(
    "/{context_id}/audio",
    summary="Get TTS audio for a context",
    response_class=StreamingResponse,
)
async def get_context_audio(
    context_id: int,
    voice: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Generate TTS audio for a context resource.
    Returns MP3 audio stream.
    """
    context = await context_service.get_context_by_id(context_id, db)
    
    if not context:
        raise HTTPException(status_code=404, detail="Context not found")
    
    audio_bytes = await context_service.generate_tts(context.text_content, voice)
    
    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type="audio/mpeg",
        headers={
            "Content-Disposition": f"inline; filename=context_{context_id}.mp3",
            "Cache-Control": "public, max-age=3600",  # Cache for 1 hour
        }
    )


@router.post(
    "/{context_id}/learn",
    summary="Update learning status for a context",
)
async def update_learning_status(
    context_id: int,
    request: UpdateLearningStatusRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Update the learning status (unseen/learning/mastered) for a context.
    """
    # Verify context exists
    context = await context_service.get_context_by_id(context_id, db)
    if not context:
        raise HTTPException(status_code=404, detail="Context not found")
    
    record = await context_service.update_learning_status(
        context_id=context_id,
        user_id=request.user_id,
        status=request.status,
        db=db,
    )
    
    return {
        "success": True,
        "record": record,
    }


@router.get(
    "/{word}/progress",
    response_model=WordContextProgress,
    summary="Get learning progress for a word",
)
async def get_word_progress(
    word: str,
    user_id: str = "default_user",
    db: AsyncSession = Depends(get_db),
):
    """
    Get learning progress statistics for a word.
    Returns total contexts and counts by status.
    """
    progress = await context_service.get_learning_progress(word, user_id, db)
    return progress


@router.get(
    "/id/{context_id}",
    response_model=ContextResource,
    summary="Get a single context by ID",
)
async def get_context_by_id(
    context_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a single context resource by its ID.
    """
    context = await context_service.get_context_by_id(context_id, db)
    
    if not context:
        raise HTTPException(status_code=404, detail="Context not found")
    
    return context
