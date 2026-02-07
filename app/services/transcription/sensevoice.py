"""
SenseVoice transcription engine implementation.

Uses FunAudioLLM/SenseVoice for local GPU-based speech recognition.
https://github.com/FunAudioLLM/SenseVoice
"""

import logging
import re
from pathlib import Path
from typing import Optional

from .base import BaseTranscriptionEngine, TranscriptionError
from .schemas import AudioInput, TranscriptionResult, TranscriptionSegment
from .utils import (
    chunk_audio,
    cleanup_chunks,
    get_audio_duration,
    merge_overlapping_segments,
)

logger = logging.getLogger(__name__)


class SenseVoiceEngine(BaseTranscriptionEngine):
    """
    SenseVoice local GPU transcription engine.

    Features:
    - High-accuracy multilingual speech recognition
    - Emotion detection
    - Audio event detection ([Music], [Laughter], etc.)
    - Supports long audio via chunking with overlap
    """

    # Chunking configuration
    CHUNK_DURATION = 30.0  # seconds per chunk
    OVERLAP_DURATION = 2.0  # overlap between chunks

    # SenseVoice event tags
    EVENT_PATTERN = re.compile(r"\[([A-Za-z]+)\]")
    EMOTION_TAGS = {
        "happy",
        "sad",
        "angry",
        "neutral",
        "fearful",
        "disgusted",
        "surprised",
    }
    EVENT_TAGS = {"Music", "Laughter", "Cough", "Applause", "BGM", "Speech"}

    def __init__(self, model_size: str = "small", device: str = "cuda"):
        """
        Initialize SenseVoice engine.

        Args:
            model_size: Model size ("small" or "large")
            device: Device to use ("cuda" or "cpu")
        """
        self.model_size = model_size
        self.device = device
        self._model = None
        self._model_loaded = False

    @property
    def name(self) -> str:
        return f"sensevoice-{self.model_size}"

    def _load_model(self):
        """Lazy load the SenseVoice model."""
        if self._model_loaded:
            return

        try:
            from funasr import AutoModel

            # ModelScope model ID format: namespace/name
            model_name = (
                "iic/SenseVoiceSmall"
                if self.model_size == "small"
                else "iic/SenseVoiceLarge"
            )

            logger.info(f"Loading SenseVoice model: {model_name}")
            self._model = AutoModel(
                model=model_name,
                trust_remote_code=True,
                device=self.device,
                disable_update=True,  # Skip version check for faster startup
            )
            self._model_loaded = True
            logger.info("SenseVoice model loaded successfully")

        except ImportError as e:
            raise TranscriptionError(
                "funasr package not installed. Install with: pip install funasr",
                engine=self.name,
                cause=e,
            )
        except Exception as e:
            raise TranscriptionError(
                f"Failed to load SenseVoice model: {e}",
                engine=self.name,
                cause=e,
            )

    def is_available(self) -> bool:
        """Check if SenseVoice is available."""
        try:
            import funasr
            import torch

            # Check CUDA availability if using GPU
            if self.device == "cuda" and not torch.cuda.is_available():
                logger.warning("CUDA not available, SenseVoice will use CPU")
                return True  # Still available, just slower

            return True
        except ImportError:
            return False

    def get_supported_languages(self) -> list[str]:
        """SenseVoice supports multiple languages."""
        return ["zh", "en", "ja", "ko", "yue"]  # Cantonese

    def transcribe(self, audio: AudioInput) -> TranscriptionResult:
        """
        Transcribe audio using SenseVoice.

        For long audio files, splits into chunks with overlap
        and merges results intelligently.

        Args:
            audio: AudioInput instance

        Returns:
            TranscriptionResult with time-aligned segments
        """
        self._load_model()

        audio_path = audio.to_local_path()
        total_duration = get_audio_duration(audio_path)

        logger.info(f"Transcribing audio: {audio_path} ({total_duration:.1f}s)")

        # Decide whether to chunk
        if total_duration <= self.CHUNK_DURATION + 5:
            # Short audio: process directly
            segments = self._transcribe_single(audio_path)
        else:
            # Long audio: chunk and merge
            segments = self._transcribe_chunked(audio_path, total_duration)

        # Build full text
        full_text = " ".join(seg.text for seg in segments)

        # Detect primary language
        language = self._detect_primary_language(segments)

        return TranscriptionResult(
            segments=segments,
            full_text=full_text,
            duration=total_duration,
            language=language,
        )

    def _transcribe_single(self, audio_path: Path) -> list[TranscriptionSegment]:
        """Transcribe a single audio file without chunking."""
        try:
            result = self._model.generate(
                input=str(audio_path),
                cache={},
                language="auto",
                use_itn=True,
                batch_size_s=60,
            )

            return self._parse_result(result)

        except Exception as e:
            raise TranscriptionError(
                f"Transcription failed: {e}",
                engine=self.name,
                cause=e,
            )

    def _transcribe_chunked(
        self, audio_path: Path, total_duration: float
    ) -> list[TranscriptionSegment]:
        """Transcribe long audio by chunking with overlap."""
        chunks = None
        try:
            # Split audio into chunks
            chunks = chunk_audio(
                audio_path,
                chunk_duration=self.CHUNK_DURATION,
                overlap_duration=self.OVERLAP_DURATION,
            )

            logger.info(f"Processing {len(chunks)} chunks")

            # Transcribe each chunk
            all_chunk_segments: list[
                tuple[list[TranscriptionSegment], float, float]
            ] = []

            for i, (chunk_path, start_time, end_time) in enumerate(chunks):
                logger.debug(f"Processing chunk {i + 1}/{len(chunks)}")

                try:
                    result = self._model.generate(
                        input=str(chunk_path),
                        cache={},
                        language="auto",
                        use_itn=True,
                        batch_size_s=60,
                    )

                    chunk_segments = self._parse_result(result)
                    all_chunk_segments.append((chunk_segments, start_time, end_time))

                except Exception as e:
                    logger.warning(f"Failed to transcribe chunk {i}: {e}")
                    # Continue with other chunks

            # Merge overlapping segments
            merged = merge_overlapping_segments(
                all_chunk_segments,
                overlap_duration=self.OVERLAP_DURATION,
            )

            return merged

        finally:
            # Clean up temporary chunk files
            if chunks:
                cleanup_chunks(chunks)

    def _parse_result(self, result: list) -> list[TranscriptionSegment]:
        """
        Parse SenseVoice output into TranscriptionSegments.

        SenseVoice returns results with timestamps and rich annotations.
        """
        segments = []

        if not result:
            return segments

        for item in result:
            # SenseVoice returns dict with 'text', 'timestamp', etc.
            if isinstance(item, dict):
                text = item.get("text", "")
                timestamps = item.get("timestamp", [])

                # Parse timestamps if available
                if timestamps:
                    for ts in timestamps:
                        if len(ts) >= 3:
                            start_ms, end_ms, word = ts[0], ts[1], ts[2]
                            segment = self._create_segment(
                                text=word,
                                start_time=start_ms / 1000.0,
                                end_time=end_ms / 1000.0,
                            )
                            segments.append(segment)
                else:
                    # No timestamps, create single segment
                    segment = self._create_segment(
                        text=text,
                        start_time=0.0,
                        end_time=0.0,
                    )
                    segments.append(segment)

            elif isinstance(item, str):
                # Simple string result
                segment = self._create_segment(
                    text=item,
                    start_time=0.0,
                    end_time=0.0,
                )
                segments.append(segment)

        return segments

    def _create_segment(
        self,
        text: str,
        start_time: float,
        end_time: float,
    ) -> TranscriptionSegment:
        """Create a segment with extracted metadata."""
        # Extract events and emotions from text
        events = []
        emotion = None
        clean_text = text

        # Remove SenseVoice special tokens: <|en|>, <|EMO_UNKNOWN|>, <|Speech|>, <|withitn|>, etc.
        import re
        sensevoice_token_pattern = re.compile(r"<\|[^|]+\|>")
        clean_text = sensevoice_token_pattern.sub("", clean_text)

        for match in self.EVENT_PATTERN.finditer(text):
            tag = match.group(1)
            if tag.lower() in {e.lower() for e in self.EMOTION_TAGS}:
                emotion = tag.lower()
            elif tag in self.EVENT_TAGS:
                events.append(f"[{tag}]")

        # Remove event tags from text for clean display
        clean_text = self.EVENT_PATTERN.sub("", clean_text).strip()

        return TranscriptionSegment(
            start_time=start_time,
            end_time=end_time,
            text=clean_text,
            emotion=emotion,
            events=events if events else None,
        )

    def _detect_primary_language(
        self, segments: list[TranscriptionSegment]
    ) -> Optional[str]:
        """Detect the primary language from segments."""
        if not segments:
            return None

        # Count language occurrences
        lang_counts: dict[str, int] = {}
        for seg in segments:
            if seg.language:
                lang_counts[seg.language] = lang_counts.get(seg.language, 0) + 1

        if not lang_counts:
            return "en"  # Default to English for podcast content

        # Return most common language
        return max(lang_counts, key=lang_counts.get)
