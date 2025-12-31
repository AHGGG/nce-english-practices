import asyncio
import uuid
import copy
from typing import AsyncGenerator

from app.services.aui_events import (
    AUIEvent, StreamStartEvent, StreamEndEvent, create_snapshot_event, 
    create_state_diff, InterruptEvent, TextMessageStartEvent, 
    TextDeltaEvent, TextMessageEndEvent, ActivitySnapshotEvent
)
from app.services.aui_input import input_service

class InteractiveDemosMixin:
    
    async def stream_interactive_flow(
        self
    ) -> AsyncGenerator[AUIEvent, None]:
        """Demonstrate Human-in-the-Loop interaction."""
        session_id = str(uuid.uuid4())
        
        yield StreamStartEvent(
            session_id=session_id,
            metadata={"demo_type": "interactive_flow"}
        )
        
        initial_ui = {
            "component": "InteractiveDemo",
            "props": {
                "status": "processing",
                "message": "Analyzing your request...",
                "sessionId": session_id
            }
        }
        
        yield create_snapshot_event(
            intention="get_confirmation",
            ui=initial_ui,
            fallback_text="Analyzing..."
        )
        
        await asyncio.sleep(1.0)
        
        confirm_ui = copy.deepcopy(initial_ui)
        confirm_ui["props"]["status"] = "waiting_input"
        confirm_ui["props"]["message"] = "Analysis complete. Do you want to proceed with the changes?"
        confirm_ui["props"]["options"] = [
            {"label": "Yes, Proceed", "action": "confirm", "variant": "primary"},
            {"label": "No, Cancel", "action": "cancel", "variant": "destructive"}
        ]
        
        yield create_state_diff(initial_ui, confirm_ui)
        
        print(f"Agent waiting for input on session {session_id}...")
        
        user_input = await input_service.wait_for_input(session_id, timeout=60.0)
        
        if user_input is None:
            timeout_ui = copy.deepcopy(confirm_ui)
            timeout_ui["props"]["status"] = "error"
            timeout_ui["props"]["message"] = "Session timed out waiting for input."
            timeout_ui["props"]["options"] = []
            
            yield create_state_diff(confirm_ui, timeout_ui)
            yield StreamEndEvent(session_id=session_id)
            return

        final_ui = copy.deepcopy(confirm_ui)
        final_ui["props"]["options"] = []
        
        if user_input.action == "confirm":
            final_ui["props"]["status"] = "success"
            final_ui["props"]["message"] = "Confirmed! Changes have been applied successfully."
        else:
            final_ui["props"]["status"] = "cancelled"
            final_ui["props"]["message"] = "Operation cancelled by user."
            
        yield create_state_diff(confirm_ui, final_ui)
        
        yield StreamEndEvent(session_id=session_id)

    async def stream_interrupt_demo(
        self,
        reason: str = "confirmation_required",
        difficulty: str = "intermediate"
    ) -> AsyncGenerator[AUIEvent, None]:
        """Demonstrate Interrupt Event (AG-UI HITL)."""
        session_id = str(uuid.uuid4())
        
        yield StreamStartEvent(
            session_id=session_id,
            metadata={"demo_type": "interrupt", "difficulty": difficulty}
        )
        
        await asyncio.sleep(0.2)
        
        activity_id = f"act-{uuid.uuid4()}"
        yield ActivitySnapshotEvent(
            activity_id=activity_id,
            name='Analyzing Learning Profile',
            status='running',
            progress=0.3,
            current_step='Reviewing vocabulary history...'
        )
        await asyncio.sleep(0.5)
        
        yield ActivitySnapshotEvent(
            activity_id=activity_id,
            name='Analyzing Learning Profile',
            status='completed',
            progress=1.0,
            current_step='Analysis complete'
        )
        await asyncio.sleep(0.3)
        
        msg_id = f"msg-{uuid.uuid4()}"
        yield TextMessageStartEvent(
            message_id=msg_id,
            role='assistant',
            metadata={'type': 'analysis', 'title': 'Coach Analysis'}
        )
        
        analysis_text = f"Based on your recent practice sessions, I've identified some areas for improvement. Your tense usage accuracy is at 72%, and vocabulary retention shows room for growth. I recommend a focused {difficulty}-level study plan targeting these weak points."
        
        for word in analysis_text.split():
            yield TextDeltaEvent(message_id=msg_id, delta=word + ' ')
            await asyncio.sleep(0.03)
        
        yield TextMessageEndEvent(message_id=msg_id)
        await asyncio.sleep(0.5)
        
        interrupt_id = f"interrupt-{uuid.uuid4()}"
        interrupt = InterruptEvent(
            interrupt_id=interrupt_id,
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
                ],
                "session_id": session_id 
            }
        )
        yield interrupt
        
        user_input = await input_service.wait_for_input(session_id, timeout=60.0)
        
        if user_input is None:
            yield TextMessageStartEvent(
                message_id=f"msg-timeout-{uuid.uuid4()}",
                role='assistant',
                metadata={'type': 'error'}
            )
            yield TextDeltaEvent(message_id=f"msg-timeout-{uuid.uuid4()}", delta="Session timed out. Please try again.")
            yield TextMessageEndEvent(message_id=f"msg-timeout-{uuid.uuid4()}")
        elif user_input.action == "confirm":
            result_msg_id = f"msg-result-{uuid.uuid4()}"
            yield TextMessageStartEvent(
                message_id=result_msg_id,
                role='assistant',
                metadata={'type': 'success', 'title': 'Plan Activated'}
            )
            yield TextDeltaEvent(message_id=result_msg_id, delta="🎉 Great choice! Your personalized study plan has been activated. ")
            yield TextDeltaEvent(message_id=result_msg_id, delta="We'll start with Past Perfect Tense tomorrow. ")
            yield TextDeltaEvent(message_id=result_msg_id, delta="Good luck on your learning journey!")
            yield TextMessageEndEvent(message_id=result_msg_id)
        elif user_input.action == "customize":
            result_msg_id = f"msg-result-{uuid.uuid4()}"
            yield TextMessageStartEvent(
                message_id=result_msg_id,
                role='assistant',
                metadata={'type': 'info', 'title': 'Customization'}
            )
            yield TextDeltaEvent(message_id=result_msg_id, delta="📝 Opening customization options... ")
            yield TextDeltaEvent(message_id=result_msg_id, delta="You can adjust the schedule, focus areas, and daily commitment.")
            yield TextMessageEndEvent(message_id=result_msg_id)
        else:
            result_msg_id = f"msg-result-{uuid.uuid4()}"
            yield TextMessageStartEvent(
                message_id=result_msg_id,
                role='assistant',
                metadata={'type': 'cancelled'}
            )
            yield TextDeltaEvent(message_id=result_msg_id, delta="❌ Study plan cancelled. ")
            yield TextDeltaEvent(message_id=result_msg_id, delta="Let me know when you're ready to create a new plan!")
            yield TextMessageEndEvent(message_id=result_msg_id)
        
        await asyncio.sleep(0.3)
        
        yield StreamEndEvent(session_id=session_id)
