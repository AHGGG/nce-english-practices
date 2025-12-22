import pytest
from pydantic import ValidationError
from app.services.aui_schema import validate_component_props, StoryReaderProps, FlashCardStackProps

def test_validate_valid_story_reader():
    """Test validation of valid StoryReader props."""
    valid_props = {
        "story": {"title": "Test", "content": "Content"},
        "coachMode": True,
        "messageId": "123"
    }
    assert validate_component_props("StoryReader", valid_props) == True

def test_validate_invalid_story_reader_missing_field():
    """Test that missing required 'story' field raises error."""
    invalid_props = {
        "coachMode": True
    }
    with pytest.raises(ValidationError):
        validate_component_props("StoryReader", invalid_props)

def test_validate_valid_flash_card_stack():
    """Test validation of valid FlashCardStack props."""
    valid_props = {
        "words": ["apple", "banana"],
        "current_index": 1
    }
    assert validate_component_props("FlashCardStack", valid_props) == True

def test_validate_unknown_component_lenient():
    """Test that unknown components pass validation (lenient mode)."""
    # UnknownComponent is not in COMPONENT_SCHEMAS
    assert validate_component_props("UnknownComponent", {"foo": "bar"}) == True

def test_validate_interactive_demo():
    """Test validation of InteractiveDemo props."""
    valid_props = {
        "status": "waiting_input",
        "message": "Please confirm",
        "options": [{"label": "Yes", "action": "yes"}]
    }
    assert validate_component_props("InteractiveDemo", valid_props) == True

def test_validate_interactive_demo_invalid_status():
    """Test that invalid types raise error (status should be str, is int)."""
    # Pydantic might coerce int to str, so let's try something really wrong like a list for message
    invalid_props = {
        "status": "processing",
        "message": ["not", "a", "string"] 
    }
    with pytest.raises(ValidationError):
        validate_component_props("InteractiveDemo", invalid_props)
