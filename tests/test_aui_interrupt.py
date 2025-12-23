import pytest
from app.services.aui_events import (
    AUIEventType,
    InterruptEvent,
    RunFinishedEvent,
    BaseAUIEvent
)

def test_interrupt_event_creation():
    """Test creating an InterruptEvent with new AG-UI aligned fields."""
    event = InterruptEvent(
        reason="human_approval",
        required_action="confirm"
    )
    
    assert event.type == AUIEventType.INTERRUPT
    assert event.reason == "human_approval"
    assert event.required_action == "confirm"
    assert event.id is not None
    assert event.timestamp is not None
    # New: interrupt_id should be auto-generated
    assert event.interrupt_id is not None
    assert event.interrupt_id.startswith("int-")

def test_interrupt_id_generation():
    """Test that interrupt_id is auto-generated and unique."""
    event1 = InterruptEvent(reason="test")
    event2 = InterruptEvent(reason="test")
    
    assert event1.interrupt_id != event2.interrupt_id
    assert event1.interrupt_id.startswith("int-")
    assert event2.interrupt_id.startswith("int-")

def test_interrupt_event_serialization():
    """Test serializing InterruptEvent to JSON with new field names."""
    event = InterruptEvent(
        reason="user_request",
        payload={"priority": "high", "action": "delete_data"}  # Renamed from metadata
    )
    
    data = event.model_dump()
    assert data["type"] == "aui_interrupt"
    assert data["reason"] == "user_request"
    assert data["payload"]["priority"] == "high"
    assert data["payload"]["action"] == "delete_data"
    assert "interrupt_id" in data
    # Old field name should not be present
    assert "metadata" not in data

def test_interrupt_event_in_union():
    """Verify InterruptEvent is recognized as a valid AUIEvent type."""
    event = InterruptEvent(reason="test")
    assert isinstance(event, BaseAUIEvent)
    assert event.type == "aui_interrupt"

def test_run_finished_with_interrupt_outcome():
    """Test RunFinishedEvent with interrupt outcome."""
    event = RunFinishedEvent(
        run_id="run-123",
        outcome="interrupt",
        interrupt={
            "id": "int-abc123",
            "reason": "human_approval",
            "payload": {"action": "confirm_delete"}
        }
    )
    
    assert event.outcome == "interrupt"
    assert event.interrupt is not None
    assert event.interrupt["reason"] == "human_approval"

def test_run_finished_default_outcome():
    """Test RunFinishedEvent default outcome is 'success'."""
    event = RunFinishedEvent(run_id="run-456")
    
    assert event.outcome == "success"
    assert event.interrupt is None
