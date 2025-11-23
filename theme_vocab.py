from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List

from config import HOME_DIR, THEMES_DIR
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
        slots = {key: [w.strip() for w in words if isinstance(w, str) and w.strip()] for key, words in payload.get("slots", {}).items()} if "slots" in payload else {}

        if not slots:
            # Accept flattened structure (subject, object, manner, ...)
            slots = {
                key: [w.strip() for w in payload.get(key, []) if isinstance(w, str) and w.strip()]
                for key in DEFAULT_SLOTS.keys()
            }

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
Given a topic, provide JSON with six slots (subject, object, manner, place, time) and verb options.

Response JSON schema:
{
  "topic": "<topic>",
  "slots": {
     "subject": ["..."],
     "object": ["..."],
     "manner": ["..."],
     "place": ["..."],
     "time": ["..."]
  },
  "verbs": [
    {"base":"travel","past":"traveled","participle":"traveled","note":"to go on journeys"}
  ]
}

Keep words concise and appropriate for CEFR B1 learners.
"""


def generate_theme(topic: str, client=None) -> ThemeVocabulary:
    if not client:
        vocab = ThemeVocabulary(topic=topic, generated_at=datetime.utcnow().isoformat())
        vocab.ensure_defaults()
        return vocab

    messages = [
        {"role": "system", "content": "You craft vocabulary slots for sentence practice."},
        {"role": "user", "content": f"{THEME_PROMPT}\nTopic: {topic}\nRespond with JSON only."},
    ]
    try:
        rsp = client.chat.completions.create(model="gpt-4o-mini", messages=messages, temperature=0.2)
        content = rsp.choices[0].message.content.strip()
        data = json.loads(content)
        if "topic" not in data:
            data["topic"] = topic
        data.setdefault("generated_at", datetime.utcnow().isoformat())
        vocab = ThemeVocabulary.from_payload(data)
        vocab.ensure_defaults()
        return vocab
    except Exception:
        fallback = ThemeVocabulary(topic=topic, generated_at=datetime.utcnow().isoformat())
        fallback.ensure_defaults()
        return fallback


def ensure_theme(topic: str, client=None, refresh: bool = False) -> ThemeVocabulary:
    if not refresh:
        cached = load_theme(topic)
        if cached:
            return cached
    vocab = generate_theme(topic, client=client)
    save_theme(vocab)
    return vocab
