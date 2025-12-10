import pytest
from unittest.mock import MagicMock
from app.generators.theme import ThemeVocabulary, generate_theme_sync
from datetime import datetime

# Fixture for mock client
@pytest.fixture
def mock_client():
    client = MagicMock()
    return client

def test_theme_vocabulary_from_payload_defaults():
    # Test fallback to defaults
    vocab = ThemeVocabulary.from_payload({"topic": "Test"})
    vocab.ensure_defaults()

    assert vocab.topic == "Test"
    assert "subject" in vocab.slots
    assert vocab.slots["subject"] # Should not be empty (defaults)
    assert len(vocab.verbs) > 0 # Should have default verbs

def test_theme_vocabulary_parsing():
    payload = {
        "topic": "Space",
        "slots": {
            "subject": ["Astronaut", "Alien"],
            "object": "Planet" # String input
        },
        "verbs": [
            {"base": "fly", "past": "flew", "participle": "flown"}
        ]
    }

    vocab = ThemeVocabulary.from_payload(payload)

    assert vocab.topic == "Space"
    assert vocab.slots["subject"] == ["Astronaut", "Alien"]
    assert vocab.slots["object"] == ["Planet"] # Converted to list
    assert len(vocab.verbs) == 1
    assert vocab.verbs[0].base == "fly"

def test_generate_theme_sync(mock_client):
    # Mock LLM Response
    mock_response = MagicMock()
    mock_response.choices[0].message.content = """
    {
        "topic": "Adventure",
        "slots": {
            "subject": ["Explorer"],
            "object": ["Map"]
        },
        "verbs": [
            {"base": "climb", "past": "climbed", "participle": "climbed"}
        ]
    }
    """
    mock_client.chat.completions.create.return_value = mock_response

    vocab = generate_theme_sync("Adventure", mock_client)

    assert vocab.topic == "Adventure"
    assert "Explorer" in vocab.slots["subject"]
    assert "climb" == vocab.verbs[0].base

def test_generate_theme_sync_failure(mock_client):
    mock_client.chat.completions.create.side_effect = Exception("API Error")

    with pytest.raises(RuntimeError):
        generate_theme_sync("ErrorTopic", mock_client)

def test_generate_theme_context_avoidance(mock_client):
    # This checks if the previous vocab is used to build context
    previous = ThemeVocabulary(
        topic="Adventure",
        generated_at="now",
        slots={"subject": ["OldHero"]},
        verbs=[]
    )

    mock_response = MagicMock()
    mock_response.choices[0].message.content = '{"topic": "Adventure"}'
    mock_client.chat.completions.create.return_value = mock_response

    generate_theme_sync("Adventure", mock_client, previous_vocab=previous)

    # Check if context was passed in messages
    call_args = mock_client.chat.completions.create.call_args
    _, kwargs = call_args
    messages = kwargs["messages"]
    user_content = messages[1]["content"]

    assert "OldHero" in user_content
    assert "Avoid repeating" in user_content
