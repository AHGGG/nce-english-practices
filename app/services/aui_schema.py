"""
AUI Schema Validation
Defines Pydantic models for AUI Components to ensure prop validity.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, ValidationError

# --- Component Prop Models ---


class FlashCardStackProps(BaseModel):
    words: List[Any]  # Can be strings or objects
    show_translation: Optional[bool] = True
    current_index: Optional[int] = 0
    is_flipped: Optional[bool] = False
    messageId: Optional[str] = None


class VocabGridProps(BaseModel):
    words: List[Any]
    show_translation: Optional[bool] = False
    challenge_mode: Optional[bool] = False
    monolingual: Optional[bool] = False
    expanded_indices: Optional[List[int]] = None
    messageId: Optional[str] = None


class InteractiveDemoProps(BaseModel):
    status: str  # "processing", "waiting_input", "success", "error", "cancelled"
    message: str
    options: Optional[List[Dict[str, Any]]] = None  # [{"label":, "action":}]
    sessionId: Optional[str] = None


class MarkdownMessageProps(BaseModel):
    content: str


class DiffCardProps(BaseModel):
    original: str
    corrected: str
    label: Optional[str] = "Correction"


class TenseTimelineProps(BaseModel):
    tense: str
    complexity: Optional[str] = "high"  # "high", "medium"


class TaskDashboardProps(BaseModel):
    title: str
    status: str  # "running", "completed", "idle"
    progress: float
    logs: Optional[List[str]] = None
    metrics: Optional[Dict[str, Any]] = None
    tasks: Optional[List[Dict[str, Any]]] = None


# --- Registry of Schemas ---

COMPONENT_SCHEMAS = {
    "FlashCardStack": FlashCardStackProps,
    "VocabGrid": VocabGridProps,
    "InteractiveDemo": InteractiveDemoProps,
    "MarkdownMessage": MarkdownMessageProps,
    "DiffCard": DiffCardProps,
    "TenseTimeline": TenseTimelineProps,
    "TaskDashboard": TaskDashboardProps,
}

# --- Validation Function ---


def validate_component_props(component_id: str, props: Dict[str, Any]) -> bool:
    """
    Validates props against the defined schema for the component.
    Returns True if valid, raises ValidationError if invalid.
    If component has no schema defined, it returns True (lenient mode).
    """
    schema = COMPONENT_SCHEMAS.get(component_id)

    if not schema:
        # Lenient fallback: If we don't know the component, assume props are fine
        # In strict mode we might want to return False or warn
        return True

    try:
        schema.model_validate(props)
        return True
    except ValidationError as e:
        # Re-raise or log. For now let's raise so caller knows *why* it failed
        raise e


def get_component_schema(component_id: str) -> Optional[Any]:
    return COMPONENT_SCHEMAS.get(component_id)
