"""Generate practice sentences using LLM for specific time layers."""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

from app.config import HOME_DIR, MODEL_NAME
from app.services.prompt_manager import prompt_manager
from app.core.utils import parse_llm_json

SENTENCES_DIR = HOME_DIR / "sentences"
SENTENCES_DIR.mkdir(parents=True, exist_ok=True)

# Time layers and aspects
TIME_LAYERS = ["past", "present", "future", "past_future"]
ASPECTS = ["simple", "perfect", "progressive", "perfect_progressive"]
SENTENCE_FORMS = ["affirmative", "negative", "question"]
WH_WORDS = ["when", "where", "how", "why", "who"]

TIME_LAYER_LABELS = {
    "past": "Past",
    "present": "Present",
    "future": "Future",
    "past_future": "Past Future (would)"
}

def get_sentence_cache_path(topic: str, time_layer: str) -> Path:
    """Get the cache file path for a specific topic and time layer."""
    topic_slug = topic.lower().replace(" ", "-")
    return SENTENCES_DIR / f"{topic_slug}_{time_layer}.json"


def load_cached_sentences(topic: str, time_layer: str) -> Optional[Dict]:
    """Load cached sentences for a topic and time layer."""
    cache_path = get_sentence_cache_path(topic, time_layer)
    if not cache_path.exists():
        return None
    try:
        with cache_path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def save_cached_sentences(topic: str, time_layer: str, data: Dict) -> None:
    """Save generated sentences to cache."""
    cache_path = get_sentence_cache_path(topic, time_layer)
    with cache_path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def generate_sentences_for_time_layer(
    topic: str,
    time_layer: str,
    subject: str,
    verb_base: str,
    verb_past: str,
    verb_participle: str,
    object: str = "",
    manner: str = "",
    place: str = "",
    time: str = "",
    client=None,
) -> Dict:
    """Generate all sentences for a specific time layer using LLM."""
    if not client:
        raise RuntimeError("LLM client unavailable for sentence generation")

    if time_layer not in TIME_LAYERS:
        raise ValueError(f"Invalid time_layer: {time_layer}")

    prompt = prompt_manager.format("sentence.user_template",
        time_layer=time_layer,
        subject=subject,
        verb_base=verb_base,
        verb_past=verb_past,
        verb_participle=verb_participle,
        object=object or "—",
        manner=manner or "—",
        place=place or "—",
        time=time or "—",
    )
    system_prompt = prompt_manager.get("sentence.system")

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt},
    ]
    try:
        rsp = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            temperature=0.2,
        )
        content = rsp.choices[0].message.content.strip()
        
        data = parse_llm_json(content)
        data["generated_at"] = datetime.utcnow().isoformat()
        data["topic"] = topic

        # Save to cache
        save_cached_sentences(topic, time_layer, data)

        return data
    except Exception as exc:
        raise RuntimeError(f"Failed to generate sentences for {time_layer}: {exc}") from exc


def ensure_sentences(
    topic: str,
    time_layer: str,
    subject: str,
    verb_base: str,
    verb_past: str,
    verb_participle: str,
    object: str = "",
    manner: str = "",
    place: str = "",
    time: str = "",
    client=None,
    refresh: bool = False,
) -> Dict:
    """Get sentences for a time layer, generating if needed."""
    if not refresh:
        cached = load_cached_sentences(topic, time_layer)
        if cached:
            return cached

    return generate_sentences_for_time_layer(
        topic, time_layer, subject, verb_base, verb_past, verb_participle,
        object, manner, place, time, client
    )


def clear_topic_cache(topic: str) -> None:
    """Clear all cached sentences for a topic."""
    topic_slug = topic.lower().replace(" ", "-")
    for time_layer in TIME_LAYERS:
        cache_path = SENTENCES_DIR / f"{topic_slug}_{time_layer}.json"
        if cache_path.exists():
            cache_path.unlink()
