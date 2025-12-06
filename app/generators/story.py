from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Optional, List
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
2. Context: The story should make it clear *why* this tense is used (e.g., sequence of events for Past Perfect).
3. Level: CEFR B1/B2 (Natural but accessible).
4. Highlights: Identify the exact substrings where the target tense is used.
5. Grammar Notes: briefly explain WHY the tense was used in those specific instances.

Output JSON Format:
{{
  "topic": "{topic}",
  "target_tense": "{tense}",
  "title": "Creative Title Here",
  "content": "Full story text here...",
  "highlights": ["had gone", "had already finished"],
  "grammar_notes": ["Used 'had gone' to show it happened before arrival."]
}}
"""

def generate_story(topic: str, tense: str, client) -> Story:
    if not client:
        raise RuntimeError("LLM client unavailable for story generation")

    prompt = STORY_PROMPT.format(topic=topic, tense=tense)
    
    messages = [
        {"role": "system", "content": "You are a creative English teacher."},
        {"role": "user", "content": prompt}
    ]

    try:
        rsp = client.chat.completions.create(model=MODEL_NAME, messages=messages, temperature=0.7)
        content = rsp.choices[0].message.content.strip()
        
        # Clean up markdown code blocks if present
        if content.startswith("```json"):
            content = content[7:-3]
        elif content.startswith("```"):
            content = content[3:-3]
            
        data = json.loads(content.strip())
        return Story(**data)
    except Exception as e:
        raise RuntimeError(f"Failed to generate story: {e}")

def load_story(topic: str, tense: str) -> Optional[Story]:
    path = story_path(topic, tense)
    if not path.exists():
        return None
    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return Story(**data)
    except Exception:
        return None

def save_story(story: Story):
    path = story_path(story.topic, story.target_tense)
    with path.open("w", encoding="utf-8") as f:
        json.dump(story.dict(), f, indent=2, ensure_ascii=False)

def ensure_story(topic: str, tense: str, client, refresh: bool = False) -> Story:
    if not refresh:
        cached = load_story(topic, tense)
        if cached:
            return cached
            
    story = generate_story(topic, tense, client)
    save_story(story)
    return story
