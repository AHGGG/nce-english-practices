import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from app.services.chat import start_new_mission, handle_chat_turn

@pytest.fixture
def mock_llm_service():
    with patch("app.services.chat.llm_service") as mock_service:
        # Important: chat_complete must be an AsyncMock because it is awaited
        mock_service.chat_complete = AsyncMock()
        yield mock_service

@pytest.fixture
def mock_db_funcs():
    with patch("app.services.chat.create_chat_session", new_callable=AsyncMock) as create_session, \
         patch("app.services.chat.get_chat_session", new_callable=AsyncMock) as get_session, \
         patch("app.services.chat.update_chat_history", new_callable=AsyncMock) as update_history:
        yield create_session, get_session, update_history

@pytest.mark.asyncio
async def test_start_new_mission_success(mock_llm_service, mock_db_funcs):
    create_session, _, _ = mock_db_funcs

    # Mock LLM response for mission generation
    mock_llm_service.async_client = True
    mock_llm_service.chat_complete.side_effect = [
        # 1. Mission Generation Response
        """```json
        {
            "title": "Travel",
            "description": "Buy a ticket",
            "required_grammar": ["Past Simple"]
        }
        ```""",
        # 2. First Message Generation
        "Hello traveler!"
    ]

    create_session.return_value = "session-123"

    result = await start_new_mission("Travel", "Past", "Simple")

    assert result["session_id"] == "session-123"
    assert result["mission"]["title"] == "Travel"
    assert result["first_message"] == "Hello traveler!"

    create_session.assert_called_once()

@pytest.mark.asyncio
async def test_start_new_mission_failure(mock_llm_service):
    mock_llm_service.async_client = True
    # Raise exception during generation
    mock_llm_service.chat_complete.side_effect = Exception("API Error")

    result = await start_new_mission("Travel", "Past", "Simple")

    assert result["session_id"] == "error"
    assert result["mission"]["title"] == "Free Chat"

@pytest.mark.asyncio
async def test_handle_chat_turn_success(mock_llm_service, mock_db_funcs):
    _, get_session, update_history = mock_db_funcs

    mock_llm_service.async_client = True
    mock_llm_service.chat_complete.return_value = "I am fine."

    get_session.return_value = {
        "mission": {"description": "Talk", "required_grammar": []},
        "history": [{"role": "assistant", "content": "Hi"}]
    }

    result = await handle_chat_turn("session-123", "How are you?")

    assert result["reply"] == "I am fine."
    assert len(result["history"]) == 3 # init + user + ai
    update_history.assert_called_once()

@pytest.mark.asyncio
async def test_handle_chat_turn_not_found(mock_db_funcs):
    _, get_session, _ = mock_db_funcs
    get_session.return_value = None

    result = await handle_chat_turn("session-999", "Hi")

    assert "error" in result
    assert result["error"] == "Session not found"
