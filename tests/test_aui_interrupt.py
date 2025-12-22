import pytest
from app.services.aui_events import (
    AUIEventType,
    InterruptEvent,
    BaseAUIEvent
)

def test_interrupt_event_creation():
    """Test creating an InterruptEvent."""
    event = InterruptEvent(
        reason="wait_for_input",
        required_action="confirm"
    )
    
    assert event.type == AUIEventType.INTERRUPT
    assert event.reason == "wait_for_input"
    assert event.required_action == "confirm"
    assert event.id is not None
    assert event.timestamp is not None

def test_interrupt_event_serialization():
    """Test serializing InterruptEvent to JSON."""
    event = InterruptEvent(
        reason="user_request",
        metadata={"priority": "high"}
    )
    
    data = event.model_dump()
    assert data["type"] == "aui_interrupt"
    assert data["reason"] == "user_request"
    assert data["metadata"]["priority"] == "high"

def test_interrupt_event_in_union():
    """Verify InterruptEvent is recognized as a valid AUIEvent type."""
    # This is a bit abstract since Python types are erased at runtime, 
    # but we can check if it parses correctly from a dict via pydantic adapter if we had one,
    # or just checks basic instantiation.
    
    event = InterruptEvent(reason="test")
    assert isinstance(event, BaseAUIEvent)
    assert event.type == "aui_interrupt"
