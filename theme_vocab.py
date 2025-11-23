from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from config import HOME_DIR, MODEL_NAME, THEMES_DIR
from models import VerbEntry

DEFAULT_SLOTS: Dict[str, List[str]] = {
    "subject": ["I", "We", "My friends"],
    "object": ["English", "stories", "new lessons"],
    "manner": ["carefully", "with excitement"],
    "place": ["at home", "in class"],
    "time": ["every day", "on weekends"],
}

DEFAULT_VERBS = [
    {"base": "study", "past": "studied", "participle": "studied"},
    {"base": "review", "past": "reviewed", "participle": "reviewed"},
]


@dataclass
class ThemeVocabulary:
    topic: str
    generated_at: str
    slots: Dict[str, List[str]] = field(default_factory=dict)
    verbs: List[VerbEntry] = field(default_factory=list)

    def ensure_defaults(self) -> None:
        for key, fallback in DEFAULT_SLOTS.items():
            if key not in self.slots or not self.slots[key]:
                self.slots[key] = fallback
        if not self.verbs:
            self.verbs = [VerbEntry.from_raw(v) for v in DEFAULT_VERBS]

    def serialize(self) -> Dict:
        return {
            "topic": self.topic,
            "generated_at": self.generated_at,
            "slots": self.slots,
            "verbs": [vars(v) for v in self.verbs],
        }

    @classmethod
    def from_payload(cls, payload: Dict) -> "ThemeVocabulary":
        slots = {}
        if "slots" in payload:
            for key, value in payload.get("slots", {}).items():
                # Handle both string and list formats
                if isinstance(value, str):
                    slots[key] = [value.strip()] if value.strip() else []
                elif isinstance(value, list):
                    slots[key] = [w.strip() for w in value if isinstance(w, str) and w.strip()]
                else:
                    slots[key] = []

        if not slots:
            # Accept flattened structure (subject, object, manner, ...)
            for key in DEFAULT_SLOTS.keys():
                value = payload.get(key, [])
                if isinstance(value, str):
                    slots[key] = [value.strip()] if value.strip() else []
                elif isinstance(value, list):
                    slots[key] = [w.strip() for w in value if isinstance(w, str) and w.strip()]

        verbs_raw = payload.get("verbs") or payload.get("verb") or DEFAULT_VERBS
        verbs = [VerbEntry.from_raw(v) for v in verbs_raw if isinstance(v, dict)]
        vocab = cls(topic=payload.get("topic") or "general", generated_at=payload.get("generated_at") or datetime.utcnow().isoformat(), slots=slots, verbs=verbs)
        vocab.ensure_defaults()
        return vocab


def slugify(topic: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", topic.lower())
    return slug.strip("-") or "topic"


def theme_path(topic: str) -> Path:
    return THEMES_DIR / f"{slugify(topic)}.json"


def load_theme(topic: str) -> Optional[ThemeVocabulary]:
    path = theme_path(topic)
    if not path.exists():
        return None
    with path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    return ThemeVocabulary.from_payload(data)


def save_theme(vocab: ThemeVocabulary) -> None:
    path = theme_path(vocab.topic)
    with path.open("w", encoding="utf-8") as fh:
        json.dump(vocab.serialize(), fh, indent=2, ensure_ascii=False)


THEME_PROMPT = """You are an English tutor for New Concept English learners.
Given a topic, provide JSON with ONE set of words for sentence practice.

Response JSON schema:
{
  "topic": "<topic>",
  "slots": {
     "subject": "I",
     "object": "new vocabulary",
     "manner": "carefully",
     "place": "at home",
     "time": "every day"
  },
  "verbs": [
    {"base":"study","past":"studied","participle":"studied","note":"to learn"}
  ]
}

CRITICAL REQUIREMENTS:
1. MUST use the topic word in at least ONE slot (subject, object, manner, place, or time)
2. The topic word should appear naturally in the sentence
3. Generate ONLY ONE word/phrase for each slot (not arrays)
4. Choose ONE appropriate verb related to this topic
5. Keep words concise and appropriate for CEFR B1 learners

Examples:
- Topic "muse" → object: "the muse" or "my muse"
- Topic "travel" → object: "travel plans" or verb: "travel"
- Topic "coffee" → object: "coffee" or place: "at the coffee shop"
"""


def generate_theme(topic: str, client=None, previous_vocab: Optional[ThemeVocabulary] = None) -> ThemeVocabulary:
    if not client:
        raise RuntimeError("LLM client unavailable for theme generation")

    # Build prompt with previous words to avoid
    user_prompt = f"{THEME_PROMPT}\nTopic: {topic}"

    if previous_vocab:
        avoid_list = []
        for slot_name, values in previous_vocab.slots.items():
            if values:
                avoid_list.append(f"{slot_name}: {', '.join(values)}")
        if previous_vocab.verbs:
            verb_bases = [v.base for v in previous_vocab.verbs]
            avoid_list.append(f"verbs: {', '.join(verb_bases)}")

        if avoid_list:
            user_prompt += f"\n\nIMPORTANT: Generate NEW words. Avoid repeating these previously used words:\n" + "\n".join(avoid_list)

    user_prompt += "\n\nRespond with JSON only."

    messages = [
        {"role": "system", "content": "You craft vocabulary slots for sentence practice."},
        {"role": "user", "content": user_prompt},
    ]
    try:
        rsp = client.chat.completions.create(model=MODEL_NAME, messages=messages, temperature=0.7)
        content = rsp.choices[0].message.content.strip()
        data = json.loads(content)
        if "topic" not in data:
            data["topic"] = topic
        data.setdefault("generated_at", datetime.utcnow().isoformat())
        vocab = ThemeVocabulary.from_payload(data)
        vocab.ensure_defaults()
        return vocab
    except Exception as exc:
        raise RuntimeError(f"Failed to generate theme for '{topic}': {exc}") from exc


def ensure_theme(topic: str, client=None, refresh: bool = False, previous_vocab: Optional[ThemeVocabulary] = None) -> ThemeVocabulary:
    cached = load_theme(topic) if not refresh else None
    if cached:
        return cached
    if not client:
        raise RuntimeError("No cached vocabulary and model unavailable.")
    vocab = generate_theme(topic, client=client, previous_vocab=previous_vocab)
    save_theme(vocab)
    return vocab
