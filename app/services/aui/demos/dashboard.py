import asyncio
import uuid
import copy
import random
from datetime import datetime
from typing import AsyncGenerator

from app.services.aui_events import (
    AUIEvent,
    StreamStartEvent,
    StreamEndEvent,
    create_snapshot_event,
    create_state_diff,
    StateSnapshotEvent,
)


class DashboardDemosMixin:
    async def stream_state_dashboard_demo(self) -> AsyncGenerator[AUIEvent, None]:
        """Demonstrate JSON Patch differential updates with a TaskDashboard component."""
        session_id = str(uuid.uuid4())

        yield StreamStartEvent(
            session_id=session_id, metadata={"demo_type": "state_dashboard"}
        )

        await asyncio.sleep(0.5)

        current_state = {
            "component": "TaskDashboard",
            "props": {
                "title": "System Initialization",
                "status": "idle",
                "progress": 0,
                "logs": [],
                "metrics": {"cpu": 0, "memory": 0},
                "tasks": [
                    {"id": 1, "name": "Load Core", "status": "pending"},
                    {"id": 2, "name": "Connect DB", "status": "pending"},
                    {"id": 3, "name": "Sync Assets", "status": "pending"},
                ],
            },
        }

        yield create_snapshot_event(
            intention="demonstrate_state_sync",
            ui=current_state,
            fallback_text="Initializing system dashboard...",
        )
        await asyncio.sleep(1.0)

        # Step 1: Start Processing
        new_state = copy.deepcopy(current_state)
        new_state["props"]["status"] = "running"
        new_state["props"]["logs"].append(
            f"[{datetime.now().strftime('%H:%M:%S')}] Started process"
        )
        new_state["props"]["tasks"][0]["status"] = "running"

        yield create_state_diff(current_state, new_state)
        current_state = new_state
        await asyncio.sleep(0.8)

        # Step 2: Progress Updates & Metrics (Loop)
        for i in range(1, 6):
            new_state = copy.deepcopy(current_state)

            new_state["props"]["progress"] = i * 20
            new_state["props"]["metrics"]["cpu"] = random.randint(20, 80)
            new_state["props"]["metrics"]["memory"] = random.randint(100, 500)

            if i == 2:
                new_state["props"]["tasks"][0]["status"] = "completed"
                new_state["props"]["tasks"][1]["status"] = "running"
                new_state["props"]["logs"].append(
                    f"[{datetime.now().strftime('%H:%M:%S')}] Core loaded"
                )
            elif i == 4:
                new_state["props"]["tasks"][1]["status"] = "completed"
                new_state["props"]["tasks"][2]["status"] = "running"
                new_state["props"]["logs"].append(
                    f"[{datetime.now().strftime('%H:%M:%S')}] DB connected"
                )

            delta = create_state_diff(current_state, new_state)
            if delta.delta:
                yield delta

            current_state = new_state
            await asyncio.sleep(0.8)

        # Step 3: Completion
        new_state = copy.deepcopy(current_state)
        new_state["props"]["status"] = "completed"
        new_state["props"]["progress"] = 100
        new_state["props"]["tasks"][2]["status"] = "completed"
        new_state["props"]["logs"].append(
            f"[{datetime.now().strftime('%H:%M:%S')}] All systems operational"
        )

        yield create_state_diff(current_state, new_state)

        yield StreamEndEvent(session_id=session_id)

    async def stream_with_state_snapshot(
        self, initial_title: str = "My Story", user_level: int = 1
    ) -> AsyncGenerator[AUIEvent, None]:
        """Demonstrate STATE_SNAPSHOT followed by STATE_DELTAs."""
        session_id = str(uuid.uuid4())

        yield StreamStartEvent(
            session_id=session_id, metadata={"demo_type": "state_snapshot_pattern"}
        )

        initial_state = {
            "component": "MarkdownMessage",
            "props": {"content": f"# {initial_title}\n\n"},
            "intention": "present_story",
            "target_level": user_level,
        }

        yield StateSnapshotEvent(state=initial_state)

        await asyncio.sleep(0.5)

        content_parts = [
            "Once upon a time, ",
            "in a small village, ",
            "there lived a curious cat named Whiskers. ",
            "Whiskers loved to explore the forest nearby.",
        ]

        current_state = copy.deepcopy(initial_state)

        for part in content_parts:
            new_state = copy.deepcopy(current_state)
            new_state["props"]["content"] += part

            yield create_state_diff(current_state, new_state)

            current_state = new_state
            await asyncio.sleep(0.3)

        new_state = copy.deepcopy(current_state)
        new_state["props"]["content"] += f"\n\n---\n✅ **{initial_title}** completed!"

        yield create_state_diff(current_state, new_state)

        yield StreamEndEvent(session_id=session_id)
