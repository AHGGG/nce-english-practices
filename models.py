from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class VerbEntry:
    base: str
    past: str
    participle: str
    note: Optional[str] = None

    def label(self) -> str:
        return f"{self.base} ({self.past}, {self.participle})"

    @classmethod
    def from_raw(cls, payload: Dict) -> "VerbEntry":
        base = (payload.get("base") or payload.get("verb") or payload.get("infinitive") or "study").strip()
        past = (payload.get("past") or payload.get("verb_past") or f"{base}ed").strip()
        pp = (payload.get("participle") or payload.get("past_participle") or payload.get("pp") or past).strip()
        return cls(base=base, past=past, participle=pp, note=payload.get("note"))


@dataclass
class BaseSentence:
    subject: str
    verb_base: str
    verb_past: str
    verb_participle: str
    object: str
    manner: str
    place: str
    time: str


@dataclass
class SelectionSnapshot:
    topic: str
    words: Dict[str, str]
    verb: Dict[str, str]


@dataclass
class SelectionState:
    topic: str
    slots: Dict[str, List[str]]
    verbs: List[VerbEntry]
    order: List[str] = field(default_factory=lambda: ["subject", "verb", "object", "manner", "place", "time"])
    selected_slot_index: Dict[str, int] = field(default_factory=dict)
    selected_verb_index: int = 0

    def cycle_slot(self, slot: str, delta: int) -> None:
        values = self.slots.get(slot, [])
        if not values:
            return
        idx = self.selected_slot_index.get(slot, 0)
        self.selected_slot_index[slot] = (idx + delta) % len(values)

    def cycle_verb(self, delta: int) -> None:
        if not self.verbs:
            return
        self.selected_verb_index = (self.selected_verb_index + delta) % len(self.verbs)

    def word_for(self, slot: str) -> str:
        values = self.slots.get(slot, [])
        if not values:
            return ""
        idx = self.selected_slot_index.get(slot, 0) % len(values)
        return values[idx]

    def current_verb(self) -> VerbEntry:
        if not self.verbs:
            self.verbs = [VerbEntry("study", "studied", "studied")]
        return self.verbs[self.selected_verb_index % len(self.verbs)]

    def build_sentence(self) -> BaseSentence:
        verb = self.current_verb()
        return BaseSentence(
            subject=self.word_for("subject"),
            verb_base=verb.base,
            verb_past=verb.past,
            verb_participle=verb.participle,
            object=self.word_for("object"),
            manner=self.word_for("manner"),
            place=self.word_for("place"),
            time=self.word_for("time"),
        )

    def snapshot(self) -> SelectionSnapshot:
        return SelectionSnapshot(
            topic=self.topic,
            words={slot: self.word_for(slot) for slot in self.slots},
            verb={
                "base": self.current_verb().base,
                "past": self.current_verb().past,
                "participle": self.current_verb().participle,
            },
        )
