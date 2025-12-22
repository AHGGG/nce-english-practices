import pytest
import asyncio
from app.services.aui_input import AUIInputService, AUIUserInput

@pytest.fixture
def input_service():
    # Use a fresh instance for tests to avoid state pollution
    return AUIInputService()

@pytest.mark.asyncio
async def test_input_queue_flow(input_service):
    """Test basic submit and retrieve flow."""
    session_id = "test-session-1"
    
    # 1. Start waiting (in background)
    wait_task = asyncio.create_task(
        input_service.wait_for_input(session_id, timeout=1.0)
    )
    
    # 2. Submit input
    input_data = AUIUserInput(session_id=session_id, action="confirm")
    await asyncio.sleep(0.1) # Ensure waiter is listening
    success = await input_service.submit_input(input_data)
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
async def test_queue_isolation(input_service):
    """Test that inputs don't leak between sessions."""
    s1 = "session-1"
    s2 = "session-2"
    
    # Submit to S1
    await input_service.submit_input(AUIUserInput(session_id=s1, action="s1-action"))
    
    # Try to read from S2 (should timeout/not get S1's data)
    result_s2 = await input_service.wait_for_input(s2, timeout=0.1)
    assert result_s2 is None
    
    # Read from S1 (should get data)
    result_s1 = await input_service.wait_for_input(s1, timeout=0.1)
    assert result_s1 is not None
    assert result_s1.action == "s1-action"
