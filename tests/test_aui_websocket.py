"""
Test AUI WebSocket Endpoint

Tests WebSocket transport layer for AUI streaming system.
"""

from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.main import app


class TestAUIWebSocketEndpoint:
    """Test the AUI WebSocket streaming endpoint."""

    def test_websocket_ping(self):
        """Test WebSocket ping/pong health check."""
        client = TestClient(app)

        with client.websocket_connect("/api/aui/ws/ping") as websocket:
            data = websocket.receive_json()
            assert data["type"] == "pong"
            assert "message" in data

    def test_websocket_story_stream(self):
        """Test story streaming via WebSocket."""
        client = TestClient(app)

        with client.websocket_connect("/api/aui/ws/story") as websocket:
            # Collect events
            events = []
            while True:
                try:
                    data = websocket.receive_json()
                    events.append(data)

                    # Stop after stream end
                    if data.get("type") == "aui_stream_end":
                        break
                except WebSocketDisconnect:
                    break

            # Verify event sequence
            assert len(events) > 0

            # Should start with stream_start
            event_types = [e["type"] for e in events]
            assert "aui_stream_start" in event_types
            assert "aui_stream_end" in event_types

    def test_websocket_activity_stream(self):
        """Test activity progress streaming via WebSocket."""
        client = TestClient(app)

        with client.websocket_connect("/api/aui/ws/activity") as websocket:
            events = []
            while True:
                try:
                    data = websocket.receive_json()
                    events.append(data)

                    if data.get("type") == "aui_stream_end":
                        break
                except WebSocketDisconnect:
                    break

            event_types = [e["type"] for e in events]

            # Should include activity events
            assert (
                "aui_activity_snapshot" in event_types
                or "aui_activity_delta" in event_types
            )

    def test_websocket_tool_call_stream(self):
        """Test tool call lifecycle via WebSocket."""
        client = TestClient(app)

        with client.websocket_connect("/api/aui/ws/tool-call") as websocket:
            events = []
            while True:
                try:
                    data = websocket.receive_json()
                    events.append(data)

                    if data.get("type") == "aui_stream_end":
                        break
                except WebSocketDisconnect:
                    break

            event_types = [e["type"] for e in events]

            # Should include tool call events
            assert "aui_tool_call_start" in event_types
            assert "aui_tool_call_end" in event_types

    def test_websocket_agent_run_stream(self):
        """Test agent run lifecycle via WebSocket."""
        client = TestClient(app)

        with client.websocket_connect("/api/aui/ws/agent-run") as websocket:
            events = []
            while True:
                try:
                    data = websocket.receive_json()
                    events.append(data)

                    if data.get("type") == "aui_stream_end":
                        break
                except WebSocketDisconnect:
                    break

            event_types = [e["type"] for e in events]

            # Should include run events
            assert "aui_run_started" in event_types
            assert "aui_run_finished" in event_types

    def test_websocket_multi_messages_stream(self):
        """Test concurrent messages via WebSocket."""
        client = TestClient(app)

        with client.websocket_connect("/api/aui/ws/multi-messages") as websocket:
            events = []
            while True:
                try:
                    data = websocket.receive_json()
                    events.append(data)

                    if data.get("type") == "aui_stream_end":
                        break
                except WebSocketDisconnect:
                    break

            event_types = [e["type"] for e in events]

            # Should include message lifecycle events
            assert "aui_text_message_start" in event_types
            assert "aui_text_message_end" in event_types

    def test_websocket_invalid_stream_type(self):
        """Test invalid stream type returns error."""
        client = TestClient(app)

        with client.websocket_connect("/api/aui/ws/invalid-type") as websocket:
            data = websocket.receive_json()

            assert data["type"] == "aui_error"
            assert data["error_code"] == "INVALID_STREAM_TYPE"

    def test_websocket_with_params(self):
        """Test WebSocket with initial params message."""
        client = TestClient(app)

        with client.websocket_connect("/api/aui/ws/vocabulary") as websocket:
            # Send params (optional)
            websocket.send_json(
                {
                    "type": "params",
                    "data": {"words": ["test", "example"], "user_level": 2},
                }
            )

            # Collect some events
            events = []
            for _ in range(5):  # Read up to 5 events
                try:
                    data = websocket.receive_json()
                    events.append(data)
                    if data.get("type") == "aui_stream_end":
                        break
                except WebSocketDisconnect:
                    break

            assert len(events) > 0


class TestAUIWebSocketEventFormat:
    """Test that WebSocket events match SSE event format."""

    def test_event_has_required_fields(self):
        """Test that events have required base fields."""
        client = TestClient(app)

        with client.websocket_connect("/api/aui/ws/activity") as websocket:
            data = websocket.receive_json()

            # All events should have these base fields
            assert "type" in data
            assert "id" in data
            assert "timestamp" in data

    def test_event_type_prefix(self):
        """Test that all event types have aui_ prefix."""
        client = TestClient(app)

        with client.websocket_connect("/api/aui/ws/story") as websocket:
            events = []
            while True:
                try:
                    data = websocket.receive_json()
                    events.append(data)
                    if data.get("type") == "aui_stream_end":
                        break
                except WebSocketDisconnect:
                    break

            for event in events:
                assert event["type"].startswith("aui_"), (
                    f"Event type should start with 'aui_': {event['type']}"
                )
