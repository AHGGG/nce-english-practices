import pytest
from unittest.mock import patch, MagicMock
from app.services.voice import get_ephemeral_token, VOICE_SYSTEM_PROMPT

@pytest.fixture
def mock_env_vars(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-api-key")
    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-deepseek-key")

def test_get_ephemeral_token_success(mock_env_vars):
    # We also need to reload the module or patch the module level constant if it was already loaded
    # But since we use get_ephemeral_token which accesses os.getenv indirectly?
    # Wait, the code reads GEMINI_API_KEY at module level.
    # So we need to patch the module attribute.

    with patch("app.services.voice.GEMINI_API_KEY", "test-api-key"):
        result = get_ephemeral_token(topic="Travel", mission_context="Buy a ticket")

        assert result["token"] == "test-api-key"
        assert "wss://" in result["url"]
        assert "key=test-api-key" in result["url"]
        assert "Travel" in result["system_instruction"]
        assert "Buy a ticket" in result["system_instruction"]
        assert result["model"].startswith("models/")

def test_get_ephemeral_token_no_key():
    with patch("app.services.voice.GEMINI_API_KEY", None):
        with pytest.raises(RuntimeError):
            get_ephemeral_token(topic="Travel", mission_context="Buy a ticket")

def test_system_prompt_formatting():
    # Verify the prompt template works as expected
    prompt = VOICE_SYSTEM_PROMPT.format(topic="Food", mission_context="Order pizza")
    assert "Food" in prompt
    assert "Order pizza" in prompt
    assert "concise" in prompt
