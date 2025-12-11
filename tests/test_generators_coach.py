import pytest
from unittest.mock import patch, AsyncMock
from app.generators.coach import polish_sentence

@pytest.fixture
def mock_llm_service():
    with patch("app.generators.coach.llm_service") as mock_service:
        # Important: chat_complete must be an AsyncMock because it is awaited
        mock_service.chat_complete = AsyncMock()
        mock_service.async_client = True # Pass the check
        yield mock_service

@pytest.mark.asyncio
async def test_polish_sentence_success(mock_llm_service):
    mock_llm_service.chat_complete.return_value = "Better sentence."

    context = [{"role": "user", "content": "Bad sentence"}]
    result = await polish_sentence("Bad sentence", context)

    assert result == "Better sentence."
    mock_llm_service.chat_complete.assert_called_once()

    # Verify prompt construction
    call_args = mock_llm_service.chat_complete.call_args
    messages = call_args[1]["messages"] # kwargs['messages']
    assert len(messages) == 2
    assert messages[0]["role"] == "system"
    assert "user: Bad sentence" in messages[1]["content"] # Context check

@pytest.mark.asyncio
async def test_polish_sentence_no_client(mock_llm_service):
    mock_llm_service.async_client = None
    result = await polish_sentence("test", [])
    assert "Error" in result

@pytest.mark.asyncio
async def test_polish_sentence_failure(mock_llm_service):
    mock_llm_service.chat_complete.side_effect = Exception("API Fail")
    result = await polish_sentence("test", [])
    assert "Error: API Fail" in result
