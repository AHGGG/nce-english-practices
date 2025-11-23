import os
from pathlib import Path

from dotenv import load_dotenv

# Derive and prepare filesystem locations used by the application.
_preferred_home = Path(os.path.expanduser("~/.english_tense_practice"))
_fallback_home = Path(__file__).resolve().parent / ".english_tense_practice"

try:
    _preferred_home.mkdir(parents=True, exist_ok=True)
    HOME_DIR = _preferred_home
except PermissionError:
    _fallback_home.mkdir(parents=True, exist_ok=True)
    HOME_DIR = _fallback_home

THEMES_DIR = HOME_DIR / "themes"
THEMES_DIR.mkdir(parents=True, exist_ok=True)

PROGRESS_FILE = HOME_DIR / "progress.json"
EXPORT_FILE = HOME_DIR / "exported_practice.csv"

# Load environment variables (DeepSeek/OpenAI compatible keys).
load_dotenv()
OPENAI_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
OPENAI_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
MODEL_NAME = os.getenv("MODEL_NAME", "deepseek-chat")


def check_model_availability(client):
    """Probe the LLM API to confirm connectivity and return (ok, message)."""
    if client is None:
        return False, "DEEPSEEK_API_KEY missing"
    try:
        data = client.models.list()
        count = len(getattr(data, "data", []))
        return True, f"{count} models reachable"
    except Exception as exc:
        return False, str(exc)
