import pytest
from app.services.aui_events import create_state_diff, StateDeltaEvent

def test_create_state_diff_simple():
    old = {"a": 1, "b": 2}
    new = {"a": 1, "b": 3}
    
    event = create_state_diff(old, new)
    assert isinstance(event, StateDeltaEvent)
    assert len(event.delta) == 1
    assert event.delta[0]["op"] == "replace"
    assert event.delta[0]["path"] == "/b"
    assert event.delta[0]["value"] == 3

def test_create_state_diff_nested():
    old = {
        "component": "Card",
        "props": {
            "title": "Hello",
            "items": ["a", "b"]
        }
    }
    new = {
        "component": "Card",
        "props": {
            "title": "Hello",
            "items": ["a", "c"] # Changed b -> c
        }
    }
    
    event = create_state_diff(old, new)
    assert len(event.delta) == 1
    # fast-json-patch might output replace /props/items/1 or similar
    op = event.delta[0]
    assert op["op"] == "replace"
    assert op["path"] == "/props/items/1"
    assert op["value"] == "c"

def test_create_state_diff_add():
    old = {"list": [1]}
    new = {"list": [1, 2]}
    
    event = create_state_diff(old, new)
    assert event.delta[0]["op"] == "add"
    assert event.delta[0]["path"] == "/list/1"
    assert event.delta[0]["value"] == 2
