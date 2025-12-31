"""
Unit tests for AUI STATE_SNAPSHOT event type.
Tests event creation, serialization, and streaming workflow.
"""

import pytest
import asyncio
from app.services.aui_events import (
    AUIEventType,
    StateSnapshotEvent,
    StateDeltaEvent,
)
from app.services.aui import aui_streaming_service


class TestStateSnapshotEventCreation:
    """Test StateSnapshotEvent class instantiation."""
    
    def test_state_snapshot_event_creation(self):
        """Event can be created with state dict."""
        state = {
            "component": "StoryReader",
            "props": {"story": {"title": "Test", "content": "Hello"}},
            "intention": "present_story",
            "target_level": 1
        }
        
        event = StateSnapshotEvent(state=state)
        
        assert event.type == AUIEventType.STATE_SNAPSHOT
        assert event.state == state
        assert event.id is not None
        assert event.timestamp is not None
    
    def test_state_snapshot_with_nested_props(self):
        """Supports deeply nested state objects."""
        state = {
            "component": "VocabGrid",
            "props": {
                "words": [
                    {"word": "apple", "definition": "A fruit"},
                    {"word": "book", "definition": "A publication"}
                ],
                "settings": {
                    "showTranslation": True,
                    "theme": {"primary": "#00FF94"}
                }
            },
            "intention": "show_vocabulary",
            "target_level": 2
        }
        
        event = StateSnapshotEvent(state=state)
        
        assert event.state["props"]["words"][0]["word"] == "apple"
        assert event.state["props"]["settings"]["theme"]["primary"] == "#00FF94"


class TestStateSnapshotSerialization:
    """Test JSON serialization of StateSnapshotEvent."""
    
    def test_serialization_format(self):
        """Event serializes to expected JSON format."""
        state = {
            "component": "StoryReader",
            "props": {"story": {"title": "Test", "content": ""}},
            "intention": "present_story",
            "target_level": 1
        }
        
        event = StateSnapshotEvent(state=state)
        json_data = event.model_dump()
        
        assert json_data["type"] == "aui_state_snapshot"
        assert "state" in json_data
        assert json_data["state"]["component"] == "StoryReader"
    
    def test_json_string_output(self):
        """Event can be serialized to JSON string."""
        state = {"component": "Test", "props": {}, "intention": "test"}
        event = StateSnapshotEvent(state=state)
        
        json_str = event.model_dump_json()
        
        assert '"type":"aui_state_snapshot"' in json_str
        assert '"state":' in json_str


class TestStreamWithStateSnapshot:
    """Test stream_with_state_snapshot() method."""
    
    @pytest.mark.asyncio
    async def test_stream_generates_events(self):
        """Stream generates STATE_SNAPSHOT followed by STATE_DELTAs."""
        events = []
        
        async for event in aui_streaming_service.stream_with_state_snapshot(
            initial_title="Test Story",
            user_level=1
        ):
            events.append(event)
        
        # Should have: stream_start, state_snapshot, multiple state_deltas, stream_end
        assert len(events) >= 5
        
        # Check event types in order
        event_types = [e.type for e in events]
        
        assert event_types[0] == AUIEventType.STREAM_START
        assert event_types[1] == AUIEventType.STATE_SNAPSHOT
        assert event_types[-1] == AUIEventType.STREAM_END
        
        # State deltas in between
        delta_count = sum(1 for t in event_types if t == AUIEventType.STATE_DELTA)
        assert delta_count >= 4  # At least 4 content parts + 1 title update
    
    @pytest.mark.asyncio
    async def test_initial_snapshot_structure(self):
        """Initial snapshot contains complete state."""
        snapshot_event = None
        
        async for event in aui_streaming_service.stream_with_state_snapshot(
            initial_title="My Title",
            user_level=2
        ):
            if event.type == AUIEventType.STATE_SNAPSHOT:
                snapshot_event = event
                break
        
        assert snapshot_event is not None
        assert snapshot_event.state["component"] == "StoryReader"
        assert snapshot_event.state["props"]["story"]["title"] == "My Title"
        assert snapshot_event.state["target_level"] == 2
    
    @pytest.mark.asyncio
    async def test_deltas_update_content(self):
        """State deltas progressively update content."""
        events = []
        
        async for event in aui_streaming_service.stream_with_state_snapshot():
            events.append(event)
        
        # Find all state deltas
        deltas = [e for e in events if e.type == AUIEventType.STATE_DELTA]
        
        for delta in deltas:
            assert "delta" in delta.model_dump()
            assert isinstance(delta.delta, list)
            # Each delta should have at least one patch operation
            assert len(delta.delta) >= 1
