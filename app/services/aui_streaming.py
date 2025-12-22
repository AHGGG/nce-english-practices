"""
AUI Streaming Service - Generate streaming events for AUI components
"""

from typing import AsyncGenerator, Dict, Any, Optional, List
import asyncio
import uuid
import copy

from app.services.aui_events import (
    AUIEvent,
    StreamStartEvent,
    StreamEndEvent,
    RenderSnapshotEvent,
    TextMessageStartEvent,
    TextDeltaEvent,
    TextMessageEndEvent,
    StateSnapshotEvent,
    StateDeltaEvent,
    ActivitySnapshotEvent,
    ActivityDeltaEvent,
    ToolCallStartEvent,
    ToolCallArgsEvent,
    ToolCallEndEvent,
    ToolCallResultEvent,
    RunStartedEvent,
    RunFinishedEvent,
    RunErrorEvent,
    create_snapshot_event,
    create_text_delta,
    create_state_diff,
    create_activity_delta,
)
from app.services.aui_input import input_service, AUIUserInput


class AUIStreamingService:
    """
    Service to generate streaming AUI events.
    Wraps existing AUIRenderer with streaming capabilities.
    """
    
    async def stream_story_presentation(
        self,
        story_content: str,
        title: str = "Story",
        user_level: int = 1,
        chunk_size: int = 5  # words per chunk
    ) -> AsyncGenerator[AUIEvent, None]:
        """
        Stream a story presentation with incremental text updates.
        
        Args:
            story_content: The complete story text
            title: Story title
            user_level: User mastery level (1-3)
            chunk_size: Number of words to send per delta
        
        Yields:
            AUIEvent: Stream of events (snapshot + deltas)
        """
        session_id = str(uuid.uuid4())
        message_id = f"story_{session_id}"
        
        # 1. Start stream
        yield StreamStartEvent(
            session_id=session_id,
            metadata={"intention": "present_story", "user_level": user_level}
        )
        
        # 2. Send initial snapshot (empty content)
        initial_ui = {
            "component": "StoryReader",
            "props": {
                "story": {
                    "title": title,
                    "content": "",  # Will be filled by deltas
                    "grammar_notes": [] if user_level > 1 else []
                },
                "coachMode": True,
                "messageId": message_id  # Important: Frontend needs this to accumulate
            }
        }
        
        yield create_snapshot_event(
            intention="present_story",
            ui=initial_ui,
            fallback_text=f"Story: {title}",
            target_level=user_level
        )
        
        # 3. Stream content as text deltas
        words = story_content.split()
        for i in range(0, len(words), chunk_size):
            chunk = " ".join(words[i:i + chunk_size]) + " "
            
            yield create_text_delta(
                message_id=message_id,
                delta=chunk,
                field_path="story.content"
            )
            
            # Simulate realistic streaming delay
            await asyncio.sleep(0.05)
        
        # 4. End stream
        yield StreamEndEvent(session_id=session_id)
    
    
    async def stream_vocabulary_cards(
        self,
        words: List[str],
        user_level: int = 1,
        delay_per_card: float = 0.5
    ) -> AsyncGenerator[AUIEvent, None]:
        """
        Stream vocabulary cards one by one using STATE_DELTA.
        
        Args:
            words: List of vocabulary words
            user_level: User mastery level
            delay_per_card: Delay between cards for visual effect
        
        Yields:
            AUIEvent: Stream of events (snapshot + deltas)
        """
        session_id = str(uuid.uuid4())
        message_id = f"vocab_{session_id}"
        
        yield StreamStartEvent(
            session_id=session_id,
            metadata={"intention": "show_vocabulary", "user_level": user_level}
        )
        
        # Determine component props
        if user_level <= 1:
            component = "FlashCardStack"
            # FlashCardStack usually expects "words" array
            props = {
                "words": [], 
                "show_translation": True, 
                "messageId": message_id,
                "current_index": 0 
            }
        else:
            component = "VocabGrid"
            props = {
                "words": [],
                "show_translation": False,
                "challenge_mode": True,
                "monolingual": user_level >= 3,
                "messageId": message_id
            }
        
        # 1. Send initial empty snapshot
        yield create_snapshot_event(
            intention="show_vocabulary",
            ui={"component": component, "props": props},
            fallback_text="Loading vocabulary...",
            target_level=user_level
        )
        
        await asyncio.sleep(0.5)
        
        # 2. Iterate words and send STATE_DELTA to add them one by one
        # JSON Patch op: "add", path: "/props/words/-", value: word_entry
        # Note: We need to know the structure of 'word_entry'. 
        # Typically frontend expects object { word: "...", definition: "..." } or just string.
        # For this demo, let's assume simple strings or simulated objects.
        
        # We need a way to mock definitions if they are objects, but input is just list of strings.
        # Let's wrap them essentially if needed, but 'words' arg implies strings.
        # Let's update docstring or assume strings. AUI usually handles strings or objects.
        
        import copy
        current_state = {
            "component": component,
            "props": copy.deepcopy(props),
            "intention": "show_vocabulary",
            "target_level": user_level
        }
        
        for i, word in enumerate(words):
            # Create the value to add
            # Ideally this comes from a dictionary service, but for streaming demo we use raw string or mock
            word_obj = {"word": word, "definition": f"Definition of {word}"}
            
            # Construct JSON Patch manually for efficiency/clarity
            # We are appending to props.words array
            patch_op = {
                "op": "add",
                "path": "/props/words/-",
                "value": word_obj
            }
            
            yield StateDeltaEvent(delta=[patch_op])
            
            # Update internal state tracker (so we know where we are if we generated diffs programmatically)
            current_state["props"]["words"].append(word_obj)
            
            await asyncio.sleep(delay_per_card)
        
        # 3. Final visual update (optional, e.g. selecting first card)
        # For FlashCardStack, we might want to ensure index 0 is valid.
        
        yield StreamEndEvent(session_id=session_id)


    async def stream_vocabulary_flip(
        self,
        words: List[str],
        user_level: int = 1
    ) -> AsyncGenerator[AUIEvent, None]:
        """
        Demonstrate JSON Patch by flipping a card state.
        
        Args:
            words: List of words
            user_level: User mastery
            
        Yields:
            AUIEvent: Snapshot then State Delta
        """
        session_id = str(uuid.uuid4())
        message_id = f"vocab_patch_{session_id}"
        
        yield StreamStartEvent(
            session_id=session_id,
            metadata={"intention": "show_vocabulary", "user_level": user_level}
        )
        
        # 1. Initial State: List of cards, all un-flipped
        # We need to construct the PROPS structure that matches what VocabGrid expects (or FlashCardStack)
        # Assuming FlashCardStack for simplicity of "flipping" index 0
         
        # Note: Ideally we track state internally. Here we manually construct the "Before" and "After" 
        # to generate the patch, or manually construct the patch.
        
        if user_level <= 1:
            component = "FlashCardStack"
            # Initial Props
            props = {
                "words": words, 
                "show_translation": True, 
                "messageId": message_id,
                "current_index": 0,
                "is_flipped": False 
            }
        else:
            component = "VocabGrid"
            props = {
                "words": words,
                "show_translation": False,
                "messageId": message_id,
                "expanded_indices": []  # Using this to simulate "flip" or expand
            }

        # Send Initial Snapshot
        yield create_snapshot_event(
            intention="show_vocabulary",
            ui={"component": component, "props": props},
            fallback_text="Vocabulary List",
            target_level=user_level
        )
        
        await asyncio.sleep(1.0) # Wait to show initial state
        
        # 2. State Update: Flip the card (or expand item)
        # We will iterate through words and "flip" them one by one
        
        current_props = copy.deepcopy(props)
        
        for i in range(len(words)):
            # New State - use deepcopy to avoid mutation
            new_props = copy.deepcopy(current_props)
            if component == "FlashCardStack":
                new_props["current_index"] = i
                new_props["is_flipped"] = True
            else:
                # VocabGrid: Add index to expanded list
                new_props["expanded_indices"] = current_props["expanded_indices"] + [i]
            
            # Generate Patch
            # We must create patch against the FULL ui object structure usually, 
            # or the hydrator needs to know where to apply it.
            # The Hydrator applies patch to `{ component, props, intention, target_level }`
            
            old_doc = {
                "component": component,
                "props": current_props,
                "intention": "show_vocabulary",
                "target_level": user_level
            }
            
            new_doc = {
                "component": component,
                "props": new_props,
                "intention": "show_vocabulary",
                "target_level": user_level
            }
            
            yield create_state_diff(old_doc, new_doc)
            
            current_props = new_props
            await asyncio.sleep(1.0) 
            
            if component == "FlashCardStack":
                # Reset flip for next card (if we were iterating, but FlashCardStack usually shows one)
                # Let's just do one transition for simplicity
                pass

        yield StreamEndEvent(session_id=session_id)


    async def stream_concurrent_messages(
        self
    ) -> AsyncGenerator[AUIEvent, None]:
        """
        Demonstrate concurrent text message streams.
        Shows multiple messages streaming simultaneously with proper lifecycle events.
        
        Yields:
            AUIEvent: Stream of TEXT_MESSAGE_START, TEXT_DELTA, TEXT_MESSAGE_END events
        """
        session_id = str(uuid.uuid4())
        
        # Create unique message IDs
        story_id = f"msg_story_{uuid.uuid4().hex[:8]}"
        vocab_id = f"msg_vocab_{uuid.uuid4().hex[:8]}"
        
        yield StreamStartEvent(
            session_id=session_id,
            metadata={"demo_type": "concurrent_messages"}
        )
        
        # Message 1 - START: Story
        yield TextMessageStartEvent(
            message_id=story_id,
            role="assistant",
            metadata={"type": "story", "title": "Time Travel"}
        )
        
        await asyncio.sleep(0.1)
        
        # Message 2 - START: Vocabulary
        yield TextMessageStartEvent(
            message_id=vocab_id,
            role="assistant",
            metadata={"type": "vocabulary", "word": "persevere"}
        )
        
        # Prepare content chunks
        story_chunks = [
            "Once ", "upon ", "a ", "time, ", "there ", "was ", "a ", "brave ",
            "knight ", "who ", "discovered ", "a ", "mysterious ", "portal..."
        ]
        
        vocab_chunks = [
            "Persevere", ": ", "to ", "continue ", "firmly ", "despite ",
            "difficulties ", "or ", "setbacks. ", "Example: ", "You ",
            "must ", "persevere ", "to ", "succeed."
        ]
        
        # Interleave streaming both messages
        max_len = max(len(story_chunks), len(vocab_chunks))
        
        for i in range(max_len):
            # Send story chunk if available
            if i < len(story_chunks):
                yield TextDeltaEvent(
                    message_id=story_id,
                    delta=story_chunks[i]
                )
                await asyncio.sleep(0.15)
            
            # Send vocab chunk if available
            if i < len(vocab_chunks):
                yield TextDeltaEvent(
                    message_id=vocab_id,
                    delta=vocab_chunks[i]
                )
                await asyncio.sleep(0.15)
        
        # Message 1 - END
        yield TextMessageEndEvent(
            message_id=story_id,
            final_content="Once upon a time, there was a brave knight who discovered a mysterious portal..."
        )
        
        await asyncio.sleep(0.2)
        
        # Message 2 - END
        yield TextMessageEndEvent(
            message_id=vocab_id,
            final_content="Persevere: to continue firmly despite difficulties or setbacks. Example: You must persevere to succeed."
        )
        
        yield StreamEndEvent(session_id=session_id)


    async def stream_long_task_with_progress(
        self,
        task_name: str = "Data Processing",
        total_steps: int = 5
    ) -> AsyncGenerator[AUIEvent, None]:
        """
        Demonstrate Activity Progress events.
        Simulates a multi-step task with progress updates.
        
        Args:
            task_name: Name of the task
            total_steps: Number of processing steps
        
        Yields:
            AUIEvent: Activity events showing progress
        """
        session_id = str(uuid.uuid4())
        activity_id = f"activity_{session_id}"
        
        yield StreamStartEvent(
            session_id=session_id,
            metadata={"activity_type": "long_task"}
        )
        
        # Initial activity snapshot
        initial_activity = {
            "name": task_name,
            "status": "idle",
            "progress": 0.0,
            "current_step": None
        }
        
        yield ActivitySnapshotEvent(
            activity_id=activity_id,
            name=initial_activity["name"],
            status=initial_activity["status"],
            progress=initial_activity["progress"],
            current_step=initial_activity["current_step"]
        )
        
        await asyncio.sleep(0.5)
        
        # Start processing
        current_activity = initial_activity.copy()
        new_activity = {**current_activity, "status": "running", "current_step": "Initializing..."}
        yield create_activity_delta(activity_id, current_activity, new_activity)
        current_activity = new_activity
        
        await asyncio.sleep(0.5)
        
        # Process each step
        for step in range(1, total_steps + 1):
            progress = step / total_steps
            new_activity = {
                **current_activity,
                "progress": progress,
                "current_step": f"Step {step}/{total_steps}: Processing batch {step}"
            }
            yield create_activity_delta(activity_id, current_activity, new_activity)
            current_activity = new_activity
            await asyncio.sleep(0.8)
        
        # Complete
        new_activity = {
            **current_activity,
            "status": "completed",
            "current_step": "Done"
        }
        yield create_activity_delta(activity_id, current_activity, new_activity)
        
        yield StreamEndEvent(session_id=session_id)


    async def stream_tool_execution(
        self,
        tool_name: str = "search_vocabulary",
        tool_args: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[AUIEvent, None]:
        """
        Demonstrate Tool Call event chain.
        Shows complete lifecycle: START -> ARGS -> END -> RESULT
        
        Args:
            tool_name: Name of the tool to execute
            tool_args: Tool arguments
        
        Yields:
            AUIEvent: Tool call events
        """
        session_id = str(uuid.uuid4())
        tool_call_id = f"tool_{session_id}"
        
        if tool_args is None:
            tool_args = {"query": "apple", "limit": 5}
        
        yield StreamStartEvent(
            session_id=session_id,
            metadata={"tool_name": tool_name}
        )
        
        # 1. Tool Call Start
        yield ToolCallStartEvent(
            tool_call_id=tool_call_id,
            tool_name=tool_name,
            description=f"Executing {tool_name} tool"
        )
        
        await asyncio.sleep(0.3)
        
        # 2. Streaming Arguments (simulate large args being sent incrementally)
        for key, value in tool_args.items():
            yield ToolCallArgsEvent(
                tool_call_id=tool_call_id,
                args_delta={key: value}
            )
            await asyncio.sleep(0.2)
        
        # Simulate execution time
        await asyncio.sleep(1.0)
        
        # 3. Tool Call End
        duration_ms = 1500.0  # Simulated duration
        yield ToolCallEndEvent(
            tool_call_id=tool_call_id,
            status="success",
            duration_ms=duration_ms
        )
        
        await asyncio.sleep(0.2)
        
        # 4. Tool Call Result
        result_data = {
            "words": [
                {"word": "apple", "definition": "A round fruit with red or green skin"},
                {"word": "application", "definition": "A formal request or software program"},
                {"word": "apply", "definition": "To make a formal request or put something to use"}
            ],
            "count": 3
        }
        
        yield ToolCallResultEvent(
            tool_call_id=tool_call_id,
            result=result_data
        )
        
        yield StreamEndEvent(session_id=session_id)


    async def stream_agent_run(
        self,
        agent_type: str = "story_generator",
        task_description: str = "Generate a story about time travel",
        should_fail: bool = False
    ) -> AsyncGenerator[AUIEvent, None]:
        """
        Demonstrate Run Lifecycle events.
        Shows complete agent run: RUN_STARTED -> (Activities/Tools) -> RUN_FINISHED/RUN_ERROR
        
        Args:
            agent_type: Type of agent
            task_description: Description of the task
            should_fail: Whether to simulate a failure
        
        Yields:
            AUIEvent: Run lifecycle events
        """
        session_id = str(uuid.uuid4())
        run_id = f"run_{session_id}"
        
        import time
        start_time = time.time()
        
        yield StreamStartEvent(
            session_id=session_id,
            metadata={"agent_type": agent_type}
        )
        
        # 1. Run Started
        yield RunStartedEvent(
            run_id=run_id,
            agent_type=agent_type,
            task_description=task_description
        )
        
        await asyncio.sleep(0.5)
        
        # Simulate some work (could include Activity or Tool Call events here)
        if should_fail:
            # Simulate error after some processing
            await asyncio.sleep(1.5)
            
            yield RunErrorEvent(
                run_id=run_id,
                error_message="LLM API rate limit exceeded",
                error_code="RATE_LIMIT",
                traceback="Traceback (most recent call last):\n  File 'generator.py', line 42\n    ..."
            )
        else:
            # Simulate successful processing
            await asyncio.sleep(2.0)
            
            duration_ms = (time.time() - start_time) * 1000
            
            yield RunFinishedEvent(
                run_id=run_id,
                outcome=f"Successfully completed {task_description}",
                duration_ms=duration_ms
            )
        
        yield StreamEndEvent(session_id=session_id)


    async def stream_with_state_snapshot(
        self,
        initial_title: str = "My Story",
        user_level: int = 1
    ) -> AsyncGenerator[AUIEvent, None]:
        """
        Demonstrate STATE_SNAPSHOT followed by STATE_DELTAs.
        Shows the snapshot-delta pattern for state recovery.
        
        Args:
            initial_title: Initial story title
            user_level: User mastery level
        
        Yields:
            AUIEvent: STATE_SNAPSHOT then multiple STATE_DELTAs
        """
        session_id = str(uuid.uuid4())
        
        yield StreamStartEvent(
            session_id=session_id,
            metadata={"demo_type": "state_snapshot_pattern"}
        )
        
        # 1. Initial complete state snapshot - allows recovery/initialization
        initial_state = {
            "component": "StoryReader",
            "props": {
                "story": {
                    "title": initial_title,
                    "content": "",
                    "grammar_notes": []
                },
                "coachMode": True
            },
            "intention": "present_story",
            "target_level": user_level
        }
        
        yield StateSnapshotEvent(state=initial_state)
        
        await asyncio.sleep(0.5)
        
        # 2. Series of state deltas to update the content
        content_parts = [
            "Once upon a time, ",
            "in a small village, ",
            "there lived a curious cat named Whiskers. ",
            "Whiskers loved to explore the forest nearby."
        ]
        
        current_state = copy.deepcopy(initial_state)
        
        for part in content_parts:
            new_state = copy.deepcopy(current_state)
            new_state["props"]["story"]["content"] += part
            
            yield create_state_diff(current_state, new_state)
            
            current_state = new_state
            await asyncio.sleep(0.3)
        
        # 3. Final state delta - update title to show completion
        new_state = copy.deepcopy(current_state)
        new_state["props"]["story"]["title"] = f"{initial_title} ✓"
        new_state["props"]["story"]["grammar_notes"] = [
            {"note": "Past tense narrative style", "example": "there lived"}
        ]
        
        yield create_state_diff(current_state, new_state)
        
        yield StreamEndEvent(session_id=session_id)



    async def stream_interactive_flow(
        self
    ) -> AsyncGenerator[AUIEvent, None]:
        """
        Demonstrate Human-in-the-Loop interaction.
        1. Responds to initial request
        2. Pauses to ask user for confirmation
        3. Resumes after user input
        
        Yields:
            AUIEvent: Stream events including interactive components
        """
        session_id = str(uuid.uuid4())
        
        yield StreamStartEvent(
            session_id=session_id,
            metadata={"demo_type": "interactive_flow"}
        )
        
        # 1. Initial State: Show a "Processing" message
        initial_ui = {
            "component": "InteractiveDemo",
            "props": {
                "status": "processing",
                "message": "Analyzing your request...",
                "sessionId": session_id  # Crucial for client to know where to send input
            }
        }
        
        yield create_snapshot_event(
            intention="get_confirmation",
            ui=initial_ui,
            fallback_text="Analyzing..."
        )
        
        await asyncio.sleep(1.0)
        
        # 2. Ask for Confirmation (The "Pause" Moment)
        # We update the UI to show buttons
        
        confirm_ui = copy.deepcopy(initial_ui)
        confirm_ui["props"]["status"] = "waiting_input"
        confirm_ui["props"]["message"] = "Analysis complete. Do you want to proceed with the changes?"
        confirm_ui["props"]["options"] = [
            {"label": "Yes, Proceed", "action": "confirm", "variant": "primary"},
            {"label": "No, Cancel", "action": "cancel", "variant": "destructive"}
        ]
        
        yield create_state_diff(initial_ui, confirm_ui)
        
        # 3. Wait for User Input
        # The agent literally yields nothing (pauses) here while awaiting the Queue
        print(f"Agent waiting for input on session {session_id}...")
        
        user_input = await input_service.wait_for_input(session_id, timeout=60.0)
        
        if user_input is None:
            # Timeout case
            timeout_ui = copy.deepcopy(confirm_ui)
            timeout_ui["props"]["status"] = "error"
            timeout_ui["props"]["message"] = "Session timed out waiting for input."
            timeout_ui["props"]["options"] = []
            
            yield create_state_diff(confirm_ui, timeout_ui)
            yield StreamEndEvent(session_id=session_id)
            return

        # 4. Handle Input
        final_ui = copy.deepcopy(confirm_ui)
        final_ui["props"]["options"] = [] # Remove buttons
        
        if user_input.action == "confirm":
            final_ui["props"]["status"] = "success"
            final_ui["props"]["message"] = "Confirmed! Changes have been applied successfully."
        else:
            final_ui["props"]["status"] = "cancelled"
            final_ui["props"]["message"] = "Operation cancelled by user."
            
        yield create_state_diff(confirm_ui, final_ui)
        
        yield StreamEndEvent(session_id=session_id)


# Singleton instance
aui_streaming_service = AUIStreamingService()

