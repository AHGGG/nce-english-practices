import pytest
from app.services.prompt_manager import PromptManager
import tempfile
import os
import yaml

@pytest.fixture
def temp_prompts_file():
    # Create a temporary yaml file
    data = {
        "section1": {
            "key1": "Value 1",
            "template": "Hello {name}!"
        },
        "section2": {
            "deep": {
                "key": "Deep Value"
            }
        }
    }

    with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
        yaml.dump(data, f)
        path = f.name

    yield path

    # Cleanup
    os.remove(path)

def test_load_prompts(temp_prompts_file):
    pm = PromptManager(config_path=temp_prompts_file)
    assert pm.prompts is not None
    assert "section1" in pm.prompts

def test_get_value(temp_prompts_file):
    pm = PromptManager(config_path=temp_prompts_file)
    assert pm.get("section1.key1") == "Value 1"
    assert pm.get("section2.deep.key") == "Deep Value"
    assert pm.get("non.existent") is None
    assert pm.get("non.existent", default="Default") == "Default"

def test_format_prompt(temp_prompts_file):
    pm = PromptManager(config_path=temp_prompts_file)
    formatted = pm.format("section1.template", name="World")
    assert formatted == "Hello World!"

def test_format_prompt_missing_key(temp_prompts_file):
    pm = PromptManager(config_path=temp_prompts_file)
    formatted = pm.format("section1.template", wrong="World")
    # The implementation returns an error string
    assert "Error formatting prompt" in formatted

def test_format_prompt_not_found(temp_prompts_file):
    pm = PromptManager(config_path=temp_prompts_file)
    formatted = pm.format("non.existent")
    assert "Error: Prompt 'non.existent' not found." in formatted

def test_missing_file():
    pm = PromptManager(config_path="non_existent_file.yaml")
    assert pm.prompts == {}
