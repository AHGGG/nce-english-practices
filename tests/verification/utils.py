import os
import asyncio
from app.services.voice_lab import get_voice_lab_service

REFERENCE_TEXT = "This is a verification test."
AUDIO_DIR = os.path.dirname(__file__)

REFERENCE_AUDIO_PATH = os.path.join(AUDIO_DIR, "reference.wav")


def validate_audio_format(data: bytes, min_length: int = 100) -> bool:
    """
    Basic validation that we received some likely-audio bytes.
    """
    if not data:
        return False
    if len(data) < min_length:
        return False
    # Future: check magic numbers for mp3/wav/webm
    return True


async def get_or_create_reference_audio() -> bytes:
    """
    Returns bytes of a reference audio file.
    If 'reference.wav' does not exist, uses Google or Azure TTS to create it.
    """
    if os.path.exists(REFERENCE_AUDIO_PATH):
        with open(REFERENCE_AUDIO_PATH, "rb") as f:
            return f.read()

    # Try to generate one
    print("Generating reference audio for tests...")

    # Try generic providers
    # Prefer Azure or Google as they are usually reliable for standard US English
    providers = ["azure", "google", "deepgram", "elevenlabs"]

    for p_name in providers:
        try:
            provider = get_voice_lab_service().get_provider(p_name)
            # Use 'default' or first available voice
            config = provider.get_config()
            voice_id = config["voices"][0]

            chunks = []
            async for chunk in provider.tts(REFERENCE_TEXT, voice_id, "default"):
                chunks.append(chunk)

            full_audio = b"".join(chunks)

            if len(full_audio) > 1000:
                # Save it
                with open(REFERENCE_AUDIO_PATH, "wb") as f:
                    f.write(full_audio)
                return full_audio
        except Exception as e:
            print(f"Failed to bootstrap audio with {p_name}: {e}")
            continue

    raise RuntimeError(
        "Could not generate reference audio. Please enable at least one TTS provider."
    )


# --- Short Test Audio Utilities ---

SHORT_TEST_TEXT = "Hello test."
SHORT_REFERENCE_AUDIO_PATH = os.path.join(AUDIO_DIR, "test_audio_short.wav")


async def get_or_create_short_test_audio() -> bytes:
    """
    Returns bytes of a short test audio file (~1-2 seconds).
    Uses SHORT_TEST_TEXT for reduced API cost.
    """
    if os.path.exists(SHORT_REFERENCE_AUDIO_PATH):
        with open(SHORT_REFERENCE_AUDIO_PATH, "rb") as f:
            return f.read()

    print("Generating short test audio for tests...")

    providers = ["google", "deepgram", "elevenlabs"]

    for p_name in providers:
        try:
            provider = get_voice_lab_service().get_provider(p_name)
            config = provider.get_config()
            voice_id = config["voices"][0]

            chunks = []
            async for chunk in provider.tts(SHORT_TEST_TEXT, voice_id, "default"):
                chunks.append(chunk)

            full_audio = b"".join(chunks)

            if len(full_audio) > 500:
                with open(SHORT_REFERENCE_AUDIO_PATH, "wb") as f:
                    f.write(full_audio)
                return full_audio
        except Exception as e:
            print(f"Failed to generate short audio with {p_name}: {e}")
            continue

    raise RuntimeError("Could not generate short test audio.")


# --- PCM Audio Utilities for WebSocket Testing ---

import wave
import struct
from typing import Generator, AsyncGenerator


