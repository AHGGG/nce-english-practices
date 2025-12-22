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
    TextDeltaEvent,
    create_snapshot_event,
    create_text_delta,
    create_state_diff,
)


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
        delay_per_card: float = 0.1
    ) -> AsyncGenerator[AUIEvent, None]:
        """
        Stream vocabulary cards one by one.
        
        Args:
            words: List of vocabulary words
            user_level: User mastery level
            delay_per_card: Delay between cards for visual effect
        
        Yields:
            AUIEvent: Stream of events
        """
        session_id = str(uuid.uuid4())
        message_id = f"vocab_{session_id}"
        
        yield StreamStartEvent(
            session_id=session_id,
            metadata={"intention": "show_vocabulary", "user_level": user_level}
        )
        
        # Determine component based on user level (from existing AUIRenderer logic)
        if user_level <= 1:
            component = "FlashCardStack"
            props = {"words": [], "show_translation": True, "messageId": message_id}
        else:
            component = "VocabGrid"
            props = {
                "words": [],
                "show_translation": False,
                "challenge_mode": True,
                "monolingual": user_level >= 3,
                "messageId": message_id
            }
        
        # Send initial empty snapshot
        yield create_snapshot_event(
            intention="show_vocabulary",
            ui={"component": component, "props": props},
            fallback_text="Loading vocabulary...",
            target_level=user_level
        )
        
        # Stream words incrementally (as state deltas in future phase)
        # For now, we'll send the complete list after a delay
        await asyncio.sleep(delay_per_card * len(words))
        
        # Send updated snapshot with all words
        props["words"] = words
        yield create_snapshot_event(
            intention="show_vocabulary",
            ui={"component": component, "props": props},
            fallback_text=f"Vocabulary: {', '.join(words)}",
            target_level=user_level
        )
        
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


# Singleton instance
aui_streaming_service = AUIStreamingService()
