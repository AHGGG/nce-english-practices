"""
AUI Event System - AG-UI Compatible Events
Supports: Streaming Text, State Sync, Activity Progress, Tool Calls, Run Lifecycle
"""

from enum import Enum
from typing import Any, Dict, Optional, Union, List
from pydantic import BaseModel, Field, ConfigDict
import uuid
from datetime import datetime


class AUIEventType(str, Enum):
    """Event types for AUI streaming protocol."""
    
    # Backward compatible with existing AUIRenderPacket
    RENDER_SNAPSHOT = "aui_render_snapshot"
    
    # Streaming events (AG-UI inspired)
    TEXT_MESSAGE_START = "aui_text_message_start"  # Message lifecycle start
    TEXT_DELTA = "aui_text_delta"
    TEXT_MESSAGE_END = "aui_text_message_end"  # Message lifecycle end
    STATE_SNAPSHOT = "aui_state_snapshot"  # Complete state for recovery
    STATE_DELTA = "aui_state_delta"
    
    # Message History
    MESSAGES_SNAPSHOT = "aui_messages_snapshot"
    
    # Activity Progress Events
    ACTIVITY_SNAPSHOT = "aui_activity_snapshot"
    ACTIVITY_DELTA = "aui_activity_delta"
    
    # Tool Call Events
    TOOL_CALL_START = "aui_tool_call_start"
    TOOL_CALL_ARGS = "aui_tool_call_args"
    TOOL_CALL_END = "aui_tool_call_end"
    TOOL_CALL_RESULT = "aui_tool_call_result"
    
    # Run Lifecycle Events
    RUN_STARTED = "aui_run_started"
    RUN_FINISHED = "aui_run_finished"
    RUN_ERROR = "aui_run_error"
    
    # Stream Lifecycle events
    STREAM_START = "aui_stream_start"
    STREAM_END = "aui_stream_end"
    ERROR = "aui_error"
    
    # Control Flow Events
    INTERRUPT = "aui_interrupt"


class BaseAUIEvent(BaseModel):
    """Base class for all AUI events."""
    model_config = ConfigDict(use_enum_values=True)
    
    type: AUIEventType
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


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


class TextMessageStartEvent(BaseAUIEvent):
    """
    Signals the start of a text message stream.
    Allows frontend to distinguish multiple concurrent text streams.
    """
    type: AUIEventType = AUIEventType.TEXT_MESSAGE_START
    message_id: str  # Unique identifier for this message
    role: str = "assistant"  # "assistant", "system", "user"
    metadata: Optional[Dict[str, Any]] = None  # Additional message metadata


class TextDeltaEvent(BaseAUIEvent):
    """
    Streaming text update event.
    Frontend accumulates deltas to build complete message.
    """
    type: AUIEventType = AUIEventType.TEXT_DELTA
    message_id: str  # Links to parent message/component
    delta: str  # Text chunk to append
    field_path: str = "content"  # Which field to update (e.g. "story.content")


class TextMessageEndEvent(BaseAUIEvent):
    """
    Signals the end of a text message stream.
    Marks message as complete and no longer streaming.
    """
    type: AUIEventType = AUIEventType.TEXT_MESSAGE_END
    message_id: str  # Links to message started earlier
    final_content: Optional[str] = None  # Optional complete message content



class StateSnapshotEvent(BaseAUIEvent):
    """
    Complete state snapshot for recovery/initialization.
    Frontend uses this to set initial state before applying deltas.
    """
    type: AUIEventType = AUIEventType.STATE_SNAPSHOT
    state: Dict[str, Any]  # Complete component state


class MessagesSnapshotEvent(BaseAUIEvent):
    """
    Snapshot of message history.
    Used to sync conversation history when joining a session.
    """
    type: AUIEventType = AUIEventType.MESSAGES_SNAPSHOT
    messages: List[Dict[str, Any]]  # List of message objects


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


class InterruptEvent(BaseAUIEvent):
    """
    Signals an interruption in the flow, requiring user attention or input.
    Can be used to explicitly pause the agent or request specific user action.
    """
    type: AUIEventType = AUIEventType.INTERRUPT
    reason: str  # e.g. "wait_for_input", "user_request"
    required_action: Optional[str] = None # e.g. "confirm", "select_option"
    metadata: Optional[Dict[str, Any]] = None


