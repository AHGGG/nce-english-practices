import pytest
from app.database import create_chat_session, get_chat_session, update_chat_history
from app.db_models import ChatSession

@pytest.mark.asyncio
async def test_chat_session_lifecycle(db_session):
    from unittest.mock import patch
    from contextlib import asynccontextmanager

    # Define a context manager that yields the FIXTURE session
    @asynccontextmanager
    async def mock_session_local():
        yield db_session
    
    # Patch app.database.AsyncSessionLocal to return our mock context manager
    # AND patch commit to only flush (preserving test transaction)
    with patch("app.database.AsyncSessionLocal", side_effect=mock_session_local):
        async def fake_commit():
            await db_session.flush()
            
        with patch.object(db_session, 'commit', side_effect=fake_commit):
            mission_data = {"topic": "airport", "goal": "check in"}
            initial_history = [{"role": "system", "content": "You are an agent."}]
            
            # 1. Create
            session_id = await create_chat_session(mission_data, initial_history)
            assert session_id != "error"
            assert len(session_id) > 10
            
            # 2. Get
            data = await get_chat_session(session_id)
            assert data is not None
            assert data["mission"] == mission_data
            assert len(data["history"]) == 1
            
            # 3. Update
            new_history = initial_history + [{"role": "user", "content": "Hello"}]
            await update_chat_history(session_id, new_history)
            
            data_updated = await get_chat_session(session_id)
            assert len(data_updated["history"]) == 2
            assert data_updated["history"][1]["content"] == "Hello"
