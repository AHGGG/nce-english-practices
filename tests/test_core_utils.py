import pytest
from app.core.utils import parse_llm_json, validate_url_security
import pytest


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


def test_validate_url_security_valid():
    """Test valid public URLs."""
    # Google DNS is definitely public
    url = "https://8.8.8.8"
    assert validate_url_security(url) == url

    url = "http://example.com"
    assert validate_url_security(url) == url


def test_validate_url_security_private_ip():
    """Test blocking of private IP addresses."""
    private_ips = [
        "http://127.0.0.1",
        "http://10.0.0.1",
        "http://192.168.1.1",
        "http://172.16.0.1",
        "http://169.254.169.254",  # Cloud metadata
        "http://[::1]",  # IPv6 loopback
    ]

    for url in private_ips:
        with pytest.raises(ValueError, match="blocked"):
            validate_url_security(url)


def test_validate_url_security_localhost():
    """Test blocking of localhost."""
    with pytest.raises(ValueError, match="blocked"):
        validate_url_security("http://localhost")

    with pytest.raises(ValueError, match="blocked"):
        validate_url_security("http://localhost:8080")


def test_validate_url_security_invalid_scheme():
    """Test blocking of non-http/https schemes."""
    with pytest.raises(ValueError, match="scheme"):
        validate_url_security("ftp://example.com")

    with pytest.raises(ValueError, match="scheme"):
        validate_url_security("file:///etc/passwd")


def test_validate_url_security_invalid_url():
    """Test invalid URLs."""
    with pytest.raises(ValueError):
        validate_url_security("not_a_url")
