import pytest
from unittest.mock import MagicMock, patch, mock_open, AsyncMock
from app.generators.theme import ThemeVocabulary, generate_theme_sync
from app.generators.scenario import generate_scenario, grade_scenario_response
from app.generators.quiz import generate_quiz
from app.generators.sentence import generate_sentences_for_time_layer
from app.generators.story import generate_story_stream
from datetime import datetime
import json

# Fixture for mock client
@pytest.fixture
def mock_client():
    client = MagicMock()
    return client

# --- Theme Tests ---

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

    # Should NOT raise RuntimeError anymore, should return fallback
    result = generate_theme_sync("ErrorTopic", mock_client)
    
    assert result.topic == "ErrorTopic"
    assert "practice" in [v.base for v in result.verbs]



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

# --- Scenario Tests ---

def test_generate_scenario_success(mock_client):
    mock_response = MagicMock()
    mock_response.choices[0].message.content = """
    {
        "situation": "At the store",
        "goal": "Buy milk",
        "role": "Customer",
        "starter": "Hello",
        "suggestions": ["Do you have milk?"]
    }
    """
    mock_client.chat.completions.create.return_value = mock_response

    result = generate_scenario(mock_client, topic="Shopping", tense="Present", aspect="Simple")

    assert result.situation == "At the store"
    assert result.goal == "Buy milk"

def test_generate_scenario_failure(mock_client):
    mock_client.chat.completions.create.side_effect = Exception("Error")

    result = generate_scenario(mock_client, topic="Shopping", tense="Present", aspect="Simple")

    # Should fallback
    assert "Error generating scenario" in result.situation

def test_grade_scenario_response_success(mock_client):
    mock_response = MagicMock()
    mock_response.choices[0].message.content = """
    {
        "is_pass": true,
        "feedback": "Good job",
        "better_response": "May I have milk?"
    }
    """
    mock_client.chat.completions.create.return_value = mock_response

    result = grade_scenario_response(mock_client, situation="Shop", goal="Buy", user_input="Milk pls", tense="Present")

    assert result.is_pass is True
    assert result.feedback == "Good job"
    assert result.improved_version == "May I have milk?"
    assert result.user_input == "Milk pls"

# --- Quiz Tests ---

def test_generate_quiz_success(mock_client):
    mock_response = MagicMock()
    # Mocking format from new prompt template
    mock_response.choices[0].message.content = """
    {
        "question": "He ___ to the store.",
        "options": ["goes", "go"],
        "correct_index": 0,
        "explanation": "Subject is He."
    }
    """
    mock_client.chat.completions.create.return_value = mock_response

    result = generate_quiz(mock_client, topic="Daily", tense="Present", aspect="Simple", correct_sentence="He goes.")

    assert result.question_context == "He ___ to the store."
    assert len(result.options) == 2
    assert result.options[0].text == "goes"
    assert result.options[0].is_correct is True
    assert result.options[1].is_correct is False
    assert result.options[0].explanation == "Subject is He."

def test_generate_quiz_failure(mock_client):
    mock_client.chat.completions.create.side_effect = Exception("Error")

    result = generate_quiz(mock_client, topic="Daily", tense="Present", aspect="Simple", correct_sentence="He goes.")

    assert "Backend Error" in result.options[0].explanation

# --- Sentence Tests ---

def test_generate_sentences_success(mock_client):
    mock_response = MagicMock()
    mock_response.choices[0].message.content = """
    {
        "sentences": ["I ran home."]
    }
    """
    mock_client.chat.completions.create.return_value = mock_response

    with patch("app.generators.sentence.save_cached_sentences") as mock_save:
        result = generate_sentences_for_time_layer(
            topic="Run",
            time_layer="past",
            subject="I",
            verb_base="run",
            verb_past="ran",
            verb_participle="run",
            client=mock_client
        )

        assert result["sentences"] == ["I ran home."]
        assert "generated_at" in result
        mock_save.assert_called_once()

# --- Story Tests ---

@pytest.mark.asyncio
async def test_generate_story_stream_success(mock_client):
    # Mock async stream response
    # The client.chat.completions.create returns a Coroutine which resolves to a Stream object
    # The Stream object is an async iterator

    mock_client.chat.completions.create = AsyncMock()

    # Create chunks
    chunks = [
        MagicMock(choices=[MagicMock(delta=MagicMock(content="Once upon "))]),
        MagicMock(choices=[MagicMock(delta=MagicMock(content="a time."))]),
        MagicMock(choices=[MagicMock(delta=MagicMock(content="---METADATA---"))]),
        MagicMock(choices=[MagicMock(delta=MagicMock(content='{"title": "The End"}'))])
    ]

    async def mock_stream_gen():
        for c in chunks:
            yield c

    mock_client.chat.completions.create.return_value = mock_stream_gen()

    with patch("app.database.log_story", new_callable=AsyncMock) as mock_log:

        results = []
        async for chunk in generate_story_stream("Fairy", "Past", mock_client):
            data = json.loads(chunk.strip())
            results.append(data)

        # Verify Text Chunks
        text_content = "".join([r["chunk"] for r in results if r["type"] == "text"])
        assert "Once upon a time." in text_content

        # Verify Metadata Event
        data_event = next((r for r in results if r.get("type") == "data"), None)
        assert data_event is not None
        assert data_event["story"]["title"] == "The End"
        assert data_event["story"]["content"] == "Once upon a time."

        # Verify DB Log
        mock_log.assert_called_once()

@pytest.mark.asyncio
async def test_generate_story_stream_failure(mock_client):
    mock_client.chat.completions.create = AsyncMock()
    mock_client.chat.completions.create.side_effect = Exception("API Error")

    results = []
    async for chunk in generate_story_stream("Fairy", "Past", mock_client):
        data = json.loads(chunk.strip())
        results.append(data)

    assert len(results) == 1
    assert "error" in results[0]
