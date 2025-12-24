"""
AUI Streaming API Router - SSE Endpoints for streaming AUI events
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional
import json

from app.services.aui_streaming import aui_streaming_service
from app.services.aui_events import AUIEvent

router = APIRouter(prefix="/aui", tags=["AUI Streaming"])


async def event_stream_generator(events_generator):
    """
    Convert AUIEvent generator to SSE format.
    
    SSE Format:
        data: <json>\n\n
    """
    async for event in events_generator:
        # Serialize Pydantic model to JSON
        event_json = event.model_dump_json()
        
        # SSE format: "data: {json}\n\n"
        yield f"data: {event_json}\n\n"


@router.get("/stream/story")
async def stream_story(
    content: str,
    title: str = "Story",
    user_level: int = 1,
    chunk_size: int = 5
):
    """
    Stream a story presentation with incremental text updates.
    
    Args:
        content: Story text
        title: Story title
        user_level: User mastery level (1-3)
        chunk_size: Words per text delta
    
    Returns:
        StreamingResponse with text/event-stream
    """
    if not content:
        raise HTTPException(status_code=400, detail="Content is required")
    
    if not 1 <= user_level <= 3:
        raise HTTPException(status_code=400, detail="user_level must be 1-3")
    
    events = aui_streaming_service.stream_story_presentation(
        story_content=content,
        title=title,
        user_level=user_level,
        chunk_size=chunk_size
    )
    
    return StreamingResponse(
        event_stream_generator(events),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )


@router.get("/stream/vocabulary")
async def stream_vocabulary(
    words: str,  # Comma-separated words
    user_level: int = 1
):
    """
    Stream vocabulary cards.
    
    Args:
        words: Comma-separated vocabulary words
        user_level: User mastery level (1-3)
    
    Returns:
        StreamingResponse with text/event-stream
    """
    if not words:
        raise HTTPException(status_code=400, detail="Words are required")
    
    word_list = [w.strip() for w in words.split(",") if w.strip()]
    
    if not word_list:
        raise HTTPException(status_code=400, detail="No valid words provided")
    
    events = aui_streaming_service.stream_vocabulary_cards(
        words=word_list,
        user_level=user_level
    )
    
    return StreamingResponse(
        event_stream_generator(events),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/stream/contexts")
async def stream_contexts(
    word: str,
    user_level: int = 1
):
    """
    Stream context resources for a word with progressive loading.
    
    Uses ContextList and ContextCard components for rendering.
    
    Args:
        word: Target vocabulary word
        user_level: User mastery level (1-3)
    
    Returns:
        StreamingResponse with text/event-stream
    """
    if not word:
        raise HTTPException(status_code=400, detail="Word is required")
    
    events = aui_streaming_service.stream_context_resources(
        word=word,
        user_level=user_level
    )
    
    return StreamingResponse(
        event_stream_generator(events),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
