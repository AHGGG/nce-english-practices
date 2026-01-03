
import pytest
from fastapi import HTTPException
from app.core.utils import validate_input, SAFE_INPUT_PATTERN, SAFE_ID_PATTERN

def test_validate_input_valid():
    assert validate_input("Hello World", SAFE_INPUT_PATTERN) == "Hello World"
    assert validate_input("Hello, World!", SAFE_INPUT_PATTERN) == "Hello, World!"
    assert validate_input("voice-id-123", SAFE_ID_PATTERN) == "voice-id-123"

def test_validate_input_extended_chars():
    # Dates
    assert validate_input("01/01/2024", SAFE_INPUT_PATTERN) == "01/01/2024"
    # Prices
    assert validate_input("Price: $50.00", SAFE_INPUT_PATTERN) == "Price: $50.00"
    # Emails
    assert validate_input("user@example.com", SAFE_INPUT_PATTERN) == "user@example.com"
    # Brackets & Emphasis
    assert validate_input("Bold *text* [link]", SAFE_INPUT_PATTERN) == "Bold *text* [link]"
    # Hashtags
    assert validate_input("#hashtag", SAFE_INPUT_PATTERN) == "#hashtag"

def test_validate_input_invalid_html():
    with pytest.raises(HTTPException) as exc:
        validate_input("<script>alert(1)</script>", SAFE_INPUT_PATTERN)
    assert exc.value.status_code == 400
    assert "Invalid format" in exc.value.detail

def test_validate_input_invalid_shell():
    with pytest.raises(HTTPException) as exc:
        validate_input("text | rm -rf /", SAFE_INPUT_PATTERN)
    assert exc.value.status_code == 400

    with pytest.raises(HTTPException) as exc:
        validate_input("text > output", SAFE_INPUT_PATTERN)
    assert exc.value.status_code == 400

def test_validate_input_invalid_id():
    with pytest.raises(HTTPException) as exc:
        validate_input("voice id with spaces", SAFE_ID_PATTERN)
    assert exc.value.status_code == 400

if __name__ == "__main__":
    # simple manual run if pytest not available
    try:
        test_validate_input_valid()
        test_validate_input_extended_chars()
        print("Valid input tests passed")
        test_validate_input_invalid_html()
        print("Invalid HTML test passed")
        test_validate_input_invalid_shell()
        print("Invalid Shell test passed")
        test_validate_input_invalid_id()
        print("Invalid ID test passed")
    except Exception as e:
        print(f"Tests failed: {e}")
        exit(1)
