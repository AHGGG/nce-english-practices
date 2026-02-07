"""
Utility functions for audio transcription.

Provides audio chunking, segment merging, and time offset adjustment.
"""

import logging
from pathlib import Path
from typing import Optional
from difflib import SequenceMatcher

from .schemas import TranscriptionSegment

logger = logging.getLogger(__name__)


def get_audio_duration(audio_path: Path) -> float:
    """
    Get the duration of an audio file in seconds.

    Args:
        audio_path: Path to the audio file

    Returns:
        Duration in seconds
    """
    try:
        # Use soundfile (simpler, no scipy dependency)
        import soundfile as sf

        info = sf.info(str(audio_path))
        return float(info.duration)
    except Exception:
        try:
            # Fallback to torchaudio
            import torchaudio

            info = torchaudio.info(str(audio_path))
            return info.num_frames / info.sample_rate
        except Exception:
            logger.warning("Could not get audio duration, using fallback estimation")
            # Fallback: estimate from file size (rough approximation for MP3)
            file_size = audio_path.stat().st_size
            # Assume ~128kbps average bitrate
            return file_size / (128 * 1024 / 8)


def chunk_audio(
    audio_path: Path,
    chunk_duration: float = 30.0,
    overlap_duration: float = 2.0,
    output_dir: Optional[Path] = None,
) -> list[tuple[Path, float, float]]:
    """
    Split audio file into overlapping chunks.

    Args:
        audio_path: Path to the source audio file
        chunk_duration: Duration of each chunk in seconds
        overlap_duration: Overlap between consecutive chunks in seconds
        output_dir: Directory to save chunks (uses temp dir if None)

    Returns:
        List of (chunk_path, start_time, end_time) tuples
    """
    import tempfile
    import soundfile as sf
    import numpy as np

    if output_dir is None:
        output_dir = Path(tempfile.mkdtemp(prefix="transcription_chunks_"))

    # Load audio with soundfile (no scipy dependency)
    y, sr = sf.read(str(audio_path))

    # Convert to mono if stereo
    if len(y.shape) > 1:
        y = np.mean(y, axis=1)

    # Resample to 16kHz if needed (SenseVoice requires 16kHz)
    if sr != 16000:
        # Simple resampling using numpy
        target_sr = 16000
        ratio = target_sr / sr
        new_length = int(len(y) * ratio)
        indices = np.linspace(0, len(y) - 1, new_length)
        y = np.interp(indices, np.arange(len(y)), y)
        sr = target_sr

    total_duration = len(y) / sr

    chunks = []
    start = 0.0
    chunk_idx = 0

    while start < total_duration:
        end = min(start + chunk_duration, total_duration)

        # Extract chunk samples
        start_sample = int(start * sr)
        end_sample = int(end * sr)
        chunk_audio_data = y[start_sample:end_sample]

        # Save chunk
        chunk_path = output_dir / f"chunk_{chunk_idx:04d}.wav"
        sf.write(str(chunk_path), chunk_audio_data, sr)

        chunks.append((chunk_path, start, end))
        logger.debug(f"Created chunk {chunk_idx}: {start:.2f}s - {end:.2f}s")

        # Move to next chunk with overlap
        start = end - overlap_duration
        chunk_idx += 1

        # Avoid infinite loop for very short remaining audio
        if end >= total_duration:
            break

    logger.info(f"Split audio into {len(chunks)} chunks")
    return chunks


def adjust_segment_timestamps(
    segments: list[TranscriptionSegment],
    time_offset: float,
) -> list[TranscriptionSegment]:
    """
    Adjust segment timestamps by adding an offset.

    Args:
        segments: List of segments to adjust
        time_offset: Time offset to add (in seconds)

    Returns:
        New list of segments with adjusted timestamps
    """
    return [
        TranscriptionSegment(
            start_time=seg.start_time + time_offset,
            end_time=seg.end_time + time_offset,
            text=seg.text,
            language=seg.language,
            emotion=seg.emotion,
            events=seg.events,
            confidence=seg.confidence,
        )
        for seg in segments
    ]


