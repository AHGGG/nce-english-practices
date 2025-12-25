import pytest
import asyncio
from app.services.aui_input import AUIInputService, AUIUserInput

# NOTE: This test relies on SQLite fallback logic in AUIInputService

@pytest.fixture
def input_service():
    # Use a fresh instance for tests to avoid state pollution
    return AUIInputService()

@pytest.mark.asyncio
async def test_input_queue_flow(input_service, db_session):
    """Test basic submit and retrieve flow."""
    session_id = "test-session-1"
    
    # 1. Start waiting (in background)
    wait_task = asyncio.create_task(
        input_service.wait_for_input(session_id, timeout=1.0)
    )
    
    # 2. Submit input
    input_data = AUIUserInput(session_id=session_id, action="confirm")
    await asyncio.sleep(0.1) # Ensure waiter is listening
    
    # Pass db_session (SQLite fallback will trigger direct put to queue)
    success = await input_service.submit_input(db_session, input_data)
    assert success is True
    
    # 3. Verify retrieval
    result = await wait_task
    assert result is not None
    assert result.session_id == session_id
    assert result.action == "confirm"

@pytest.mark.asyncio
async def test_input_timeout(input_service):
    """Test timeout behavior."""
    session_id = "test-session-timeout"
    
    result = await input_service.wait_for_input(session_id, timeout=0.1)
    assert result is None

@pytest.mark.asyncio
async def test_queue_isolation(input_service, db_session):
    """Test that inputs don't leak between sessions."""
    s1 = "session-1"
    s2 = "session-2"
    
    # Start waiting for both
    t1 = asyncio.create_task(input_service.wait_for_input(s1, timeout=1.0))
    t2 = asyncio.create_task(input_service.wait_for_input(s2, timeout=0.2))
    
    await asyncio.sleep(0.1)
    
    # Submit to S1
    # This triggers direct memory dispatch in SQLite mode because t1 created the queue
    await input_service.submit_input(db_session, AUIUserInput(session_id=s1, action="s1-action"))
    
    # S2 should timeout (return None)
    result_s2 = await t2
    assert result_s2 is None
    
    # S1 should get data
    result_s1 = await t1
    assert result_s1 is not None
    assert result_s1.action == "s1-action"
