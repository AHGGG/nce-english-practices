import yaml
from pathlib import Path
from typing import Dict, Any, Optional

class PromptManager:
    def __init__(self, config_path: str = "app/prompts.yaml"):
        self.config_path = Path(config_path)
        self.prompts: Dict[str, Any] = {}
        self.load_prompts()

    def load_prompts(self):
        if not self.config_path.exists():
            print(f"Warning: Prompt config not found at {self.config_path}")
            return

        try:
            with open(self.config_path, "r", encoding="utf-8") as f:
                self.prompts = yaml.safe_load(f) or {}
            print(f"Loaded {len(self.prompts)} prompt sections.")
        except Exception as e:
            print(f"Failed to load prompts: {e}")

    def get(self, key_path: str, default: Optional[str] = None) -> str:
        """
        Get a prompt by dot-notation path (e.g. 'theme.system').
        """
        keys = key_path.split(".")
        value = self.prompts

        try:
            for k in keys:
                value = value.get(k)
                if value is None:
                    return default
            return value if isinstance(value, str) else default
        except AttributeError:
            return default

    def format(self, key_path: str, **kwargs) -> str:
        """
        Get a prompt template and format it with kwargs.
        """
        template = self.get(key_path)
        if not template:
            return f"Error: Prompt '{key_path}' not found."

        try:
            return template.format(**kwargs)
        except KeyError as e:
            return f"Error formatting prompt '{key_path}': Missing key {e}"

# Singleton instance
prompt_manager = PromptManager()
