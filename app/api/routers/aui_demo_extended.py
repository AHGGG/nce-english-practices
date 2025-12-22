"""
AUI Demo Extended - Demo endpoints for Activity, Tool Call, and Run Lifecycle events
"""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.services.aui_streaming import aui_streaming_service

router = APIRouter(prefix="/api/aui/demo", tags=["AUI Demo - Extended"])


@router.get("/stream/activity")
async def demo_activity_progress(
    task: str = "Data Processing",
    steps: int = 5
):
    """
    Demo Activity Progress events.
    Shows a long-running task with incremental progress updates.
    
    Query Parameters:
    - task: Task name (default: "Data Processing")
    - steps: Number of steps (default: 5)
    """
    async def event_generator():
        async for event in aui_streaming_service.stream_long_task_with_progress(
            task_name=task,
            total_steps=steps
        ):
            yield f"data: {event.model_dump_json()}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/stream/tool-call")
async def demo_tool_call(
    tool: str = "search_vocabulary",
    query: str = "apple"
):
    """
    Demo Tool Call events.
    Shows complete tool execution lifecycle: START ->ARGS -> END -> RESULT
    
    Query Parameters:
    - tool: Tool name (default: "search_vocabulary")
    - query: Search query (default: "apple")
    """
    async def event_generator():
        async for event in aui_streaming_service.stream_tool_execution(
            tool_name=tool,
            tool_args={"query": query, "limit": 5}
        ):
            yield f"data: {event.model_dump_json()}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/stream/agent-run")
async def demo_agent_run(
    task: str = "Generate a story about time travel",
    fail: bool = False
):
    """
    Demo Agent Run Lifecycle events.
    Shows RUN_STARTED -> RUN_FINISHED (or RUN_ERROR if fail=true)
    
    Query Parameters:
    - task: Task description (default: "Generate a story about time travel")
    - fail: Simulate failure (default: false)
    """
    async def event_generator():
        async for event in aui_streaming_service.stream_agent_run(
            agent_type="story_generator",
            task_description=task,
            should_fail=fail
        ):
            yield f"data: {event.model_dump_json()}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/stream/multi-messages")
async def demo_multi_messages():
    """
    Demo TEXT_MESSAGE lifecycle events.
    Shows multiple concurrent text messages with START/DELTA/END lifecycle.
    
    This demonstrates AG-UI's message segmentation mechanism:
    - START event marks message beginning
    - DELTA events for incremental content
    - END event marks message completion
    """
    async def event_generator():
        async for event in aui_streaming_service.stream_concurrent_messages():
            yield f"data: {event.model_dump_json()}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )
