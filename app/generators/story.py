from __future__ import annotations

import json
from typing import Optional, AsyncGenerator

from app.config import MODEL_NAME
from app.models import Story
from app.services.prompt_manager import prompt_manager
from app.core.utils import parse_llm_json

async def generate_story_stream(topic: str, tense: str, client) -> AsyncGenerator[str, None]:
    if not client:
        yield json.dumps({"error": "LLM client unavailable"})
        return

    prompt = prompt_manager.format("story.user_template", topic=topic, tense=tense)
    system_prompt = prompt_manager.get("story.system")

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt}
    ]

    try:
        stream = await client.chat.completions.create(
            model=MODEL_NAME, 
            messages=messages, 
            temperature=0.7,
            stream=True
        )

        full_buffer = ""
        yielded_idx = 0
        metadata_layer = False
        
        from app.database import log_story

        async for chunk in stream:
            token = chunk.choices[0].delta.content or ""
            if not token: continue
            
            full_buffer += token
            
            if not metadata_layer:
                if "---METADATA---" in full_buffer:
                    metadata_layer = True
                    # Split at first occurrence
                    parts = full_buffer.split("---METADATA---")
                    text_part = parts[0]
                    
                    # Yield any remaining text
                    if len(text_part) > yielded_idx:
                        yield json.dumps({"type": "text", "chunk": text_part[yielded_idx:]}) + "\n"
                        yielded_idx = len(text_part)
                else:
                    # Safe to yield up to len - marker_len
                    marker_len = len("---METADATA---")
                    safe_len = len(full_buffer) - marker_len
                    if safe_len > yielded_idx:
                        chunk_to_send = full_buffer[yielded_idx:safe_len]
                        yield json.dumps({"type": "text", "chunk": chunk_to_send}) + "\n"
                        yielded_idx = safe_len
        
        # Stream finished.
        # Parse metadata
        parts = full_buffer.split("---METADATA---")
        
        # Save to DB if successful
        if len(parts) > 1:
            try:
                story_text = parts[0].strip()
                json_str = parts[1].strip()
                meta = parse_llm_json(json_str)
                story_obj = Story(
                    topic=topic,
                    target_tense=tense,
                    title=meta.get("title", topic),
                    content=story_text,
                    highlights=meta.get("highlights", []),
                    grammar_notes=meta.get("grammar_notes", [])
                )
                # Async DB call
                await log_story(topic, tense, story_obj.model_dump())
                
                # Send metadata event
                yield json.dumps({"type": "data", "story": story_obj.model_dump()}) + "\n"
            except Exception as e:
                print(f"Meta parse error: {e}")
                # Fallback: just send text
                yield json.dumps({"type": "text", "chunk": ""}) + "\n"
                
    except Exception as e:
        yield json.dumps({"error": str(e)}) + "\n"


def load_story(topic: str, tense: str) -> Optional[Story]:
    """
    Synchronous wrapper for loading story.
    WARNING: Since we are moving to Async DB, this sync wrapper is tricky.
    Use `get_story` from `app.database` which is async.

    This function should be deprecated or use `asyncio.run` (bad practice inside event loop).
    The API router `app/api/routers/content.py` should be updated to use `get_story` directly.
    """
    return None # Force regeneration or use async path in Router