def merge_overlapping_segments(
    all_chunk_segments: list[tuple[list[TranscriptionSegment], float, float]],
    overlap_duration: float = 2.0,
) -> list[TranscriptionSegment]:
    """
    Merge segments from multiple overlapping chunks.

    Uses text deduplication to remove repeated content at chunk boundaries.

    Args:
        all_chunk_segments: List of (segments, chunk_start, chunk_end) tuples
        overlap_duration: Duration of overlap between chunks

    Returns:
        Merged list of segments without duplicates
    """
    if not all_chunk_segments:
        return []

    if len(all_chunk_segments) == 1:
        segments, chunk_start, _ = all_chunk_segments[0]
        return adjust_segment_timestamps(segments, chunk_start)

    merged_segments: list[TranscriptionSegment] = []
    prev_chunk_text = ""

    for i, (segments, chunk_start, chunk_end) in enumerate(all_chunk_segments):
        # Adjust timestamps for this chunk
        adjusted = adjust_segment_timestamps(segments, chunk_start)

        if i == 0:
            # First chunk: keep all segments
            merged_segments.extend(adjusted)
            # Remember the text for deduplication
            prev_chunk_text = " ".join(s.text for s in adjusted)
        else:
            # For subsequent chunks, deduplicate overlapping text
            for seg in adjusted:
                seg_text = seg.text.strip()
                if not seg_text:
                    continue

                # Check if this segment's text appears at the end of previous chunk
                # Use a sliding window to find overlap
                is_duplicate = _is_duplicate_text(prev_chunk_text, seg_text)

                if not is_duplicate:
                    merged_segments.append(seg)

            # Update prev_chunk_text for next iteration
            prev_chunk_text = " ".join(s.text for s in adjusted)

    return merged_segments


def _is_duplicate_text(prev_text: str, current_text: str, threshold: float = 0.8) -> bool:
    """
    Check if current_text is a duplicate of content at the end of prev_text.

    Uses substring matching and similarity to detect duplicates.
    """
    if not prev_text or not current_text:
        return False

    prev_lower = prev_text.lower()
    curr_lower = current_text.lower()

    # Direct substring check (most common case)
    if curr_lower in prev_lower:
        return True

    # Check if current text starts with content from end of previous
    # Take the last portion of prev_text for comparison
    prev_words = prev_lower.split()
    curr_words = curr_lower.split()

    if not prev_words or not curr_words:
        return False

    # Check last N words of prev against first N words of current
    check_length = min(len(curr_words), 10)  # Check up to 10 words

    for start in range(max(0, len(prev_words) - check_length * 2), len(prev_words)):
        prev_suffix = " ".join(prev_words[start:])
        curr_prefix = " ".join(curr_words[:check_length])

        # Check similarity
        similarity = SequenceMatcher(None, prev_suffix, curr_prefix).ratio()
        if similarity > threshold:
            return True

        # Check if current starts with prev suffix
        if curr_lower.startswith(prev_suffix) or prev_suffix.endswith(curr_lower[:len(curr_lower)//2]):
            return True

    return False


def cleanup_chunks(chunks: list[tuple[Path, float, float]]) -> None:
    """
    Clean up temporary chunk files.

    Args:
        chunks: List of (chunk_path, start, end) tuples
    """
    for chunk_path, _, _ in chunks:
        try:
            if chunk_path.exists():
                chunk_path.unlink()
        except Exception as e:
            logger.warning(f"Failed to delete chunk {chunk_path}: {e}")

    # Try to remove the parent directory if empty
    if chunks:
        parent_dir = chunks[0][0].parent
        try:
            parent_dir.rmdir()
        except OSError:
            pass  # Directory not empty or other error
