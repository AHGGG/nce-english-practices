from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import asyncio
import json
from datetime import datetime
from app.services.aui_events import (
    create_snapshot_event,
    create_state_diff,
    StreamStartEvent,
    StreamEndEvent
)

router = APIRouter()

@router.get("/aui/stream/state-demo")
async def stream_state_demo():
    """
    Simulates a long-running process with complex state updates using JSON Patch.
    """
    async def event_generator():
        session_id = f"demo_state_{datetime.now().timestamp()}"
        
        # 1. Start Stream
        yield f"data: {StreamStartEvent(session_id=session_id).model_dump_json()}\n\n"
        await asyncio.sleep(0.5)

        # 2. Initial State (Snapshot)
        # Using a "TaskDashboard" component structure
        current_state = {
            "component": "TaskDashboard",
            "props": {
                "title": "System Initialization",
                "status": "idle",
                "progress": 0,
                "logs": [],
                "metrics": {
                    "cpu": 0,
                    "memory": 0
                },
                "tasks": [
                    {"id": 1, "name": "Load Core", "status": "pending"},
                    {"id": 2, "name": "Connect DB", "status": "pending"},
                    {"id": 3, "name": "Sync Assets", "status": "pending"}
                ]
            }
        }
        
        # Send initial full render
        snapshot_event = create_snapshot_event(
            intention="demonstrate_state_sync",
            ui=current_state,
            fallback_text="Initializing system dashboard..."
        )
        yield f"data: {snapshot_event.model_dump_json()}\n\n"
        await asyncio.sleep(1.0)

        # 3. State Mutations (Differential Updates)
        
        # Step 1: Start Processing
        new_state = current_state.copy()
        new_state["props"]["status"] = "running"
        new_state["props"]["logs"].append(f"[{datetime.now().strftime('%H:%M:%S')}] Started process")
        new_state["props"]["tasks"][0]["status"] = "running"
        
        delta = create_state_diff(current_state["props"], new_state["props"])
        # Important: The delta is relative to "props", so frontend needs to apply it to "props"
        # However, our AUIStreamHydrator applies patches to the componentSpec. 
        # Ideally, we should patch the whole UI object or just props. 
        # Let's assume AUIStreamHydrator applies patch to the WHOLE 'ui' object (component + props).
        # So let's diff the whole state.
        
        full_delta = create_state_diff(current_state, new_state)
        current_state = new_state # Update local reference
        yield f"data: {full_delta.model_dump_json()}\n\n"
        await asyncio.sleep(0.8)

        # Step 2: Progress Updates & Metrics (Loop)
        for i in range(1, 6):
            import random
            prev_props = current_state["props"]
            
            # Deep copy to avoid reference issues when modifying
            import copy
            new_state = copy.deepcopy(current_state)
            
            # Modify State
            new_state["props"]["progress"] = i * 20
            new_state["props"]["metrics"]["cpu"] = random.randint(20, 80)
            new_state["props"]["metrics"]["memory"] = random.randint(100, 500)
            
            # Complete tasks based on progress
            if i == 2:
                new_state["props"]["tasks"][0]["status"] = "completed"
                new_state["props"]["tasks"][1]["status"] = "running"
                new_state["props"]["logs"].append(f"[{datetime.now().strftime('%H:%M:%S')}] Core loaded")
            elif i == 4:
                new_state["props"]["tasks"][1]["status"] = "completed"
                new_state["props"]["tasks"][2]["status"] = "running"
                new_state["props"]["logs"].append(f"[{datetime.now().strftime('%H:%M:%S')}] DB connected")

            # Validate patch generation
            full_delta = create_state_diff(current_state, new_state)
            
            if full_delta.delta: # Only send if there are changes
                yield f"data: {full_delta.model_dump_json()}\n\n"
            
            current_state = new_state
            await asyncio.sleep(0.8)

        # Step 3: Completion
        new_state = copy.deepcopy(current_state)
        new_state["props"]["status"] = "completed"
        new_state["props"]["progress"] = 100
        new_state["props"]["tasks"][2]["status"] = "completed"
        new_state["props"]["logs"].append(f"[{datetime.now().strftime('%H:%M:%S')}] All systems operational")
        
        full_delta = create_state_diff(current_state, new_state)
        yield f"data: {full_delta.model_dump_json()}\n\n"
        
        # 4. Stream End
        yield f"data: {StreamEndEvent(session_id=session_id).model_dump_json()}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
