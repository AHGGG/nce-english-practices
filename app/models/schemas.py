from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, field_validator

# --- Existing Dataclasses (Kept for backward compatibility with TUI/Legacy) ---

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

# --- New Pydantic Models for Active Trainer (API Centric) ---

class Story(BaseModel):
    """Stage 1: Context Mode"""
    topic: str
    target_tense: str
    title: str
    content: str
    highlights: List[str] = Field(default_factory=list, description="List of substrings to highlight")
    grammar_notes: List[str] = Field(default_factory=list, description="Explanations for tense usage")

class QuizOption(BaseModel):
    """Option for Multiple Choice Questions"""
    id: str  # A, B, C, D
    text: str
    is_correct: bool
    explanation: Optional[str] = None

class QuizItem(BaseModel):
    """Stage 2: Drill Mode"""
    question_context: str
    options: List[QuizOption]
    tense_category: str
    aspect: str

class ScenarioPrompt(BaseModel):
    """Stage 3: Apply Mode (Input)"""
    situation: str
    goal: str

class ScenarioResponse(BaseModel):
    """Stage 3: Apply Mode (Output)"""
    user_input: str
    is_pass: bool
    feedback: str
    improved_version: str

class Mission(BaseModel):
    """Stage 4: Speak Mode"""
    id: str
    title: str
    description: str
    required_grammar: List[str]

class ChatState(BaseModel):
    """State for Roleplay"""
    mission_id: str
    history: List[Dict[str, str]]
    goals_met: List[bool]

class RemoteLog(BaseModel):
    """Log entry from frontend"""
    level: str
    message: str = Field(..., max_length=10000, description="Log message limited to 10k chars")
    data: Optional[Dict] = None
    timestamp: Optional[str] = None
    category: Optional[str] = None  # Optional category hint from frontend

    @field_validator('data')
    @classmethod
    def check_data_size(cls, v: Optional[Dict]) -> Optional[Dict]:
        if v:
            # Approximate size check (JSON string length)
            # Limit to ~50KB to prevent DoS via data payload
            if len(str(v)) > 50000:
                raise ValueError('Data payload too large (max 50KB)')
        return v
