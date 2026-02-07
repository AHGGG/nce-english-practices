"""
SenseVoice transcription engine implementation.

Uses FunAudioLLM/SenseVoice for local GPU-based speech recognition.
https://github.com/FunAudioLLM/SenseVoice

Supports two model types:
- iic/SenseVoiceSmall: Original SenseVoice model
- FunAudioLLM/Fun-ASR-Nano-2512: New ASR large model with 31 language support
"""

import logging
import re
from pathlib import Path
from typing import Optional

from app.config import settings
from .base import BaseTranscriptionEngine, TranscriptionError
from .schemas import AudioInput, TranscriptionResult, TranscriptionSegment
from .utils import (
    chunk_audio,
    cleanup_chunks,
    get_audio_duration,
    merge_overlapping_segments,
)

logger = logging.getLogger(__name__)

# Model type detection
FUN_ASR_NANO_MODELS = {"FunAudioLLM/Fun-ASR-Nano-2512", "Fun-ASR-Nano-2512"}


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

    def __init__(self, model_size: str = "small", device: str = "cuda:0"):
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
        self._is_fun_asr_nano = False  # Flag for Fun-ASR-Nano model type

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
            # Configured in app/config.py (default: iic/SenseVoiceSmall)
            model_name = settings.SENSEVOICE_MODEL

            # Check if using Fun-ASR-Nano model (requires VAD)
            self._is_fun_asr_nano = any(
                nano_model in model_name for nano_model in FUN_ASR_NANO_MODELS
            )

            logger.info(
                f"Loading SenseVoice model: {model_name} (Fun-ASR-Nano: {self._is_fun_asr_nano})"
            )

            if self._is_fun_asr_nano:
                # Fun-ASR-Nano requires VAD model for long audio and remote_code
                # Reference: https://github.com/FunAudioLLM/Fun-ASR
                # The model.py needs to be downloaded from the Fun-ASR repo
                # We'll download it to a local cache if not present
                model_py_path = self._ensure_fun_asr_model_code()

                # Note: We load WITHOUT VAD model to avoid FunASR's inference_with_vad bug
                # (KeyError when timestamp format doesn't match expected list format)
                # Instead, we'll handle long audio by chunking manually
                self._model = AutoModel(
                    model=model_name,
                    device=self.device,
                    trust_remote_code=True,
                    remote_code=model_py_path,
                )
            else:
                # Original SenseVoice model
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

    def _ensure_fun_asr_model_code(self) -> str:
        """
        Ensure the Fun-ASR model code files are available locally.
        Downloads from GitHub if not present.

        Fun-ASR model.py has dependencies on:
        - ctc.py (CTC class)
        - tools/utils.py (forced_align function)

        We need to download all these files and set up the proper directory structure.

        Returns:
            Path to the model.py file (relative path for FunASR compatibility)
        """
        import sys
        import urllib.request

        # Create directory structure for Fun-ASR code
        # Use project root for Windows compatibility with FunASR's path handling
        project_root = Path(__file__).parent.parent.parent.parent
        fun_asr_dir = project_root / "fun_asr_code"
        tools_dir = fun_asr_dir / "tools"

        fun_asr_dir.mkdir(parents=True, exist_ok=True)
        tools_dir.mkdir(parents=True, exist_ok=True)

        # Files to download from Fun-ASR repository
        files_to_download = [
            ("model.py", fun_asr_dir / "model.py"),
            ("ctc.py", fun_asr_dir / "ctc.py"),
            ("tools/utils.py", tools_dir / "utils.py"),
        ]

        base_url = "https://raw.githubusercontent.com/FunAudioLLM/Fun-ASR/main"

        for remote_path, local_path in files_to_download:
            if not local_path.exists():
                url = f"{base_url}/{remote_path}"
                logger.info(f"Downloading Fun-ASR {remote_path}...")
                try:
                    urllib.request.urlretrieve(url, local_path)
                    logger.info(f"Downloaded {remote_path} to {local_path}")
                except Exception as e:
                    raise TranscriptionError(
                        f"Failed to download Fun-ASR {remote_path}: {e}",
                        engine=self.name,
                        cause=e,
                    )

        # Create __init__.py for tools package if not exists
        tools_init = tools_dir / "__init__.py"
        if not tools_init.exists():
            tools_init.write_text("# Fun-ASR tools package\n")

        # Add fun_asr_code directory to Python path so imports work
        fun_asr_dir_str = str(fun_asr_dir)
        if fun_asr_dir_str not in sys.path:
            sys.path.insert(0, fun_asr_dir_str)
            logger.info(f"Added {fun_asr_dir_str} to Python path")

        # Return relative path from fun_asr_code directory
        # FunASR will add this directory to sys.path and import "model"
        return "./fun_asr_code/model.py"

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

        if self._is_fun_asr_nano:
            # Fun-ASR-Nano: use chunking for long audio (VAD has compatibility issues)
            if total_duration <= self.CHUNK_DURATION + 5:
                segments = self._transcribe_fun_asr_nano(audio_path)
            else:
                segments = self._transcribe_fun_asr_nano_chunked(
                    audio_path, total_duration
                )
        elif total_duration <= self.CHUNK_DURATION + 5:
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

    def _transcribe_fun_asr_nano(self, audio_path: Path) -> list[TranscriptionSegment]:
        """Transcribe using Fun-ASR-Nano model for short audio."""
        try:
            # Fun-ASR-Nano without VAD - for short audio only
            result = self._model.generate(
                input=str(audio_path),
                cache={},
            )

            logger.debug(f"Fun-ASR-Nano raw result type: {type(result)}")
            logger.debug(f"Fun-ASR-Nano raw result: {result}")
            return self._parse_fun_asr_nano_result(result)

        except Exception as e:
            logger.exception("Fun-ASR-Nano transcription failed")
            raise TranscriptionError(
                f"Transcription failed: {e}",
                engine=self.name,
                cause=e,
            )

    def _parse_fun_asr_nano_result(self, result: list) -> list[TranscriptionSegment]:
        """Parse Fun-ASR-Nano output into TranscriptionSegments."""
        segments = []

        if not result:
            return segments

        for item in result:
            if isinstance(item, dict):
                text = item.get("text", "")
                # Fun-ASR-Nano returns text directly
                if text:
                    # Clean up the text
                    clean_text = self._clean_text(text)
                    if clean_text:
                        segment = TranscriptionSegment(
                            start_time=0.0,
                            end_time=0.0,
                            text=clean_text,
                        )
                        segments.append(segment)
            elif isinstance(item, str):
                clean_text = self._clean_text(item)
                if clean_text:
                    segment = TranscriptionSegment(
                        start_time=0.0,
                        end_time=0.0,
                        text=clean_text,
                    )
                    segments.append(segment)

        return segments

    def _transcribe_fun_asr_nano_chunked(
        self, audio_path: Path, total_duration: float
    ) -> list[TranscriptionSegment]:
        """Transcribe long audio using Fun-ASR-Nano by chunking manually."""
        chunks = None
        try:
            # Split audio into chunks
            chunks = chunk_audio(
                audio_path,
                chunk_duration=self.CHUNK_DURATION,
                overlap_duration=self.OVERLAP_DURATION,
            )

            logger.info(f"Processing {len(chunks)} chunks with Fun-ASR-Nano")

            all_segments: list[TranscriptionSegment] = []
            current_time = 0.0

            for i, (chunk_path, start_time, end_time) in enumerate(chunks):
                logger.debug(
                    f"Processing chunk {i + 1}/{len(chunks)}: {start_time:.1f}s - {end_time:.1f}s"
                )

                try:
                    result = self._model.generate(
                        input=str(chunk_path),
                        cache={},
                    )

                    logger.debug(f"Chunk {i + 1} result: {result}")

                    # Parse result and adjust timestamps
                    chunk_segments = self._parse_fun_asr_nano_result(result)

                    # Set approximate timestamps based on chunk position
                    chunk_duration = end_time - start_time
                    for seg in chunk_segments:
                        seg.start_time = start_time
                        seg.end_time = end_time
                        all_segments.append(seg)

                except Exception as e:
                    logger.warning(f"Failed to transcribe chunk {i + 1}: {e}")
                    # Continue with other chunks

            # Merge segments with same text in overlapping regions
            merged_segments = self._merge_adjacent_segments(all_segments)

            return merged_segments

        finally:
            # Clean up temporary chunk files
            if chunks:
                cleanup_chunks(chunks)

    def _merge_adjacent_segments(
        self, segments: list[TranscriptionSegment]
    ) -> list[TranscriptionSegment]:
        """Merge adjacent segments that might have duplicate text from overlapping chunks."""
        if not segments:
            return []

        merged = [segments[0]]

        for seg in segments[1:]:
            last = merged[-1]
            # If segments overlap and have similar text, merge them
            if last.end_time >= seg.start_time:
                # Check for duplicate/similar text
                if seg.text in last.text or last.text in seg.text:
                    # Extend the last segment
                    last.end_time = max(last.end_time, seg.end_time)
                    if len(seg.text) > len(last.text):
                        last.text = seg.text
                else:
                    # Different text, keep both but adjust times
                    merged.append(seg)
            else:
                merged.append(seg)

        return merged

        return segments

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
        return max(lang_counts, key=lambda k: lang_counts[k])

    def _clean_text(self, text: str) -> str:
        """Clean text by removing special tokens and tags."""
        if not text:
            return ""

        # Remove SenseVoice/FunASR special tokens: <|en|>, <|EMO_UNKNOWN|>, <|Speech|>, etc.
        sensevoice_token_pattern = re.compile(r"<\|[^|]+\|>")
        clean_text = sensevoice_token_pattern.sub("", text)

        # Remove event tags like [Music], [Laughter], etc.
        clean_text = self.EVENT_PATTERN.sub("", clean_text)

        return clean_text.strip()
