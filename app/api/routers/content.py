from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import json
import asyncio

from app.generators.theme import ensure_theme, ThemeVocabulary
from app.generators.sentence import ensure_sentences
from app.generators.story import generate_story_stream, load_story
from app.database import log_session
from app.services.llm import llm_service
from app.core.utils import SAFE_INPUT_PATTERN

router = APIRouter()

class ThemeRequest(BaseModel):
    topic: str = Field(..., max_length=100, pattern=SAFE_INPUT_PATTERN, description="Topic for the theme")
    previous_vocab: Optional[Dict[str, Any]] = None

class StoryRequest(BaseModel):
    topic: str = Field(..., max_length=100, pattern=SAFE_INPUT_PATTERN)
    target_tense: str = Field(..., max_length=50, pattern=SAFE_INPUT_PATTERN)

class SentenceRequest(BaseModel):
    topic: str = Field(..., max_length=100, pattern=SAFE_INPUT_PATTERN)
    time_layer: str = Field(..., max_length=50, pattern=SAFE_INPUT_PATTERN)
    subject: str = Field(..., max_length=50, pattern=SAFE_INPUT_PATTERN)
    verb_base: str = Field(..., max_length=50, pattern=SAFE_INPUT_PATTERN)
    verb_past: str = Field(..., max_length=50, pattern=SAFE_INPUT_PATTERN)
    verb_participle: str = Field(..., max_length=50, pattern=SAFE_INPUT_PATTERN)
    object: str = Field("", max_length=100, pattern=SAFE_INPUT_PATTERN)
    manner: str = Field("", max_length=100, pattern=SAFE_INPUT_PATTERN)
    place: str = Field("", max_length=100, pattern=SAFE_INPUT_PATTERN)
    time: str = Field("", max_length=100, pattern=SAFE_INPUT_PATTERN)

@router.post("/api/theme")
async def api_generate_theme(payload: ThemeRequest):
    try:
        from app.database import get_session_vocab, log_session

        # 1. Check DB Cache
        cached_vocab = await get_session_vocab(payload.topic)
        if cached_vocab and not payload.previous_vocab: # Only use cache if not asking for refresh (implied by prev_vocab)
            return cached_vocab

        # 2. Generate
        prev_vocab_obj = None
        if payload.previous_vocab:
            try:
                prev_vocab_obj = ThemeVocabulary.from_payload(payload.previous_vocab)
            except Exception:
                pass

        from fastapi.concurrency import run_in_threadpool
        vocab = await run_in_threadpool(
            ensure_theme,
            topic=payload.topic,
            client=llm_service.sync_client,
            refresh=True, # Always refresh if we got here (failed cache check)
            previous_vocab=prev_vocab_obj
        )

        # [DB] Log Session
        await log_session(payload.topic, vocab.serialize())

        return vocab.serialize()
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/api/story")
async def api_generate_story(payload: StoryRequest):
    # Gather stream for legacy support
    from app.database import get_story

    # Check cache first
    cached = await get_story(payload.topic, payload.target_tense)
    if cached:
        return cached

    # Gather stream
    full_content = ""
    last_data = None
    async for chunk_str in generate_story_stream(payload.topic, payload.target_tense, llm_service.async_client):
        chunk = json.loads(chunk_str)
        if chunk.get("type") == "text":
            full_content += chunk.get("chunk", "")
        elif chunk.get("type") == "data":
            last_data = chunk.get("story")

    if last_data:
        return last_data

    # Fallback if stream failed to produce data object
    raise HTTPException(status_code=500, detail="Failed to generate story")

@router.post("/api/story/stream")
async def api_stream_story(payload: StoryRequest):
    from app.database import get_story

    cached = await get_story(payload.topic, payload.target_tense)
    if cached:
        async def fake_stream():
             # Simulate streaming for cached content to maintain UX
             content = cached.get("content", "")
             chunk_size = 10 # chars per chunk
             for i in range(0, len(content), chunk_size):
                 chunk = content[i:i+chunk_size]
                 yield json.dumps({"type": "text", "chunk": chunk}) + "\n"
                 await asyncio.sleep(0.01) # 10ms delay

             yield json.dumps({"type": "data", "story": cached}) + "\n"
        return StreamingResponse(fake_stream(), media_type="application/x-ndjson")

    return StreamingResponse(
        generate_story_stream(payload.topic, payload.target_tense, llm_service.async_client),
        media_type="application/x-ndjson"
    )

@router.post("/api/sentences")
async def api_generate_sentences(payload: SentenceRequest):
    try:
        from fastapi.concurrency import run_in_threadpool
        data = await run_in_threadpool(
            ensure_sentences,
            topic=payload.topic,
            time_layer=payload.time_layer,
            subject=payload.subject,
            verb_base=payload.verb_base,
            verb_past=payload.verb_past,
            verb_participle=payload.verb_participle,
            object=payload.object,
            manner=payload.manner,
            place=payload.place,
            time=payload.time,
            client=llm_service.sync_client
        )
        return data
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")
