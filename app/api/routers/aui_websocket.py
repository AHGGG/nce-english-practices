"""
AUI WebSocket Router - WebSocket transport for AUI streaming events

Primary transport layer for all AUI streaming (Action UI).
Reuses existing AUIStreamingService async generators.
"""


from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Optional
import logging
import uuid
import json

from app.services.aui import aui_streaming_service
from app.services.aui_input import input_service
from app.core.db import AsyncSessionLocal

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/aui/ws", tags=["AUI WebSocket"])


# Health check endpoint - MUST be before /{stream_type} route
@router.websocket("/ping")
async def websocket_ping(websocket: WebSocket):
    """Simple ping endpoint to test WebSocket connectivity."""
    await websocket.accept()
    await websocket.send_json({"type": "pong", "message": "AUI WebSocket is alive"})
    await websocket.close()


# Stream type to service method mapping
STREAM_TYPE_MAP = {
    # Basic streaming
    "story": lambda params: aui_streaming_service.stream_story_presentation(
        story_content=params.get("content", "Once upon a time..."),
        title=params.get("title", "Story"),
        user_level=params.get("user_level", 1),
        chunk_size=params.get("chunk_size", 5)
    ),
    "vocabulary": lambda params: aui_streaming_service.stream_vocabulary_cards(
        words=params.get("words", ["hello", "world"]),
        user_level=params.get("user_level", 1)
    ),
    "vocab-patch": lambda params: aui_streaming_service.stream_vocabulary_flip(
        words=params.get("words", ["Serendipity", "Ephemeral", "Luminous"]),
        user_level=params.get("user_level", 1)
    ),
    
    # Extended events
    "activity": lambda params: aui_streaming_service.stream_long_task_with_progress(
        task_name=params.get("task", "Data Processing"),
        total_steps=params.get("steps", 5)
    ),
    "tool-call": lambda params: aui_streaming_service.stream_tool_execution(
        tool_name=params.get("tool", "search_vocabulary"),
        tool_args={"query": params.get("query", "apple"), "limit": 5}
    ),
    "agent-run": lambda params: aui_streaming_service.stream_agent_run(
        agent_type="story_generator",
        task_description=params.get("task", "Generate a story"),
        should_fail=params.get("fail", False)
    ),
    "multi-messages": lambda params: aui_streaming_service.stream_concurrent_messages(),
    "state-snapshot": lambda params: aui_streaming_service.stream_with_state_snapshot(
        initial_title=params.get("title", "My Story"),
        user_level=params.get("level", 1)
    ),
    
    # Human-in-the-Loop
    "interactive": lambda params: aui_streaming_service.stream_interactive_flow(),
    "interrupt": lambda params: aui_streaming_service.stream_interrupt_demo(
        reason=params.get("reason", "confirmation_required"),
        difficulty=params.get("difficulty", "intermediate")
    ),
    
    # Additional demos
    "state-demo": lambda params: aui_streaming_service.stream_state_dashboard_demo(),
    
    # Context Resources
    "contexts": lambda params: aui_streaming_service.stream_context_resources(
        word=params.get("word"),
        user_level=params.get("user_level", 1),
        book_code=params.get("book")
    ),
    
    # LDOCE Dictionary
    "ldoce-demo": lambda params: aui_streaming_service.stream_ldoce_lookup(
        word=params.get("word", "simmer"),
        user_level=params.get("user_level", 1)
    ),
}