# --- Activity Progress Events ---

class ActivitySnapshotEvent(BaseAUIEvent):
    """
    Complete activity state snapshot.
    Shows current state of a long-running task.
    """
    type: AUIEventType = AUIEventType.ACTIVITY_SNAPSHOT
    activity_id: str
    name: str  # Activity name (e.g. "Generating story")
    status: str  # "running", "completed", "failed"
    progress: float = 0.0  # 0.0 to 1.0
    current_step: Optional[str] = None  # e.g. "Step 2/5: Processing vocabulary"
    metadata: Optional[Dict[str, Any]] = None


class ActivityDeltaEvent(BaseAUIEvent):
    """
    Incremental activity update using JSON Patch.
    Updates specific fields of an activity.
    """
    type: AUIEventType = AUIEventType.ACTIVITY_DELTA
    activity_id: str
    delta: List[Dict[str, Any]]  # JSON Patch operations


# --- Tool Call Events ---

class ToolCallStartEvent(BaseAUIEvent):
    """
    Signals start of a tool/function call.
    """
    type: AUIEventType = AUIEventType.TOOL_CALL_START
    tool_call_id: str
    tool_name: str
    description: Optional[str] = None


class ToolCallArgsEvent(BaseAUIEvent):
    """
    Streaming tool arguments (for large/complex args).
    Can send multiple events to build complete args incrementally.
    """
    type: AUIEventType = AUIEventType.TOOL_CALL_ARGS
    tool_call_id: str
    args_delta: Dict[str, Any]  # Partial arguments


class ToolCallEndEvent(BaseAUIEvent):
    """
    Signals tool call execution has finished.
    """
    type: AUIEventType = AUIEventType.TOOL_CALL_END
    tool_call_id: str
    status: str  # "success", "error"
    duration_ms: Optional[float] = None


class ToolCallResultEvent(BaseAUIEvent):
    """
    Tool call result data.
    """
    type: AUIEventType = AUIEventType.TOOL_CALL_RESULT
    tool_call_id: str
    result: Any  # Tool execution result
    error: Optional[str] = None


# --- Run Lifecycle Events ---

class RunStartedEvent(BaseAUIEvent):
    """
    Signals an agent run has started.
    """
    type: AUIEventType = AUIEventType.RUN_STARTED
    run_id: str
    agent_type: Optional[str] = None  # e.g. "coach", "story_generator"
    task_description: Optional[str] = None


class RunFinishedEvent(BaseAUIEvent):
    """
    Signals an agent run has completed successfully.
    """
    type: AUIEventType = AUIEventType.RUN_FINISHED
    run_id: str
    outcome: Optional[str] = None  # Summary of what was accomplished
    duration_ms: Optional[float] = None


class RunErrorEvent(BaseAUIEvent):
    """
    Signals an agent run has failed.
    """
    type: AUIEventType = AUIEventType.RUN_ERROR
    run_id: str
    error_message: str
    error_code: Optional[str] = None
    traceback: Optional[str] = None


# Union type for all events
AUIEvent = Union[
    RenderSnapshotEvent,
    TextMessageStartEvent,
    TextDeltaEvent,
    TextMessageEndEvent,
    StateSnapshotEvent,
    StateDeltaEvent,
    MessagesSnapshotEvent,
    ActivitySnapshotEvent,
    ActivityDeltaEvent,
    ToolCallStartEvent,
    ToolCallArgsEvent,
    ToolCallEndEvent,
    ToolCallResultEvent,
    RunStartedEvent,
    RunFinishedEvent,
    RunErrorEvent,
    StreamStartEvent,
    StreamEndEvent,
    ErrorEvent,
    InterruptEvent,
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


def create_activity_delta(
    activity_id: str,
    old_state: Dict[str, Any],
    new_state: Dict[str, Any]
) -> ActivityDeltaEvent:
    """
    Helper to create an activity delta using jsonpatch.
    """
    import jsonpatch
    
    patch = jsonpatch.make_patch(old_state, new_state)
    
    return ActivityDeltaEvent(
        activity_id=activity_id,
        delta=patch.patch
    )
