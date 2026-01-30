import pytest
import socket
from unittest.mock import patch
from app.core.utils import parse_llm_json, validate_url_security


def test_parse_simple_json():
    content = '{"key": "value"}'
    result = parse_llm_json(content)
    assert result == {"key": "value"}


def test_parse_markdown_json():
    content = '```json\n{"key": "value"}\n```'
    result = parse_llm_json(content)
    assert result == {"key": "value"}


def test_parse_markdown_no_lang():
    content = '```\n{"key": "value"}\n```'
    result = parse_llm_json(content)
    assert result == {"key": "value"}


def test_parse_dirty_json():
    content = 'Here is the json: {"key": "value"} thanks'
    result = parse_llm_json(content)
    assert result == {"key": "value"}


def test_parse_dirty_list_json():
    content = 'Sure: ["a", "b"]'
    result = parse_llm_json(content)
    assert result == ["a", "b"]


def test_parse_invalid_json():
    content = '{"key": "value"'  # missing brace
    with pytest.raises(RuntimeError):
        parse_llm_json(content)


def test_validate_url_security_private_ip():
    with patch("socket.getaddrinfo") as mock_getaddrinfo:
        # Simulate resolving to 127.0.0.1
        mock_getaddrinfo.return_value = [
            (socket.AF_INET, socket.SOCK_STREAM, 6, '', ('127.0.0.1', 80))
        ]

        with pytest.raises(ValueError, match="restricted IP"):
            validate_url_security("http://localhost/secret")


def test_validate_url_security_public_ip():
    with patch("socket.getaddrinfo") as mock_getaddrinfo:
        # Simulate resolving to 8.8.8.8 (Public)
        mock_getaddrinfo.return_value = [
            (socket.AF_INET, socket.SOCK_STREAM, 6, '', ('8.8.8.8', 80))
        ]

        # Should not raise
        validate_url_security("http://google.com")
