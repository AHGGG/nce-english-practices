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


@router.get("/stream/state-snapshot")
async def demo_state_snapshot(
    title: str = "My Story",
    level: int = 1
):
    """
    Demo STATE_SNAPSHOT + STATE_DELTA pattern.
    Shows the snapshot-delta pattern for state recovery/initialization.
    
    - STATE_SNAPSHOT: Initial complete state (allows recovery)
    - STATE_DELTA: Incremental updates via JSON Patch
    
    Query Parameters:
    - title: Story title (default: "My Story")
    - level: User mastery level 1-3 (default: 1)
    """
    async def event_generator():
        async for event in aui_streaming_service.stream_with_state_snapshot(
            initial_title=title,
            user_level=level
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


@router.get("/stream/interactive")
async def demo_interactive_flow():
    """
    Demo Human-in-the-Loop Interaction.
    
    Flow:
    1. Agent sends initial content
    2. Agent pauses and asks for confirmation (User sees buttons)
    3. User sends input via POST /api/aui/input
    4. Agent resumes and updates UI based on input
    """
    async def event_generator():
        async for event in aui_streaming_service.stream_interactive_flow():
            yield f"data: {event.model_dump_json()}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/stream/interrupt")
async def demo_interrupt(
    reason: str = "confirmation_required",
    difficulty: str = "intermediate"
):
    """
    Demo Interrupt Event (AG-UI HITL) - English Learning Scenario.
    
    Simulates an AI Coach generating a personalized study plan,
    then pausing for user confirmation before executing.
    
    Query Parameters:
    - reason: Interrupt reason (default: "confirmation_required")
    - difficulty: Learning difficulty level (default: "intermediate")
    """
    from app.services.aui_events import (
        StreamStartEvent, 
        StreamEndEvent, 
        InterruptEvent,
        TextMessageStartEvent,
        TextDeltaEvent,
        TextMessageEndEvent,
        ActivitySnapshotEvent
    )
    import uuid
    import asyncio
    
    async def event_generator():
        session_id = str(uuid.uuid4())
        
        # Start stream
        yield f"data: {StreamStartEvent(session_id=session_id).model_dump_json()}\n\n"
        await asyncio.sleep(0.2)
        
        # Activity: Analyzing user profile
        activity_id = f"act-{uuid.uuid4()}"
        yield f"data: {ActivitySnapshotEvent(activity_id=activity_id, name='Analyzing Learning Profile', status='running', progress=0.3, current_step='Reviewing vocabulary history...').model_dump_json()}\n\n"
        await asyncio.sleep(0.5)
        
        yield f"data: {ActivitySnapshotEvent(activity_id=activity_id, name='Analyzing Learning Profile', status='completed', progress=1.0, current_step='Analysis complete').model_dump_json()}\n\n"
        await asyncio.sleep(0.3)
        
        # Send analysis result message
        msg_id = f"msg-{uuid.uuid4()}"
        yield f"data: {TextMessageStartEvent(message_id=msg_id, role='assistant', metadata={'type': 'analysis', 'title': 'Coach Analysis'}).model_dump_json()}\n\n"
        
        analysis_text = f"Based on your recent practice sessions, I've identified some areas for improvement. Your tense usage accuracy is at 72%, and vocabulary retention shows room for growth. I recommend a focused {difficulty}-level study plan targeting these weak points."
        
        for word in analysis_text.split():
            yield f"data: {TextDeltaEvent(message_id=msg_id, delta=word + ' ').model_dump_json()}\n\n"
            await asyncio.sleep(0.03)
        
        yield f"data: {TextMessageEndEvent(message_id=msg_id).model_dump_json()}\n\n"
        await asyncio.sleep(0.5)
        
        # Send interrupt - asking for confirmation
        interrupt = InterruptEvent(
            reason=reason,
            required_action="approve_study_plan",
            payload={
                "plan_type": "personalized_intensive",
                "duration_days": 14,
                "daily_commitment_minutes": 30,
                "focus_areas": [
                    {"skill": "Past Perfect Tense", "priority": "high", "estimated_sessions": 5},
                    {"skill": "Vocabulary: Academic Words", "priority": "medium", "estimated_sessions": 8},
                    {"skill": "Reading Comprehension", "priority": "medium", "estimated_sessions": 4}
                ],
                "expected_improvement": "+15% accuracy",
                "start_date": "Tomorrow",
                "options": [
                    {"label": "✅ Start This Plan", "action": "confirm"},
                    {"label": "📝 Customize", "action": "customize"},
                    {"label": "❌ Cancel", "action": "cancel"}
                ]
            }
        )
        yield f"data: {interrupt.model_dump_json()}\n\n"
        await asyncio.sleep(0.5)
        
        # End stream
        yield f"data: {StreamEndEvent(session_id=session_id).model_dump_json()}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )
