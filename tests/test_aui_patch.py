import pytest
from app.services.aui_events import create_state_diff, StateDeltaEvent
import jsonpatch
import copy

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


def test_empty_diff():
    """Test that identical states produce no patch"""
    state = {"value": 42, "name": "test"}
    event = create_state_diff(state, state)
    assert len(event.delta) == 0


def test_vocabulary_flip_scenario():
    """Test the specific scenario used in stream_vocabulary_flip()"""
    # Initial state
    old_doc = {
        "component": "FlashCardStack",
        "props": {
            "words": ["hello", "world"],
            "current_index": 0,
            "is_flipped": False
        },
        "intention": "show_vocabulary",
        "target_level": 1
    }
    
    # After flipping the card
    new_doc = {
        "component": "FlashCardStack",
        "props": {
            "words": ["hello", "world"],
            "current_index": 0,
            "is_flipped": True  # Changed
        },
        "intention": "show_vocabulary",
        "target_level": 1
    }
    
    event = create_state_diff(old_doc, new_doc)
    
    assert len(event.delta) == 1
    assert event.delta[0]["path"] == "/props/is_flipped"
    assert event.delta[0]["value"] is True
    
    # Verify patch application works
    patched = copy.deepcopy(old_doc)
    patched = jsonpatch.apply_patch(patched, event.delta)
    assert patched["props"]["is_flipped"] is True


def test_progressive_card_expansion():
    """Test scenario where cards are progressively expanded"""
    base_state = {
        "component": "VocabGrid",
        "props": {
            "words": ["one", "two", "three"],
            "expanded_indices": []
        }
    }
    
    # Simulate progressive expansion
    current = base_state
    for i in range(3):
        new_state = copy.deepcopy(current)
        new_state["props"]["expanded_indices"].append(i)
        
        event = create_state_diff(current, new_state)
        
        # Should have a patch
        assert len(event.delta) > 0
        
        # Apply and verify
        patched = jsonpatch.apply_patch(copy.deepcopy(current), event.delta)
        assert len(patched["props"]["expanded_indices"]) == i + 1
        assert patched["props"]["expanded_indices"][-1] == i
        
        current = new_state


def test_patch_application_correctness():
    """Test that generated patches can be successfully applied"""
    old_state = {
        "count": 0,
        "status": "idle",
        "metadata": {"version": 1}
    }
    new_state = {
        "count": 5,
        "status": "running",
        "metadata": {"version": 2, "author": "system"}
    }
    
    event = create_state_diff(old_state, new_state)
    
    # Apply the patch
    patched_state = jsonpatch.apply_patch(copy.deepcopy(old_state), event.delta)
    
    # Should match new_state
    assert patched_state == new_state


def test_complex_aui_component_state():
    """Test patch generation for realistic AUI component state"""
    old_state = {
        "component": "VocabGrid",
        "props": {
            "words": ["apple", "banana"],
            "expanded_indices": [],
            "show_translation": False
        },
        "intention": "show_vocabulary",
        "target_level": 2
    }
    
    new_state = {
        "component": "VocabGrid",
        "props": {
            "words": ["apple", "banana"],
            "expanded_indices": [0],  # Expanded first card
            "show_translation": False
        },
        "intention": "show_vocabulary",
        "target_level": 2
    }
    
    event = create_state_diff(old_state, new_state)
    
    # Should only patch the expanded_indices
    assert any("/props/expanded_indices" in p["path"] for p in event.delta)

