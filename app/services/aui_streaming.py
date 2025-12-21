"""
AUI Streaming Service - Generate streaming events for AUI components
"""

from typing import AsyncGenerator, Dict, Any, Optional, List
import asyncio
import uuid

from app.services.aui_events import (
    AUIEvent,
    StreamStartEvent,
    StreamEndEvent,
    RenderSnapshotEvent,
    TextDeltaEvent,
    create_snapshot_event,
    create_text_delta,
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


# Singleton instance
aui_streaming_service = AUIStreamingService()