def load_wav_as_pcm(wav_path: str, target_sample_rate: int = 16000) -> bytes:
    """
    Load a WAV file and convert to raw PCM bytes at target sample rate.
    Returns mono 16-bit PCM data.
    """
    with wave.open(wav_path, "rb") as wf:
        channels = wf.getnchannels()
        sample_width = wf.getsampwidth()
        frame_rate = wf.getframerate()
        n_frames = wf.getnframes()

        raw_data = wf.readframes(n_frames)

    # Convert to 16-bit samples
    if sample_width == 1:
        # 8-bit unsigned to 16-bit signed
        samples = struct.unpack(f"{len(raw_data)}B", raw_data)
        samples = [(s - 128) * 256 for s in samples]
    elif sample_width == 2:
        samples = struct.unpack(f"{len(raw_data) // 2}h", raw_data)
    else:
        raise ValueError(f"Unsupported sample width: {sample_width}")

    # Convert to mono if stereo
    if channels == 2:
        samples = [
            (samples[i] + samples[i + 1]) // 2 for i in range(0, len(samples), 2)
        ]

    # Simple resampling (downsample/upsample)
    if frame_rate != target_sample_rate:
        ratio = target_sample_rate / frame_rate
        new_length = int(len(samples) * ratio)
        resampled = []
        for i in range(new_length):
            src_idx = int(i / ratio)
            if src_idx < len(samples):
                resampled.append(samples[src_idx])
        samples = resampled

    # Convert back to bytes
    return struct.pack(f"{len(samples)}h", *[int(s) for s in samples])


def chunk_pcm_audio(
    pcm_data: bytes, chunk_size: int = 3200
) -> Generator[bytes, None, None]:
    """
    Split PCM audio into chunks for streaming.
    Default chunk_size=3200 bytes = 100ms at 16kHz mono 16-bit.
    """
    for i in range(0, len(pcm_data), chunk_size):
        yield pcm_data[i : i + chunk_size]


async def stream_pcm_chunks(
    pcm_data: bytes, chunk_size: int = 3200, interval_ms: int = 100
) -> AsyncGenerator[bytes, None]:
    """
    Async generator that yields PCM chunks with timing delay.
    Simulates real-time audio streaming.
    """
    for chunk in chunk_pcm_audio(pcm_data, chunk_size):
        yield chunk
        await asyncio.sleep(interval_ms / 1000.0)


# --- Semantic Similarity Utilities ---


def extract_keywords(text: str) -> set:
    """
    Extract meaningful keywords from text.
    Simple approach: lowercase, remove punctuation, filter stop words.
    """
    import re

    stop_words = {
        "a",
        "an",
        "the",
        "is",
        "are",
        "was",
        "were",
        "this",
        "that",
        "it",
        "to",
        "of",
        "and",
        "or",
    }

    # Remove punctuation, lowercase
    text = re.sub(r"[^\w\s]", "", text.lower())
    words = set(text.split())

    return words - stop_words


def semantic_similarity(text1: str, text2: str, threshold: float = 0.3) -> bool:
    """
    Check if two texts have semantic overlap based on shared keywords.
    Returns True if Jaccard similarity >= threshold.
    """
    kw1 = extract_keywords(text1)
    kw2 = extract_keywords(text2)

    if not kw1 or not kw2:
        return False

    intersection = kw1 & kw2
    union = kw1 | kw2

    similarity = len(intersection) / len(union) if union else 0
    return similarity >= threshold


def contains_any_keyword(text: str, keywords: list) -> bool:
    """
    Check if text contains any of the specified keywords (case-insensitive).
    """
    text_lower = text.lower()
    return any(kw.lower() in text_lower for kw in keywords)


# --- Log Capture Utilities ---

import logging
from io import StringIO


class LogCapture:
    """
    Context manager to capture log output during tests.
    Usage:
        with LogCapture() as logs:
            # do stuff
        assert "ERROR" not in logs.get_output()
    """

    def __init__(self, logger_name: str = None, level: int = logging.DEBUG):
        self.logger_name = logger_name
        self.level = level
        self.handler = None
        self.stream = None
        self.logger = None

    def __enter__(self):
        self.stream = StringIO()
        self.handler = logging.StreamHandler(self.stream)
        self.handler.setLevel(self.level)
        self.handler.setFormatter(logging.Formatter("%(levelname)s - %(message)s"))

        if self.logger_name:
            self.logger = logging.getLogger(self.logger_name)
        else:
            self.logger = logging.getLogger()

        self.logger.addHandler(self.handler)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.handler and self.logger:
            self.logger.removeHandler(self.handler)
            self.handler.close()

    def get_output(self) -> str:
        return self.stream.getvalue() if self.stream else ""

    def has_errors(self) -> bool:
        return "ERROR" in self.get_output()
