"""
Unit tests for TEXT_MESSAGE lifecycle events
Tests the complete lifecycle: START -> DELTA -> END
"""

import pytest
from app.services.aui_events import (
    TextMessageStartEvent,
    TextDeltaEvent,
    TextMessageEndEvent,
    AUIEventType
)


def test_text_message_start_event_creation():
    """Test TEXT_MESSAGE_START event creation"""
    event = TextMessageStartEvent(
        message_id="test-msg-001",
        role="assistant",
        metadata={"type": "story", "title": "Test Story"}
    )
    
    assert event.type == AUIEventType.TEXT_MESSAGE_START
    assert event.message_id == "test-msg-001"
    assert event.role == "assistant"
    assert event.metadata["type"] == "story"
    assert event.metadata["title"] == "Test Story"
    assert event.id is not None  # Auto-generated UUID
    assert event.timestamp is not None  # Auto-generated timestamp


def test_text_message_end_event_creation():
    """Test TEXT_MESSAGE_END event creation"""
    event = TextMessageEndEvent(
        message_id="test-msg-001",
        final_content="Once upon a time..."
    )
    
    assert event.type == AUIEventType.TEXT_MESSAGE_END
    assert event.message_id == "test-msg-001"
    assert event.final_content == "Once upon a time..."


def test_text_delta_has_message_id():
    """Verify TEXT_DELTA event includes message_id"""
    event = TextDeltaEvent(
        message_id="test-msg-001",
        delta="Hello ",
        field_path="content"
    )
    
    assert event.message_id == "test-msg-001"
    assert event.delta == "Hello "
    assert event.field_path == "content"


@pytest.mark.asyncio
async def test_concurrent_messages_stream():  
    """Test stream_concurrent_messages generates correct event sequence"""
    from app.services.aui_streaming import aui_streaming_service
    
    events = []
    async for event in aui_streaming_service.stream_concurrent_messages():
        events.append(event)
    
    # Verify we have all expected event types
    event_types = [e.type for e in events]
    
    assert AUIEventType.STREAM_START in event_types
    assert AUIEventType.TEXT_MESSAGE_START in event_types
    assert AUIEventType.TEXT_DELTA in event_types
    assert AUIEventType.TEXT_MESSAGE_END in event_types
    assert AUIEventType.STREAM_END in event_types
    
    # Count START and END events (should have 2 of each for 2 messages)
    start_count = sum(1 for e in events if e.type == AUIEventType.TEXT_MESSAGE_START)
    end_count = sum(1 for e in events if e.type == AUIEventType.TEXT_MESSAGE_END)
    
    assert start_count == 2, "Should start 2 messages"
    assert end_count == 2, "Should end 2 messages"


@pytest.mark.asyncio
async def test_message_lifecycle_order():
    """Verify events come in correct order for each message"""
    from app.services.aui_streaming import aui_streaming_service
    
    events = []
    async for event in aui_streaming_service.stream_concurrent_messages():
        events.append(event)
    
    # Find all unique message IDs
    message_ids = set()
    for event in events:
        if hasattr(event, 'message_id'):
            message_ids.add(event.message_id)
    
    # For each message, verify lifecycle order
    for msg_id in message_ids:
        msg_events = [e for e in events if hasattr(e, 'message_id') and e.message_id == msg_id]
        
        # First event for this message should be START
        assert msg_events[0].type == AUIEventType.TEXT_MESSAGE_START, \
            f"Message {msg_id} should start with TEXT_MESSAGE_START"
        
        # Last event for this message should be END
        assert msg_events[-1].type == AUIEventType.TEXT_MESSAGE_END, \
            f"Message {msg_id} should end with TEXT_MESSAGE_END"
        
        # Middle events should be DELTA
        for event in msg_events[1:-1]:
            assert event.type == AUIEventType.TEXT_DELTA, \
                f"Events between START and END should be TEXT_DELTA"


@pytest.mark.asyncio
async def test_multiple_messages_distinct_ids():
    """Ensure different messages have different IDs"""
    from app.services.aui_streaming import aui_streaming_service
    
    message_ids = set()
    
    async for event in aui_streaming_service.stream_concurrent_messages():
        if isinstance(event, TextMessageStartEvent):
            message_ids.add(event.message_id)
    
    # Should have 2 distinct message IDs
    assert len(message_ids) == 2, "Should have 2 distinct concurrent messages"
    
    # IDs should be non-empty
    for msg_id in message_ids:
        assert msg_id and len(msg_id) > 0


def test_text_message_start_serialization():
    """Test event serialization to JSON"""
    event = TextMessageStartEvent(
        message_id="test-msg-001",
        role="assistant",
        metadata={"type": "story"}
    )
    
    json_dict = event.model_dump()
    
    assert json_dict["type"] == "aui_text_message_start"
    assert json_dict["message_id"] == "test-msg-001"
    assert json_dict["role"] == "assistant"
    assert "metadata" in json_dict


def test_text_message_end_optional_content():
    """Test TEXT_MESSAGE_END with and without final_content"""
    # Without final_content
    event1 = TextMessageEndEvent(message_id="msg-1")
    assert event1.final_content is None
    
    # With final_content
    event2 = TextMessageEndEvent(
        message_id="msg-2",
        final_content="Complete message"
    )
    assert event2.final_content == "Complete message"
