import pytest
from app.core.utils import parse_llm_json


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
