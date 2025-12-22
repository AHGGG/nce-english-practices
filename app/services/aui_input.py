import asyncio
import logging
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

class AUIUserInput(BaseModel):
    """Schema for user input sent from frontend to agent."""
    session_id: str = Field(..., description="Unique session identifier")
    action: str = Field(..., description="Action identifier (e.g., 'confirm', 'submit')")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Additional data associated with the action")
    client_timestamp: Optional[int] = Field(None, description="Client-side timestamp")

class AUIInputService:
    """
    Manages in-memory queues for bi-directional AUI communication.
    Use this to allow an Agent to 'pause' and wait for user input.
    """
    _instance = None
    
    def __init__(self):
        # Map session_id -> asyncio.Queue
        self._input_queues: Dict[str, asyncio.Queue] = {}

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = AUIInputService()
        return cls._instance

    def _get_queue(self, session_id: str) -> asyncio.Queue:
        if session_id not in self._input_queues:
            self._input_queues[session_id] = asyncio.Queue()
        return self._input_queues[session_id]

    async def submit_input(self, input_data: AUIUserInput) -> bool:
        """
        Push user input into the session's queue.
        Returns True if successful.
        """
        try:
            queue = self._get_queue(input_data.session_id)
            await queue.put(input_data)
            logger.info(f"Received input for session {input_data.session_id}: {input_data.action}")
            return True
        except Exception as e:
            logger.error(f"Failed to submit input for session {input_data.session_id}: {e}")
            return False

    async def wait_for_input(self, session_id: str, timeout: float = 60.0) -> Optional[AUIUserInput]:
        """
        Blocks until user input is received for the given session_id, or timeout occurs.
        Returns None if timed out.
        """
        queue = self._get_queue(session_id)
        try:
            logger.debug(f"Waiting for input on session {session_id} (timeout={timeout}s)...")
            input_data = await asyncio.wait_for(queue.get(), timeout=timeout)
            logger.debug(f"Resumed session {session_id} with action: {input_data.action}")
            return input_data
        except asyncio.TimeoutError:
            logger.warning(f"Timeout waiting for input on session {session_id}")
            return None
        except Exception as e:
            logger.error(f"Error waiting for input: {e}")
            return None

    def clear_session(self, session_id: str):
        """Clean up queue for a finished session."""
        if session_id in self._input_queues:
            del self._input_queues[session_id]

# Singleton accessor
input_service = AUIInputService.get_instance()
