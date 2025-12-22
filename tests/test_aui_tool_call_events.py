import pytest
from app.services.aui_events import (
    ToolCallStartEvent,
    ToolCallArgsEvent,
    ToolCallEndEvent,
    ToolCallResultEvent,
    AUIEventType,
)


def test_tool_call_start_event():
    """Test creating a tool call start event"""
    event = ToolCallStartEvent(
        tool_call_id="tool_123",
        tool_name="search_database",
        description="Searching for vocabulary words"
    )
    
    assert event.type == AUIEventType.TOOL_CALL_START
    assert event.tool_call_id == "tool_123"
    assert event.tool_name == "search_database"
    assert event.description == "Searching for vocabulary words"
    assert event.id is not None
    assert event.timestamp is not None


def test_tool_call_args_event():
    """Test streaming tool arguments"""
    event = ToolCallArgsEvent(
        tool_call_id="tool_123",
        args_delta={"query": "apple", "limit": 10}
    )
    
    assert event.type == AUIEventType.TOOL_CALL_ARGS
    assert event.tool_call_id == "tool_123"
    assert event.args_delta["query"] == "apple"
    assert event.args_delta["limit"] == 10


def test_tool_call_end_event():
    """Test tool call end event"""
    event = ToolCallEndEvent(
        tool_call_id="tool_123",
        status="success",
        duration_ms=150.5
    )
    
    assert event.type == AUIEventType.TOOL_CALL_END
    assert event.tool_call_id == "tool_123"
    assert event.status == "success"
    assert event.duration_ms == 150.5


def test_tool_call_result_event_success():
    """Test tool call result for successful execution"""
    event = ToolCallResultEvent(
        tool_call_id="tool_123",
        result={"words": ["apple", "banana", "cherry"], "count": 3}
    )
    
    assert event.type == AUIEventType.TOOL_CALL_RESULT
    assert event.tool_call_id == "tool_123"
    assert event.result["count"] == 3
    assert len(event.result["words"]) == 3
    assert event.error is None


def test_tool_call_result_event_error():
    """Test tool call result for failed execution"""
    event = ToolCallResultEvent(
        tool_call_id="tool_456",
        result=None,
        error="Database connection timeout"
    )
    
    assert event.type == AUIEventType.TOOL_CALL_RESULT
    assert event.tool_call_id == "tool_456"
    assert event.result is None
    assert event.error == "Database connection timeout"


def test_complete_tool_call_sequence():
    """Test a complete tool call event sequence"""
    tool_id = "tool_search_001"
    
    # 1. Start
    start_event = ToolCallStartEvent(
        tool_call_id=tool_id,
        tool_name="vocabulary_lookup",
        description="Looking up word definitions"
    )
    
    # 2. Args (could be multiple if streaming)
    args_event = ToolCallArgsEvent(
        tool_call_id=tool_id,
        args_delta={"word": "serendipity", "include_examples": True}
    )
    
    # 3. End
    end_event = ToolCallEndEvent(
        tool_call_id=tool_id,
        status="success",
        duration_ms=234.7
    )
    
    # 4. Result
    result_event = ToolCallResultEvent(
        tool_call_id=tool_id,
        result={
            "definition": "The occurrence of events by chance in a happy way",
            "examples": ["Their meeting was pure serendipity"]
        }
    )
    
    # Verify all events have same tool_call_id
    assert start_event.tool_call_id == tool_id
    assert args_event.tool_call_id == tool_id
    assert end_event.tool_call_id == tool_id
    assert result_event.tool_call_id == tool_id
    
    # Verify event types
    assert start_event.type == AUIEventType.TOOL_CALL_START
    assert args_event.type == AUIEventType.TOOL_CALL_ARGS
    assert end_event.type == AUIEventType.TOOL_CALL_END
    assert result_event.type == AUIEventType.TOOL_CALL_RESULT


def test_tool_call_serialization():
    """Test that tool call events can be serialized"""
    event = ToolCallStartEvent(
        tool_call_id="tool_999",
        tool_name="generate_story"
    )
    
    json_str = event.model_dump_json()
    assert "tool_999" in json_str
    assert "generate_story" in json_str
    
    data = event.model_dump()
    assert data["type"] == "aui_tool_call_start"
    assert data["tool_call_id"] == "tool_999"


def test_multiple_args_events():
    """Test streaming large args through multiple events"""
    tool_id = "tool_large_args"
    
    # Simulate streaming large JSON args in chunks
    args_1 = ToolCallArgsEvent(
        tool_call_id=tool_id,
        args_delta={"words": ["apple", "banana"]}
    )
    
    args_2 = ToolCallArgsEvent(
        tool_call_id=tool_id,
        args_delta={"words": ["cherry", "date"]}
    )
    
    args_3 = ToolCallArgsEvent(
        tool_call_id=tool_id,
        args_delta={"limit": 100, "sort": "alphabetical"}
    )
    
    # All should have same ID
    assert args_1.tool_call_id == args_2.tool_call_id == args_3.tool_call_id
    
    # Could be accumulated on frontend
    accumulated = {}
    for event in [args_1, args_2, args_3]:
        accumulated.update(event.args_delta)
    
    # Note: This simple merge won't handle list properly in real scenario
    # Frontend would need smarter merging logic
    assert "limit" in accumulated
    assert "sort" in accumulated


def test_tool_call_complex_result():
    """Test tool call with complex nested result"""
    event = ToolCallResultEvent(
        tool_call_id="tool_complex",
        result={
            "status": "success",
            "data": {
                "words": [
                    {"word": "apple", "definition": "A fruit", "level": 1},
                    {"word": "serendipity", "definition": "Happy accident", "level": 3}
                ],
                "metadata": {
                    "source": "oxford",
                    "timestamp": "2024-12-22T10:00:00Z"
                }
            }
        }
    )
    
    assert event.result["status"] == "success"
    assert len(event.result["data"]["words"]) == 2
    assert event.result["data"]["metadata"]["source"] == "oxford"
