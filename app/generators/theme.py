from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional

from app.config import MODEL_NAME
from app.models import VerbEntry
from app.services.prompt_manager import prompt_manager

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


def generate_theme_sync(topic: str, client, previous_vocab: Optional[ThemeVocabulary] = None) -> ThemeVocabulary:
    if not client:
        raise RuntimeError("LLM client unavailable for theme generation")

    # Build context for avoidance
    context_str = ""
    if previous_vocab:
        avoid_list = []
        for slot_name, values in previous_vocab.slots.items():
            if values:
                avoid_list.append(f"{slot_name}: {', '.join(values)}")
        if previous_vocab.verbs:
            verb_bases = [v.base for v in previous_vocab.verbs]
            avoid_list.append(f"verbs: {', '.join(verb_bases)}")

        if avoid_list:
            context_str = f"\n\nIMPORTANT: Generate NEW words. Avoid repeating these previously used words:\n" + "\n".join(avoid_list)

    user_prompt = prompt_manager.format("theme.user_template", topic=topic, previous_context=context_str)
    system_prompt = prompt_manager.get("theme.system")

    messages = [
        {"role": "system", "content": system_prompt},
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
    return generate_theme_sync(topic, client, previous_vocab)
