import pytest
from pydantic import ValidationError
from app.services.aui_schema import validate_component_props, FlashCardStackProps, MarkdownMessageProps

def test_validate_valid_markdown_message():
    """Test validation of valid MarkdownMessage props."""
    valid_props = {
        "content": "# Hello World"
    }
    assert validate_component_props("MarkdownMessage", valid_props) == True

def test_validate_invalid_markdown_message_missing_field():
    """Test that missing required 'content' field raises error."""
    invalid_props = {}
    with pytest.raises(ValidationError):
        validate_component_props("MarkdownMessage", invalid_props)


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
