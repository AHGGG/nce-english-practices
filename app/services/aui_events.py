"""
AUI Event System - AG-UI Compatible Events
Phase 1: Streaming Text Support with backward compatibility
"""

from enum import Enum
from typing import Any, Dict, Optional, Union, List
from pydantic import BaseModel, Field
import uuid
from datetime import datetime


class AUIEventType(str, Enum):
    """Event types for AUI streaming protocol."""
    
    # Backward compatible with existing AUIRenderPacket
    RENDER_SNAPSHOT = "aui_render_snapshot"
    
    # New streaming events (AG-UI inspired)
    TEXT_DELTA = "aui_text_delta"
    STATE_DELTA = "aui_state_delta"
    
    # Lifecycle events
    STREAM_START = "aui_stream_start"
    STREAM_END = "aui_stream_end"
    ERROR = "aui_error"


class BaseAUIEvent(BaseModel):
    """Base class for all AUI events."""
    type: AUIEventType
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    
    class Config:
        use_enum_values = True


# --- Specific Event Types ---

class RenderSnapshotEvent(BaseAUIEvent):
    """
    Backward compatible with AUIRenderPacket.
    Sends a complete UI component specification.
    """
    type: AUIEventType = AUIEventType.RENDER_SNAPSHOT
    intention: str  # e.g. "show_vocabulary"
    ui: Dict[str, Any]  # AUIComponent as dict
    fallback_text: str
    target_level: Optional[int] = None  # i+1 Scaffolding


class TextDeltaEvent(BaseAUIEvent):
    """
    Streaming text update event.
    Frontend accumulates deltas to build complete message.
    """
    type: AUIEventType = AUIEventType.TEXT_DELTA
    message_id: str  # Links to parent message/component
    delta: str  # Text chunk to append
    field_path: str = "content"  # Which field to update (e.g. "story.content")



class StateDeltaEvent(BaseAUIEvent):
    """
    JSON Patch based state update.
    Uses RFC 6902 format to describe changes.
    """
    type: AUIEventType = AUIEventType.STATE_DELTA
    delta: List[Dict[str, Any]]  # JSON Patch operations


class StreamStartEvent(BaseAUIEvent):
    """Signals start of event stream."""
    type: AUIEventType = AUIEventType.STREAM_START
    session_id: str
    metadata: Optional[Dict[str, Any]] = None


class StreamEndEvent(BaseAUIEvent):
    """Signals end of event stream."""
    type: AUIEventType = AUIEventType.STREAM_END
    session_id: str


class ErrorEvent(BaseAUIEvent):
    """Error event."""
    type: AUIEventType = AUIEventType.ERROR
    error_code: str
    message: str
    details: Optional[Dict[str, Any]] = None


# Union type for all events
AUIEvent = Union[
    RenderSnapshotEvent,
    TextDeltaEvent,
    StateDeltaEvent,
    StreamStartEvent,
    StreamEndEvent,
    ErrorEvent,
]


# --- Utility Functions ---

def create_snapshot_event(
    intention: str,
    ui: Dict[str, Any],
    fallback_text: str,
    target_level: Optional[int] = None
) -> RenderSnapshotEvent:
    """Helper to create a snapshot event (backward compatible)."""
    return RenderSnapshotEvent(
        intention=intention,
        ui=ui,
        fallback_text=fallback_text,
        target_level=target_level
    )


def create_text_delta(
    message_id: str,
    delta: str,
    field_path: str = "content"
) -> TextDeltaEvent:
    """Helper to create a text delta event."""
    return TextDeltaEvent(
        message_id=message_id,
        delta=delta,
        field_path=field_path
    )


def create_state_diff(old_state: Dict[str, Any], new_state: Dict[str, Any]) -> StateDeltaEvent:
    """
    Helper to create a state delta using jsonpatch.
    Computes the difference between old_state and new_state.
    """
    import jsonpatch
    
    # Calculate patch (list of ops)
    patch = jsonpatch.make_patch(old_state, new_state)
    
    return StateDeltaEvent(
        delta=patch.patch
    )
