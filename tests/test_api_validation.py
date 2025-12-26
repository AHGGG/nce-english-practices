import pytest
from pydantic import ValidationError
from app.api.routers.content import ThemeRequest, StoryRequest, SentenceRequest

# Valid inputs
VALID_TOPIC = "Travel"
VALID_TENSE = "Past Simple"
VALID_SENTENCE_FIELDS = {
    "topic": "Food",
    "time_layer": "Present",
    "subject": "I",
    "verb_base": "eat",
    "verb_past": "ate",
    "verb_participle": "eaten",
    "object": "apple",
    "manner": "quickly",
    "place": "home",
    "time": "now"
}

# Invalid inputs
INVALID_XSS = "<script>alert(1)</script>"
INVALID_LONG = "a" * 101
INVALID_CHARS = "topic # $ @"  # Some symbols might be allowed, checking regex
# The regex is r'^[\w\s\.,!?\'\";:()\-&%+=]+$'
# Allowed: word chars, whitespace, . , ! ? ' " ; : ( ) - & % + =
# Not allowed: < > * / \ [ ] { } ^ ~ ` # $ @ |
INVALID_SYMBOLS = "topic < > *"

def test_theme_request_valid():
    req = ThemeRequest(topic=VALID_TOPIC)
    assert req.topic == VALID_TOPIC

def test_theme_request_invalid_length():
    with pytest.raises(ValidationError):
        ThemeRequest(topic=INVALID_LONG)

def test_theme_request_invalid_pattern():
    with pytest.raises(ValidationError):
        ThemeRequest(topic=INVALID_XSS)
    with pytest.raises(ValidationError):
        ThemeRequest(topic=INVALID_SYMBOLS)

def test_story_request_valid():
    req = StoryRequest(topic=VALID_TOPIC, target_tense=VALID_TENSE)
    assert req.topic == VALID_TOPIC
    assert req.target_tense == VALID_TENSE

def test_story_request_invalid():
    with pytest.raises(ValidationError):
        StoryRequest(topic=INVALID_XSS, target_tense=VALID_TENSE)
    with pytest.raises(ValidationError):
        StoryRequest(topic=VALID_TOPIC, target_tense=INVALID_LONG)

def test_sentence_request_valid():
    req = SentenceRequest(**VALID_SENTENCE_FIELDS)
    assert req.subject == "I"

def test_sentence_request_invalid_field():
    # Test one field invalid
    invalid_data = VALID_SENTENCE_FIELDS.copy()
    invalid_data["subject"] = INVALID_XSS
    with pytest.raises(ValidationError):
        SentenceRequest(**invalid_data)

def test_sentence_request_optional_fields():
    # Test optional fields (which default to "")
    # But they still have validation if provided
    req = SentenceRequest(
        topic="A", time_layer="B", subject="C",
        verb_base="D", verb_past="E", verb_participle="F"
    )
    assert req.object == ""

    # Passing invalid to optional
    with pytest.raises(ValidationError):
        SentenceRequest(
            topic="A", time_layer="B", subject="C",
            verb_base="D", verb_past="E", verb_participle="F",
            object=INVALID_XSS
        )
