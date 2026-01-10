import asyncio
import uuid
import time
from typing import AsyncGenerator, Dict, Any, Optional

from app.services.aui_events import (
    AUIEvent,
    StreamStartEvent,
    StreamEndEvent,
    TextMessageStartEvent,
    TextDeltaEvent,
    TextMessageEndEvent,
    ActivitySnapshotEvent,
    create_activity_delta,
    ToolCallStartEvent,
    ToolCallArgsEvent,
    ToolCallEndEvent,
    ToolCallResultEvent,
    RunStartedEvent,
    RunFinishedEvent,
    RunErrorEvent,
)


class GeneralDemosMixin:
    async def stream_concurrent_messages(self) -> AsyncGenerator[AUIEvent, None]:
        """Demonstrate concurrent text message streams."""
        session_id = str(uuid.uuid4())

        story_id = f"msg_story_{uuid.uuid4().hex[:8]}"
        vocab_id = f"msg_vocab_{uuid.uuid4().hex[:8]}"

        yield StreamStartEvent(
            session_id=session_id, metadata={"demo_type": "concurrent_messages"}
        )

        yield TextMessageStartEvent(
            message_id=story_id,
            role="assistant",
            metadata={"type": "story", "title": "Time Travel"},
        )

        await asyncio.sleep(0.1)

        yield TextMessageStartEvent(
            message_id=vocab_id,
            role="assistant",
            metadata={"type": "vocabulary", "word": "persevere"},
        )

        story_chunks = [
            "Once ",
            "upon ",
            "a ",
            "time, ",
            "there ",
            "was ",
            "a ",
            "brave ",
            "knight ",
            "who ",
            "discovered ",
            "a ",
            "mysterious ",
            "portal...",
        ]

        vocab_chunks = [
            "Persevere",
            ": ",
            "to ",
            "continue ",
            "firmly ",
            "despite ",
            "difficulties ",
            "or ",
            "setbacks. ",
            "Example: ",
            "You ",
            "must ",
            "persevere ",
            "to ",
            "succeed.",
        ]

        max_len = max(len(story_chunks), len(vocab_chunks))

        for i in range(max_len):
            if i < len(story_chunks):
                yield TextDeltaEvent(message_id=story_id, delta=story_chunks[i])
                await asyncio.sleep(0.15)

            if i < len(vocab_chunks):
                yield TextDeltaEvent(message_id=vocab_id, delta=vocab_chunks[i])
                await asyncio.sleep(0.15)

        yield TextMessageEndEvent(
            message_id=story_id,
            final_content="Once upon a time, there was a brave knight who discovered a mysterious portal...",
        )

        await asyncio.sleep(0.2)

        yield TextMessageEndEvent(
            message_id=vocab_id,
            final_content="Persevere: to continue firmly despite difficulties or setbacks. Example: You must persevere to succeed.",
        )

        yield StreamEndEvent(session_id=session_id)

    async def stream_long_task_with_progress(
        self, task_name: str = "Data Processing", total_steps: int = 5
    ) -> AsyncGenerator[AUIEvent, None]:
        """Demonstrate Activity Progress events."""
        session_id = str(uuid.uuid4())
        activity_id = f"activity_{session_id}"

        yield StreamStartEvent(
            session_id=session_id, metadata={"activity_type": "long_task"}
        )

        initial_activity = {
            "name": task_name,
            "status": "idle",
            "progress": 0.0,
            "current_step": None,
        }

        yield ActivitySnapshotEvent(
            activity_id=activity_id,
            name=initial_activity["name"],
            status=initial_activity["status"],
            progress=initial_activity["progress"],
            current_step=initial_activity["current_step"],
        )

        await asyncio.sleep(0.5)

        current_activity = initial_activity.copy()
        new_activity = {
            **current_activity,
            "status": "running",
            "current_step": "Initializing...",
        }
        yield create_activity_delta(activity_id, current_activity, new_activity)
        current_activity = new_activity

        await asyncio.sleep(0.5)

        for step in range(1, total_steps + 1):
            progress = step / total_steps
            new_activity = {
                **current_activity,
                "progress": progress,
                "current_step": f"Step {step}/{total_steps}: Processing batch {step}",
            }
            yield create_activity_delta(activity_id, current_activity, new_activity)
            current_activity = new_activity
            await asyncio.sleep(0.8)

        new_activity = {
            **current_activity,
            "status": "completed",
            "current_step": "Done",
        }
        yield create_activity_delta(activity_id, current_activity, new_activity)

        yield StreamEndEvent(session_id=session_id)

    async def stream_tool_execution(
        self,
        tool_name: str = "search_vocabulary",
        tool_args: Optional[Dict[str, Any]] = None,
    ) -> AsyncGenerator[AUIEvent, None]:
        """Demonstrate Tool Call event chain."""
        session_id = str(uuid.uuid4())
        tool_call_id = f"tool_{session_id}"

        if tool_args is None:
            tool_args = {"query": "apple", "limit": 5}

        yield StreamStartEvent(session_id=session_id, metadata={"tool_name": tool_name})

        yield ToolCallStartEvent(
            tool_call_id=tool_call_id,
            tool_name=tool_name,
            description=f"Executing {tool_name} tool",
        )

        await asyncio.sleep(0.3)

        for key, value in tool_args.items():
            yield ToolCallArgsEvent(tool_call_id=tool_call_id, args_delta={key: value})
            await asyncio.sleep(0.2)

        await asyncio.sleep(1.0)

        duration_ms = 1500.0
        yield ToolCallEndEvent(
            tool_call_id=tool_call_id, status="success", duration_ms=duration_ms
        )

        await asyncio.sleep(0.2)

        result_data = {
            "words": [
                {"word": "apple", "definition": "A round fruit with red or green skin"},
                {
                    "word": "application",
                    "definition": "A formal request or software program",
                },
                {
                    "word": "apply",
                    "definition": "To make a formal request or put something to use",
                },
            ],
            "count": 3,
        }

        yield ToolCallResultEvent(tool_call_id=tool_call_id, result=result_data)

        yield StreamEndEvent(session_id=session_id)

    async def stream_agent_run(
        self,
        agent_type: str = "story_generator",
        task_description: str = "Generate a story about time travel",
        should_fail: bool = False,
    ) -> AsyncGenerator[AUIEvent, None]:
        """Demonstrate Run Lifecycle events."""
        session_id = str(uuid.uuid4())
        run_id = f"run_{session_id}"

        start_time = time.time()

        yield StreamStartEvent(
            session_id=session_id, metadata={"agent_type": agent_type}
        )

        yield RunStartedEvent(
            run_id=run_id, agent_type=agent_type, task_description=task_description
        )

        await asyncio.sleep(0.5)

        if should_fail:
            await asyncio.sleep(1.5)

            yield RunErrorEvent(
                run_id=run_id,
                error_message="LLM API rate limit exceeded",
                error_code="RATE_LIMIT",
                traceback="Traceback (most recent call last):\n  File 'generator.py', line 42\n    ...",
            )
        else:
            await asyncio.sleep(2.0)

            duration_ms = (time.time() - start_time) * 1000

            yield RunFinishedEvent(
                run_id=run_id,
                outcome=f"Successfully completed {task_description}",
                duration_ms=duration_ms,
            )

        yield StreamEndEvent(session_id=session_id)
