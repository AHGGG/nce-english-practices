import asyncio
import logging
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
import asyncpg
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.orm import AUIInputRecord
from app.config import settings

logger = logging.getLogger(__name__)


class AUIUserInput(BaseModel):
    """Schema for user input sent from frontend to agent."""

    session_id: str = Field(..., description="Unique session identifier")
    action: str = Field(
        ..., description="Action identifier (e.g., 'confirm', 'submit')"
    )
    payload: Dict[str, Any] = Field(
        default_factory=dict, description="Additional data associated with the action"
    )
    client_timestamp: Optional[int] = Field(None, description="Client-side timestamp")


class AUIInputService:
    """
    Manages persistent user input using PostgreSQL LISTEN/NOTIFY.

    Architecture:
    1. submit_input(): Inserts to DB -> NOTIFY channel
    2. listener_task: Listens to Postgres channel -> Distributes to local queues
    3. wait_for_input(): Awaits local queue
    """

    _instance = None
    CHANNEL_NAME = "aui_input_channel"

    def __init__(self):
        # Map session_id -> asyncio.Queue (Local dispatch)
        self._waiting_queues: Dict[str, asyncio.Queue] = {}
        self._listener_task: Optional[asyncio.Task] = None
        self._shutdown_event = asyncio.Event()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = AUIInputService()
        return cls._instance

    def _get_queue(self, session_id: str) -> asyncio.Queue:
        if session_id not in self._waiting_queues:
            self._waiting_queues[session_id] = asyncio.Queue()
        return self._waiting_queues[session_id]

    async def start_listener(self):
        """Start the background Postgres listener task."""
        if self._listener_task and not self._listener_task.done():
            return

        logger.info("Starting AUI Postgres Listener...")
        self._shutdown_event.clear()
        self._listener_task = asyncio.create_task(self._listen_loop())

    async def stop_listener(self):
        """Stop the background listener."""
        logger.info("Stopping AUI Postgres Listener...")
        self._shutdown_event.set()
        if self._listener_task:
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass
            self._listener_task = None

        # CLEAR QUEUES: Queues are bound to the event loop.
        # Since we are stopping, the loop might be closing.
        # We must clear them to force recreation on next start with new loop.
        self._waiting_queues.clear()

    async def _listen_loop(self):
        """
        Long-running loop that listens for LISTEN/NOTIFY messages.
        Uses raw asyncpg connection for efficiency.
        """
        conn = None
        while not self._shutdown_event.is_set():
            try:
                # Extract clean connection params from database URL
                # DATABASE_URL format: postgresql+asyncpg://user:pass@host:port/dbname
                db_url = str(settings.DATABASE_URL).replace("+asyncpg", "")

                conn = await asyncpg.connect(db_url)

                async def handle_notify(connection, pid, channel, payload):
                    """Callback for NOTIFY events."""
                    session_id = payload
                    logger.debug(f"Received NOTIFY for session: {session_id}")

                    # Only fetch if we have a local waiter
                    if session_id in self._waiting_queues:
                        # We must fetch the actual data in a separate task to not block the listener
                        asyncio.create_task(self._fetch_and_dispatch(session_id))

                await conn.add_listener(self.CHANNEL_NAME, handle_notify)
                logger.info(f"Listening on channel: {self.CHANNEL_NAME}")

                # Keep connection alive
                while not self._shutdown_event.is_set():
                    await asyncio.sleep(1)
                    if conn.is_closed():
                        break

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in AUI listener loop: {e}")
                await asyncio.sleep(5)  # Backoff
            finally:
                if conn:
                    try:
                        await conn.close()
                    except Exception:
                        pass

    async def _fetch_and_dispatch(self, session_id: str):
        """Fetches pending inputs from DB and puts them in local queue."""
        # We need a new session here since this is triggered by callback
        from app.core.db import AsyncSessionLocal

        async with AsyncSessionLocal() as session:
            try:
                # Fetch unprocessed records for this session
                stmt = (
                    select(AUIInputRecord)
                    .where(
                        AUIInputRecord.session_id == session_id,
                        AUIInputRecord.processed.is_(False),
                    )
                    .order_by(AUIInputRecord.created_at.asc())
                )

                result = await session.execute(stmt)
                records = result.scalars().all()

                for record in records:
                    # Convert to Pydantic
                    input_obj = AUIUserInput(
                        session_id=record.session_id,
                        action=record.action,
                        payload=record.payload,
                    )

                    # Dispatch to local queue
                    if session_id in self._waiting_queues:
                        await self._waiting_queues[session_id].put(input_obj)

                    # Mark processed
                    record.processed = True

                await session.commit()

            except Exception as e:
                logger.error(f"Error dispatching input for {session_id}: {e}")

    async def submit_input(self, db: AsyncSession, input_data: AUIUserInput) -> bool:
        """
        Persist user input and notify waiters.
        Now requires an active DB session.
        Handles SQLite (for tests) by falling back to direct queue injection.
        """
        try:
            # 1. Insert Record
            record = AUIInputRecord(
                session_id=input_data.session_id,
                action=input_data.action,
                payload=input_data.payload,
            )
            db.add(record)
            await db.commit()  # Commit to save record

            # 2. Send Notification
            is_postgres = True

            # Check dialect if possible (Mock sessions might not have bind set up same way)
            if db.bind and getattr(db.bind.dialect, "name", "") == "sqlite":
                is_postgres = False

            if is_postgres:
                try:
                    await db.execute(
                        select(func.pg_notify(self.CHANNEL_NAME, input_data.session_id))
                    )
                    await db.commit()
                except Exception:
                    # It might fail if db is actually SQLite but check returned persistent
                    # or if functional test environment
                    # logger.debug(f"pg_notify failed: {pg_e}")
                    is_postgres = False  # Fallback to direct

            if not is_postgres:
                # TEST MODE / FALLBACK
                # Direct dispatch to local queue if we are testing with SQLite
                logger.info(
                    f"Using direct memory dispatch for session {input_data.session_id} (Fallback/Test)"
                )
                if input_data.session_id in self._waiting_queues:
                    await self._waiting_queues[input_data.session_id].put(input_data)

            logger.info(f"Persisted input for session {input_data.session_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to submit input: {e}")
            await db.rollback()
            return False

    async def wait_for_input(
        self, session_id: str, timeout: float = 60.0
    ) -> Optional[AUIUserInput]:
        """
        Blocks until user input is received for the given session_id.
        Waits on the local queue which is fed by the Postgres listener.
        """
        # Ensure we are listening for this session locally
        queue = self._get_queue(session_id)

        # Check for any existing unprocessed DB records first (Handling Restart/Race capability)
        # This catch-up logic ensures if input arrived while we were dead, we pick it up.
        asyncio.create_task(self._fetch_and_dispatch(session_id))

        try:
            logger.debug(
                f"Waiting for input on session {session_id} (timeout={timeout}s)..."
            )
            input_data = await asyncio.wait_for(queue.get(), timeout=timeout)
            logger.debug(
                f"Resumed session {session_id} with action: {input_data.action}"
            )
            return input_data
        except asyncio.TimeoutError:
            logger.warning(f"Timeout waiting for input on session {session_id}")
            return None
        except Exception as e:
            logger.error(f"Error waiting for input: {e}")
            return None
        finally:
            # Cleanup queue if empty to prevent memory leak
            if session_id in self._waiting_queues and queue.empty():
                del self._waiting_queues[session_id]


from sqlalchemy import func

# Singleton accessor
input_service = AUIInputService.get_instance()
