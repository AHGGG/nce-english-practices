import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # App Paths
    USER_HOME: Path = Path(os.path.expanduser("~/.english_tense_practice"))
    
    # LLM Settings
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com/v1"

    MODEL_NAME: str = "deepseek-chat"
    
    # Voice / Gemini Settings
    GEMINI_API_KEY: str = "" # Can also be set via GOOGLE_API_KEY in env if pydantic picks it up, but explicit is better
    
    # Database Settings
    # Default to local postgres if not set. Users should set this in .env
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/nce_practice"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def home_dir(self) -> Path:
        """Ensure home directory exists and return it."""
        try:
            self.USER_HOME.mkdir(parents=True, exist_ok=True)
            return self.USER_HOME
        except PermissionError:
            # Fallback to local dir
            fallback = Path(__file__).resolve().parent.parent / ".english_tense_practice"
            fallback.mkdir(parents=True, exist_ok=True)
            return fallback

    @property
    def themes_dir(self) -> Path:
        path = self.home_dir / "themes"
        path.mkdir(parents=True, exist_ok=True)
        return path
    
    @property
    def progress_file(self) -> Path:
        return self.home_dir / "progress.json"
        
    @property
    def export_file(self) -> Path:
        return self.home_dir / "exported_practice.csv"

settings = Settings()

# Backwards compatibility exports
HOME_DIR = settings.home_dir
THEMES_DIR = settings.themes_dir
PROGRESS_FILE = settings.progress_file
EXPORT_FILE = settings.export_file
MODEL_NAME = settings.MODEL_NAME
OPENAI_API_KEY = settings.DEEPSEEK_API_KEY
OPENAI_BASE_URL = settings.DEEPSEEK_BASE_URL
GEMINI_API_KEY = settings.GEMINI_API_KEY or os.getenv("GOOGLE_API_KEY")

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
