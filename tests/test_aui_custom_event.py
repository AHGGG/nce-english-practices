"""
Test AUI Custom Event.
Verifies CustomEvent creation, serialization, and Union type compatibility.
"""
import pytest
from app.services.aui_events import (
    AUIEventType,
    CustomEvent,
    BaseAUIEvent,
)


class TestCustomEventCreation:
    """Test CustomEvent creation and field handling."""
    
    def test_basic_creation(self):
        """Test creating a basic CustomEvent."""
        event = CustomEvent(
            name="learning_milestone",
            value={"milestone": "first_story_completed"}
        )
        
        assert event.type == AUIEventType.CUSTOM
        assert event.name == "learning_milestone"
        assert event.value["milestone"] == "first_story_completed"
        assert event.id is not None
        assert event.timestamp is not None
    
    def test_with_complex_value(self):
        """Test CustomEvent with complex nested value."""
        event = CustomEvent(
            name="quiz_results",
            value={
                "score": 85,
                "correct_answers": [1, 3, 5],
                "metadata": {"difficulty": "hard"}
            }
        )
        
        assert event.name == "quiz_results"
        assert event.value["score"] == 85
        assert len(event.value["correct_answers"]) == 3
    
    def test_with_null_value(self):
        """Test CustomEvent with null value (for simple notification events)."""
        event = CustomEvent(
            name="session_started"
        )
        
        assert event.name == "session_started"
        assert event.value is None
    
    def test_with_primitive_value(self):
        """Test CustomEvent with primitive value."""
        event = CustomEvent(
            name="timer_elapsed",
            value=30  # Just an integer
        )
        
        assert event.value == 30


class TestCustomEventSerialization:
    """Test CustomEvent JSON serialization."""
    
    def test_serialization(self):
        """Test serializing CustomEvent to JSON dict."""
        event = CustomEvent(
            name="progress_update",
            value={"percent": 50}
        )
        
        data = event.model_dump()
        
        assert data["type"] == "aui_custom"
        assert data["name"] == "progress_update"
        assert data["value"]["percent"] == 50
        assert "id" in data
        assert "timestamp" in data
    
    def test_json_string_serialization(self):
        """Test serializing CustomEvent to JSON string."""
        event = CustomEvent(
            name="test",
            value={"key": "value"}
        )
        
        json_str = event.model_dump_json()
        
        assert '"type":"aui_custom"' in json_str
        assert '"name":"test"' in json_str


class TestCustomEventTypeCompatibility:
    """Test CustomEvent is recognized as valid AUIEvent."""
    
    def test_is_base_event(self):
        """CustomEvent should be instance of BaseAUIEvent."""
        event = CustomEvent(name="test")
        assert isinstance(event, BaseAUIEvent)
    
    def test_event_type_value(self):
        """Event type should serialize to correct string."""
        event = CustomEvent(name="test")
        assert event.type == "aui_custom"
