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


def get_default_engine() -> BaseTranscriptionEngine:
    """
    Get the default transcription engine (singleton).

    The engine instance is created once and reused across all requests.
    The underlying model is lazy-loaded on first transcription.

    Returns:
        The default engine instance (SenseVoice)

    Raises:
        ImportError: If the engine dependencies are not installed
    """
    global _default_engine

    if _default_engine is None:
        from .sensevoice import SenseVoiceEngine

        _default_engine = SenseVoiceEngine()

    return _default_engine


def preload_engine() -> None:
    """
    Preload the transcription engine and model.

    Call this at application startup to avoid cold-start latency
    on the first transcription request.

    Example:
        # In main.py or startup hook
        from app.services.transcription import preload_engine
        preload_engine()
    """
    engine = get_default_engine()
    # Trigger model loading
    engine._load_model()
