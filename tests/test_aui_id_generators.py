"""
Test AUI ID Generator Functions.
Verifies semantic prefixes and uniqueness.
"""
import pytest
from app.services.aui_events import (
    generate_message_id,
    generate_run_id,
    generate_thread_id,
    generate_tool_call_id,
    generate_activity_id,
)


class TestIDGenerators:
    """Test ID generator functions with semantic prefixes."""
    
    def test_message_id_prefix(self):
        """Message ID should have 'msg-' prefix."""
        msg_id = generate_message_id()
        assert msg_id.startswith("msg-")
        assert len(msg_id) > 4  # Has UUID after prefix
    
    def test_run_id_prefix(self):
        """Run ID should have 'run-' prefix."""
        run_id = generate_run_id()
        assert run_id.startswith("run-")
        assert len(run_id) > 4
    
    def test_thread_id_prefix(self):
        """Thread ID should have 'thread-' prefix."""
        thread_id = generate_thread_id()
        assert thread_id.startswith("thread-")
        assert len(thread_id) > 7
    
    def test_tool_call_id_prefix(self):
        """Tool call ID should have 'tool-' prefix."""
        tool_id = generate_tool_call_id()
        assert tool_id.startswith("tool-")
        assert len(tool_id) > 5
    
    def test_activity_id_prefix(self):
        """Activity ID should have 'act-' prefix."""
        act_id = generate_activity_id()
        assert act_id.startswith("act-")
        assert len(act_id) > 4


class TestIDUniqueness:
    """Test that generated IDs are unique."""
    
    def test_message_ids_unique(self):
        """Each call should generate a unique message ID."""
        ids = [generate_message_id() for _ in range(100)]
        assert len(set(ids)) == 100
    
    def test_run_ids_unique(self):
        """Each call should generate a unique run ID."""
        ids = [generate_run_id() for _ in range(100)]
        assert len(set(ids)) == 100
    
    def test_thread_ids_unique(self):
        """Each call should generate a unique thread ID."""
        ids = [generate_thread_id() for _ in range(100)]
        assert len(set(ids)) == 100
    
    def test_tool_call_ids_unique(self):
        """Each call should generate a unique tool call ID."""
        ids = [generate_tool_call_id() for _ in range(100)]
        assert len(set(ids)) == 100
    
    def test_activity_ids_unique(self):
        """Each call should generate a unique activity ID."""
        ids = [generate_activity_id() for _ in range(100)]
        assert len(set(ids)) == 100