@router.websocket("/{stream_type}")
async def aui_websocket_stream(
    websocket: WebSocket,
    stream_type: str,
):
    """
    Unified WebSocket endpoint for AUI streaming.
    
    Path Parameters:
        stream_type: Type of stream to start. Options:
            - story, vocabulary, vocab-patch
            - activity, tool-call, agent-run
            - multi-messages, state-snapshot
            - interactive (supports bidirectional messaging)
    
    Client can send JSON messages for bidirectional communication:
        - {"type": "params", "data": {...}} - Set stream parameters before starting
        - {"type": "input", "session_id": "...", "action": "...", "payload": {...}} - HITL input
        - {"type": "close"} - Close connection gracefully
    
    Server sends AUI events as JSON objects (same format as SSE).
    """
    await websocket.accept()
    logger.info(f"WebSocket connected: stream_type={stream_type}")
    
    session_id = str(uuid.uuid4())
    params = {}
    
    try:
        # Wait for optional params message (with timeout)
        try:
            # Non-blocking check for initial params
            import asyncio
            try:
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=0.1)
                data = json.loads(msg)
                if data.get("type") == "params":
                    params = data.get("data", {})
                    logger.info(f"Received params: {params}")
            except asyncio.TimeoutError:
                pass  # No params message, use defaults
            except json.JSONDecodeError:
                pass  # Invalid JSON, ignore
        except WebSocketDisconnect:
            return
        
        # Get the stream generator
        if stream_type not in STREAM_TYPE_MAP:
            await websocket.send_json({
                "type": "aui_error",
                "error_code": "INVALID_STREAM_TYPE",
                "message": f"Unknown stream type: {stream_type}. Valid types: {list(STREAM_TYPE_MAP.keys())}"
            })
            await websocket.close(code=4000)
            return
        
        stream_generator = STREAM_TYPE_MAP[stream_type](params)
        
        # Start bidirectional handling for interactive streams
        if stream_type in ("interactive", "interrupt", "contexts"):
            await handle_interactive_stream(websocket, stream_generator, session_id)
        else:
            # Standard unidirectional stream
            await handle_standard_stream(websocket, stream_generator)
        
        # Close normally
        await websocket.close(code=1000)
        
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: session_id={session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({
                "type": "aui_error",
                "error_code": "STREAM_ERROR",
                "message": str(e)
            })
            await websocket.close(code=1011)
        except Exception:
            pass


async def handle_standard_stream(websocket: WebSocket, stream_generator):
    """Handle standard unidirectional streaming."""
    async for event in stream_generator:
        await websocket.send_json(event.model_dump())


async def handle_interactive_stream(websocket: WebSocket, stream_generator, session_id: str):
    """
    Handle bidirectional streaming for Human-in-the-Loop scenarios.
    
    Streams events while also listening for client input.
    Client can send HITL responses via WebSocket instead of POST.
    """
    import asyncio
    
    async def stream_events():
        """Stream events to client."""
        async for event in stream_generator:
            await websocket.send_json(event.model_dump())
    
    async def listen_for_input():
        """Listen for client input messages."""
        try:
            while True:
                msg = await websocket.receive_text()
                data = json.loads(msg)
                
                if data.get("type") == "input":
                    action = data.get("action", "unknown")
                    payload = data.get("payload", {})
                    
                    # Check if this is a HITL action (has session_id matching expected pattern)
                    session_id_from_msg = data.get("session_id", session_id)
                    
                    # General actions (like status_changed) - just log and ACK
                    if action in ("status_changed", "audio_played", "view_dictionary"):
                        logger.info(f"[AUI WS] Action '{action}' received: {payload}")
                        # Send acknowledgement back to client
                        await websocket.send_json({
                            "type": "aui_action_ack",
                            "action": action,
                            "status": "acknowledged"
                        })
                    else:
                        # Forward to input service for HITL flows
                        from app.services.aui_input import AUIUserInput
                        user_input = AUIUserInput(
                            session_id=session_id_from_msg,
                            action=action,
                            payload=payload
                        )
                        
                        # Create a fresh DB session for this operation
                        async with AsyncSessionLocal() as db:
                            await input_service.submit_input(db, user_input)
                            
                        logger.info(f"Received HITL input via WebSocket: {user_input.action}")
                    
                elif data.get("type") == "close":
                    break
                    
        except WebSocketDisconnect:
            pass
        except json.JSONDecodeError:
            pass
    
    # Run both tasks concurrently
    stream_task = asyncio.create_task(stream_events())
    input_task = asyncio.create_task(listen_for_input())
    
    # Wait for stream to complete (input listener runs alongside)
    await stream_task
    input_task.cancel()

