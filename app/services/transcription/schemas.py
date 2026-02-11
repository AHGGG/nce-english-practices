"""
Transcription data schemas.

Defines unified data contracts for transcription engines.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
import tempfile


@dataclass
class TranscriptionSegment:
    """
    Unified transcription segment format.

    All transcription engines must return results in this format.
    Optional fields may be None if the engine doesn't support them.
    """

    start_time: float  # Start time in seconds
    end_time: float  # End time in seconds
    text: str  # Transcribed text

    # Extended fields (Optional, engine-dependent)
    language: Optional[str] = None  # Detected language (e.g., "en", "zh")
    emotion: Optional[str] = None  # Emotion label (SenseVoice feature)
    events: Optional[list[str]] = None  # Event tags: [Music], [Laughter], [Cough]
    confidence: Optional[float] = None  # Confidence score 0.0-1.0

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        result = {
            "start_time": self.start_time,
            "end_time": self.end_time,
            "text": self.text,
        }
        if self.language is not None:
            result["language"] = self.language
        if self.emotion is not None:
            result["emotion"] = self.emotion
        if self.events is not None:
            result["events"] = self.events
        if self.confidence is not None:
            result["confidence"] = self.confidence
        return result

    @classmethod
    def from_dict(cls, data: dict) -> "TranscriptionSegment":
        """Create from dictionary."""
        return cls(
            start_time=data["start_time"],
            end_time=data["end_time"],
            text=data["text"],
            language=data.get("language"),
            emotion=data.get("emotion"),
            events=data.get("events"),
            confidence=data.get("confidence"),
        )


@dataclass
class TranscriptionResult:
    """
    Complete transcription result.

    Contains all segments and metadata about the transcription.
    """

    segments: list[TranscriptionSegment]
    full_text: str  # Merged full text from all segments
    duration: float  # Total audio duration in seconds
    language: Optional[str] = None  # Primary detected language

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "segments": [s.to_dict() for s in self.segments],
            "full_text": self.full_text,
            "duration": self.duration,
            "language": self.language,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "TranscriptionResult":
        """Create from dictionary."""
        return cls(
            segments=[TranscriptionSegment.from_dict(s) for s in data["segments"]],
            full_text=data["full_text"],
            duration=data["duration"],
            language=data.get("language"),
        )


@dataclass
class AudioInput:
    """
    Audio input abstraction supporting multiple sources.

    Currently supports local files. URL and bytes support planned for future.
    """

    _local_path: Path
    _is_temp: bool = field(default=False, repr=False)

    @staticmethod
    def from_file(path: Path | str) -> "AudioInput":
        """
        Create AudioInput from a local file.

        Args:
            path: Path to the audio file

        Returns:
            AudioInput instance

        Raises:
            FileNotFoundError: If the file doesn't exist
        """
        path = Path(path)
        if not path.exists():
            raise FileNotFoundError(f"Audio file not found: {path}")
        return AudioInput(_local_path=path, _is_temp=False)

    @staticmethod
    def from_url(url: str) -> "AudioInput":
        """
        Create AudioInput from a URL (downloads to temp directory).

        Args:
            url: URL to the audio file

        Returns:
            AudioInput instance

        Raises:
            NotImplementedError: Not yet implemented
        """
        # TODO: Implement URL download
        # 1. Download to temp directory
        # 2. Return AudioInput with _is_temp=True
        raise NotImplementedError("URL input not yet supported")

    @staticmethod
    def from_bytes(data: bytes, suffix: str = ".wav") -> "AudioInput":
        """
        Create AudioInput from bytes (writes to temp file).

        Args:
            data: Audio data as bytes
            suffix: File extension for the temp file

        Returns:
            AudioInput instance

        Raises:
            NotImplementedError: Not yet implemented
        """
        # TODO: Implement bytes input
        # 1. Write to temp file
        # 2. Return AudioInput with _is_temp=True
        raise NotImplementedError("Bytes input not yet supported")

    def to_local_path(self) -> Path:
        """
        Get the local file path for the audio.

        Returns:
            Path to the local audio file
        """
        return self._local_path

    def cleanup(self) -> None:
        """
        Clean up temporary files if any.

        Should be called when done with the audio input.
        """
        if self._is_temp and self._local_path.exists():
            self._local_path.unlink()

    def __enter__(self) -> "AudioInput":
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.cleanup()
