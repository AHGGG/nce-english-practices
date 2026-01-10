import asyncio
import uuid
from typing import AsyncGenerator

from app.services.aui_events import (
    AUIEvent,
    StreamStartEvent,
    StreamEndEvent,
    create_snapshot_event,
    create_text_delta,
)


class StoryMixin:
    async def stream_story_presentation(
        self,
        story_content: str,
        title: str = "Story",
        user_level: int = 1,
        chunk_size: int = 5,  # words per chunk
    ) -> AsyncGenerator[AUIEvent, None]:
        """
        Stream a story presentation with incremental text updates.
        """
        session_id = str(uuid.uuid4())
        message_id = f"story_{session_id}"

        # 1. Start stream
        yield StreamStartEvent(
            session_id=session_id,
            metadata={"intention": "present_story", "user_level": user_level},
        )

        # 2. Send initial snapshot (empty content)
        initial_ui = {
            "component": "MarkdownMessage",
            "props": {
                "content": f"# {title}\n\n",  # Will be filled by deltas
                "messageId": message_id,  # Important: Frontend needs this to accumulate
            },
        }

        yield create_snapshot_event(
            intention="present_story",
            ui=initial_ui,
            fallback_text=f"Story: {title}",
            target_level=user_level,
        )

        # 3. Stream content as text deltas
        words = story_content.split()
        for i in range(0, len(words), chunk_size):
            chunk = " ".join(words[i : i + chunk_size]) + " "

            yield create_text_delta(
                message_id=message_id,
                delta=chunk,
                field_path="content",  # MarkdownMessage uses "content" prop
            )

            # Simulate realistic streaming delay
            await asyncio.sleep(0.05)

        # 4. End stream
        yield StreamEndEvent(session_id=session_id)
