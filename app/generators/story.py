from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Optional, List, AsyncGenerator
from datetime import datetime

from app.config import HOME_DIR, MODEL_NAME
from app.models import Story

# Local storage for stories
STORIES_DIR = HOME_DIR / "stories"
STORIES_DIR.mkdir(parents=True, exist_ok=True)

def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower())
    return slug.strip("-") or "story"

def story_path(topic: str, tense: str) -> Path:
    return STORIES_DIR / f"{slugify(topic)}_{slugify(tense)}.json"

STORY_PROMPT = """You are an expert English teacher creating contextual learning materials.
Write a SHORT, ENGAGING story (approx. 100-150 words) that naturally emphasizes the target tense.

Target Topic: {topic}
Target Tense: {tense}

REQUIREMENTS:
1. "Input Flooding": Use the target tense at least 3-5 times naturally within the story.
2. Context: The story should make it clear *why* this tense is used.
3. Level: CEFR B1/B2.

OUTPUT FORMAT:
1. First, write the story text directly.
2. Then, output a divider line: "---METADATA---"
3. Finally, output the JSON metdata for highlights and grammar notes.

Example Layout:
Title: The Adventure
Once upon a time... (Story content)
---METADATA---
{{
  "title": "The Adventure",
  "highlights": ["had gone"],
  "grammar_notes": ["Explanation..."]
}}
"""

async def generate_story_stream(topic: str, tense: str, client) -> AsyncGenerator[str, None]:
    if not client:
        yield json.dumps({"error": "LLM client unavailable"})
        return

    prompt = STORY_PROMPT.format(topic=topic, tense=tense)
    messages = [
        {"role": "system", "content": "You are a creative English teacher."},
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
        
        # Save to DB/Disk if successful
        if len(parts) > 1:
            try:
                story_text = parts[0].strip()
                json_str = parts[1].strip()
                if json_str.startswith("```json"): json_str = json_str[7:-3]
                elif json_str.startswith("```"): json_str = json_str[3:-3]
                
                meta = json.loads(json_str)
                story_obj = Story(
                    topic=topic,
                    target_tense=tense,
                    title=meta.get("title", topic),
                    content=story_text,
                    highlights=meta.get("highlights", []),
                    grammar_notes=meta.get("grammar_notes", [])
                )
                save_story(story_obj)
                
                # Send metadata event
                yield json.dumps({"type": "data", "story": story_obj.dict()}) + "\n"
            except Exception as e:
                print(f"Meta parse error: {e}")
                # Fallback: just send text
                yield json.dumps({"type": "text", "chunk": ""}) + "\n"
                
    except Exception as e:
        yield json.dumps({"error": str(e)}) + "\n"

def save_story(story: Story):
    path = story_path(story.topic, story.target_tense)
    with path.open("w", encoding="utf-8") as f:
        json.dump(story.dict(), f, indent=2, ensure_ascii=False)
        
    # Also log to DB if possible (async fire-and-forget or sync wrapper?)
    # Since we are in potentially async context (generate_story_stream) or sync (ensure_story),
    # and log_story is async...
    # For now, let's just stick to local cache which is what this module handles.
    # The main.py or database layer can handle DB logging if needed, but 
    # generate_story_stream calls this.
    
    # Actually, we should try to log to DB. But log_story is async.
    # If we are in async context (stream), we can await it?
    # But save_story is called from sync ensure_story too.
    
    # Pragmactic approach: Just save to disk for now to fix NameError.
    # The user request "log logic problem" was about stats.
    pass

def load_story(topic: str, tense: str) -> Optional[Story]:
    path = story_path(topic, tense)
    if not path.exists():
        # Try to fetch from DB?
        # For now, just disk
        return None
    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return Story(**data)
    except Exception:
        return None

def generate_story(topic: str, tense: str, client) -> Story:
    # Legacy synchronous generation
    if not client:
        raise RuntimeError("LLM client unavailable")

    prompt = STORY_PROMPT.format(topic=topic, tense=tense)
    messages = [
        {"role": "system", "content": "You are a creative English teacher."},
        {"role": "user", "content": prompt}
    ]

    try:
        # Check if client is async or sync. 
        # In main.py, 'client' is passed which is usually the sync client. 'async_client' is passed to stream.
        rsp = client.chat.completions.create(model=MODEL_NAME, messages=messages, temperature=0.7)
        content = rsp.choices[0].message.content.strip()
        
        # Clean up marker and metadata
        if "---METADATA---" in content:
            parts = content.split("---METADATA---")
            story_text = parts[0].strip()
            json_str = parts[1].strip()
            if json_str.startswith("```json"): json_str = json_str[7:-3]
            elif json_str.startswith("```"): json_str = json_str[3:-3]
            
            meta = json.loads(json_str)
            return Story(
                topic=topic,
                target_tense=tense,
                title=meta.get("title", topic),
                content=story_text,
                highlights=meta.get("highlights", []),
                grammar_notes=meta.get("grammar_notes", [])
            )
        else:
            # Fallback for old format or failure
            if content.startswith("```json"): content = content[7:-3]
            elif content.startswith("```"): content = content[3:-3]
            try:
                data = json.loads(content)
                return Story(**data)
            except:
                return Story(topic=topic, target_tense=tense, title=topic, content=content, highlights=[], grammar_notes=[])
                
    except Exception as e:
        raise RuntimeError(f"Failed to generate story: {e}")

def ensure_story(topic: str, tense: str, client, refresh: bool = False) -> Story:
    if not refresh:
        cached = load_story(topic, tense)
        if cached:
            return cached
            
    story = generate_story(topic, tense, client)
    save_story(story)
    return story
