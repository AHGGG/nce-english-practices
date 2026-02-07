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
]


def get_default_engine() -> BaseTranscriptionEngine:
    """
    Get the default transcription engine.

    Returns:
        The default engine instance (SenseVoice)

    Raises:
        ImportError: If the engine dependencies are not installed
    """
    from .sensevoice import SenseVoiceEngine

    return SenseVoiceEngine()
