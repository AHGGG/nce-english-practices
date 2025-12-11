import pytest
from unittest.mock import MagicMock, patch, mock_open
from app.generators.theme import ThemeVocabulary, generate_theme_sync
from app.generators.scenario import generate_scenario, grade_scenario_response
from app.generators.quiz import generate_quiz
from app.generators.sentence import generate_sentences_for_time_layer
from datetime import datetime

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
