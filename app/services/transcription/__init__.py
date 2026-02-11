"""
Transcription service module.

Provides AI-powered audio transcription with time-aligned segments.
"""

from .schemas import AudioInput, TranscriptionSegment, TranscriptionResult
from .base import BaseTranscriptionEngine, TranscriptionError

__all__ = [
    "AudioInput",
    "TranscriptionSegment",
    "TranscriptionResult",
    "BaseTranscriptionEngine",
    "TranscriptionError",
    "get_default_engine",
    "preload_engine",
]

# Singleton engine instance (lazy initialized)
_default_engine: BaseTranscriptionEngine | None = None


def get_default_engine(
    remote_url: str | None = None, api_key: str | None = None
) -> BaseTranscriptionEngine:
    """
    Get the transcription engine.

    Args:
        remote_url: Optional URL for remote transcription.
                   If provided, returns a new RemoteTranscriptionEngine instance.
                   If None, returns the singleton local SenseVoiceEngine.
        api_key: Optional API key for remote transcription.

    Returns:
        Transcription engine instance
    """
    global _default_engine

    # If remote URL is provided, always return a new Remote engine (stateless)
    if remote_url:
        from .remote import RemoteTranscriptionEngine

        return RemoteTranscriptionEngine(remote_url, api_key=api_key)

    # Otherwise return singleton local engine
    if _default_engine is None:
        try:
            from .sensevoice import SenseVoiceEngine

            _default_engine = SenseVoiceEngine()
        except ImportError as e:
            # Provide a clear error if optional dependencies are missing
            raise ImportError(
                "Local transcription dependencies (funasr, torch) not found. "
                "Please install with 'pip install .[local-asr]' or configure a Remote URL."
            ) from e

    return _default_engine


def preload_engine() -> None:
    """
    Preload the local transcription engine model if available.
    """
    try:
        engine = get_default_engine()
        # Only SenseVoiceEngine has _load_model
        if hasattr(engine, "_load_model"):
            engine._load_model()  # type: ignore
    except ImportError:
        pass  # Skip if local engine not installed
