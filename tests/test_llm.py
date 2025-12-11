import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from app.services.llm import LLMService

# Since LLMService is a singleton instantiated at import time,
# we can test the class directly or patch the instance.

def test_llm_init_no_keys():
    with patch("app.services.llm.OPENAI_API_KEY", None), \
         patch("app.services.llm.GEMINI_API_KEY", None):
        service = LLMService()
        assert service.sync_client is None
        assert service.async_client is None
        assert service.voice_client is None

def test_llm_init_with_keys():
    with patch("app.services.llm.OPENAI_API_KEY", "sk-test"), \
         patch("app.services.llm.GEMINI_API_KEY", "gemini-test"):
        service = LLMService()
        assert service.sync_client is not None
        assert service.async_client is not None
        assert service.voice_client is not None

def test_chat_complete_sync_success():
    service = LLMService()
    # Mock sync_client
    mock_client = MagicMock()
    mock_completion = MagicMock()
    mock_completion.choices = [MagicMock(message=MagicMock(content="Hello World"))]
    mock_client.chat.completions.create.return_value = mock_completion
    service.sync_client = mock_client

    result = service.chat_complete_sync(messages=[{"role": "user", "content": "Hi"}])
    assert result == "Hello World"
    mock_client.chat.completions.create.assert_called_once()

def test_chat_complete_sync_no_client():
    service = LLMService()
    service.sync_client = None
    with pytest.raises(RuntimeError):
        service.chat_complete_sync(messages=[])

@pytest.mark.asyncio
async def test_chat_complete_async_success():
    service = LLMService()
    # Mock async_client
    mock_client = AsyncMock()
    mock_completion = MagicMock()
    mock_completion.choices = [MagicMock(message=MagicMock(content="Async Hello"))]

    # Correctly mock the async call chain
    mock_client.chat.completions.create.return_value = mock_completion
    service.async_client = mock_client

    result = await service.chat_complete(messages=[{"role": "user", "content": "Hi"}])
    assert result == "Async Hello"
    mock_client.chat.completions.create.assert_called_once()

@pytest.mark.asyncio
async def test_chat_complete_async_no_client():
    service = LLMService()
    service.async_client = None
    with pytest.raises(RuntimeError):
        await service.chat_complete(messages=[])

@pytest.mark.asyncio
async def test_polish_text():
    service = LLMService()
    # Mock chat_complete (internal method)
    with patch.object(service, "chat_complete", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = "Polished text"

        result = await service.polish_text("Bad grammar", context=[{"role": "user", "content": "ctx"}])

        assert result == "Polished text"
        mock_chat.assert_called_once()
        args, kwargs = mock_chat.call_args
        messages = args[0]
        # Verify system prompt + context + user input
        assert len(messages) == 3
        assert messages[0]["role"] == "system"
        assert messages[1]["content"] == "ctx"
        assert messages[2]["content"] == "Bad grammar"
