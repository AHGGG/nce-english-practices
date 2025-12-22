"""
Tests for incremental vocabulary streaming using STATE_DELTA events.
Verifies that stream_vocabulary_cards() generates proper JSON Patch operations.
"""

import pytest
from app.services.aui_streaming import aui_streaming_service
from app.services.aui_events import AUIEventType


@pytest.mark.asyncio
async def test_vocabulary_stream_generates_state_deltas():
    """Verify that vocabulary streaming generates STATE_DELTA events for each word."""
    words = ["apple", "banana", "cherry"]
    
    events = []
    async for event in aui_streaming_service.stream_vocabulary_cards(
        words=words,
        user_level=1,
        delay_per_card=0.01  # Fast for testing
    ):
        events.append(event)
    
    # Filter STATE_DELTA events
    delta_events = [e for e in events if e.type == AUIEventType.STATE_DELTA]
    
    # Should have one delta per word
    assert len(delta_events) == len(words), f"Expected {len(words)} STATE_DELTA events, got {len(delta_events)}"


@pytest.mark.asyncio
async def test_vocabulary_delta_uses_add_operation():
    """Verify that each STATE_DELTA uses 'add' operation with correct path."""
    words = ["test"]
    
    events = []
    async for event in aui_streaming_service.stream_vocabulary_cards(
        words=words,
        user_level=1,
        delay_per_card=0.01
    ):
        events.append(event)
    
    delta_events = [e for e in events if e.type == AUIEventType.STATE_DELTA]
    
    assert len(delta_events) >= 1
    first_delta = delta_events[0]
    
    # Check patch structure
    assert len(first_delta.delta) == 1
    patch_op = first_delta.delta[0]
    
    assert patch_op["op"] == "add", f"Expected 'add' operation, got '{patch_op['op']}'"
    assert patch_op["path"] == "/props/words/-", f"Expected '/props/words/-' path, got '{patch_op['path']}'"


@pytest.mark.asyncio
async def test_vocabulary_delta_value_structure():
    """Verify that the added word value has correct structure."""
    words = ["example"]
    
    events = []
    async for event in aui_streaming_service.stream_vocabulary_cards(
        words=words,
        user_level=1,
        delay_per_card=0.01
    ):
        events.append(event)
    
    delta_events = [e for e in events if e.type == AUIEventType.STATE_DELTA]
    
    assert len(delta_events) >= 1
    patch_op = delta_events[0].delta[0]
    
    # Value should be a dict with 'word' and 'definition'
    value = patch_op["value"]
    assert isinstance(value, dict), f"Expected dict value, got {type(value)}"
    assert "word" in value, "Missing 'word' field in value"
    assert "definition" in value, "Missing 'definition' field in value"
    assert value["word"] == "example"


@pytest.mark.asyncio
async def test_vocabulary_stream_lifecycle():
    """Verify complete stream lifecycle: START -> SNAPSHOT -> DELTAs -> END."""
    words = ["a", "b"]
    
    events = []
    async for event in aui_streaming_service.stream_vocabulary_cards(
        words=words,
        user_level=1,
        delay_per_card=0.01
    ):
        events.append(event)
    
    # Check event order
    event_types = [e.type for e in events]
    
    assert event_types[0] == AUIEventType.STREAM_START
    assert event_types[1] == AUIEventType.RENDER_SNAPSHOT
    assert event_types[-1] == AUIEventType.STREAM_END
    
    # Middle should have STATE_DELTAs
    middle_types = event_types[2:-1]
    assert all(t == AUIEventType.STATE_DELTA for t in middle_types)


@pytest.mark.asyncio
async def test_vocabulary_stream_user_level_component_selection():
    """Verify component selection based on user level."""
    # Level 1 should use FlashCardStack
    events_level1 = []
    async for event in aui_streaming_service.stream_vocabulary_cards(
        words=["test"],
        user_level=1,
        delay_per_card=0.01
    ):
        events_level1.append(event)
    
    snapshot_l1 = [e for e in events_level1 if e.type == AUIEventType.RENDER_SNAPSHOT][0]
    assert snapshot_l1.ui["component"] == "FlashCardStack"
    
    # Level 2+ should use VocabGrid
    events_level2 = []
    async for event in aui_streaming_service.stream_vocabulary_cards(
        words=["test"],
        user_level=2,
        delay_per_card=0.01
    ):
        events_level2.append(event)
    
    snapshot_l2 = [e for e in events_level2 if e.type == AUIEventType.RENDER_SNAPSHOT][0]
    assert snapshot_l2.ui["component"] == "VocabGrid"
