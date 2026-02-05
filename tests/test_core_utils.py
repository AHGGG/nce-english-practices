import pytest
from app.core.utils import parse_llm_json, validate_url_security
from unittest.mock import patch
import socket


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


def test_validate_url_security_safe():
    with patch("socket.getaddrinfo") as mock_getaddrinfo:
        # Mock public IP (e.g. 8.8.8.8)
        # family, type, proto, canonname, sockaddr
        mock_getaddrinfo.return_value = [(socket.AF_INET, socket.SOCK_STREAM, 6, '', ('8.8.8.8', 80))]

        url = "http://google.com"
        assert validate_url_security(url) == url


def test_validate_url_security_unsafe_private():
    with patch("socket.getaddrinfo") as mock_getaddrinfo:
        # Mock private IP (e.g. 192.168.1.1)
        mock_getaddrinfo.return_value = [(socket.AF_INET, socket.SOCK_STREAM, 6, '', ('192.168.1.1', 80))]

        with pytest.raises(ValueError, match="unsafe IP address"):
            validate_url_security("http://internal.service")


def test_validate_url_security_unsafe_loopback():
    with patch("socket.getaddrinfo") as mock_getaddrinfo:
        # Mock loopback IP
        mock_getaddrinfo.return_value = [(socket.AF_INET, socket.SOCK_STREAM, 6, '', ('127.0.0.1', 80))]

        with pytest.raises(ValueError, match="unsafe IP address"):
            validate_url_security("http://localhost")


def test_validate_url_security_unsafe_0000():
    with patch("socket.getaddrinfo") as mock_getaddrinfo:
        # Mock 0.0.0.0
        mock_getaddrinfo.return_value = [(socket.AF_INET, socket.SOCK_STREAM, 6, '', ('0.0.0.0', 80))]

        with pytest.raises(ValueError, match="unsafe IP address"):
            validate_url_security("http://0.0.0.0")
