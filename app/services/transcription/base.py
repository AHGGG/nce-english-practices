"""
Base transcription engine interface.

All transcription engines must implement this interface.
"""

from abc import ABC, abstractmethod
from typing import Optional

from .schemas import AudioInput, TranscriptionResult


class BaseTranscriptionEngine(ABC):
    """
    Abstract base class for transcription engines.

    All transcription engines (SenseVoice, Whisper, Deepgram, etc.)
    must implement this interface to ensure consistent behavior.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """
        Engine name identifier.

        Returns:
            Unique name for this engine (e.g., "sensevoice-large", "whisper-large-v3")
        """
        pass

    @abstractmethod
    def transcribe(self, audio: AudioInput) -> TranscriptionResult:
        """
        Transcribe audio to text with timestamps.

        This is the core method that performs the actual transcription.
        Implementations should handle:
        - Audio preprocessing (resampling, format conversion)
        - Chunking for long audio files
        - Merging results from multiple chunks

        Args:
            audio: AudioInput instance containing the audio to transcribe

        Returns:
            TranscriptionResult with segments and metadata

        Raises:
            TranscriptionError: If transcription fails
        """
        pass

    def is_available(self) -> bool:
        """
        Check if the engine is available and ready to use.

        Override this method to check for:
        - Required dependencies
        - GPU availability
        - Model files
        - API credentials

        Returns:
            True if the engine is ready, False otherwise
        """
        return True

    def get_supported_languages(self) -> Optional[list[str]]:
        """
        Get list of supported languages.

        Returns:
            List of ISO 639-1 language codes, or None if all languages supported
        """
        return None


class TranscriptionError(Exception):
    """Exception raised when transcription fails."""

    def __init__(self, message: str, engine: str, cause: Optional[Exception] = None):
        self.message = message
        self.engine = engine
        self.cause = cause
        super().__init__(f"[{engine}] {message}")
