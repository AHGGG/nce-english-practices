"""
AudiobookProvider - Content provider for local audiobook files with subtitle sync.

Directory structure (supports two patterns):
1. Single audio file:
   resources/audiobooks/{book_id}/
   ├── audio.mp3 (or .m4a, .wav, .ogg)
   ├── subtitles.srt (or .vtt, .lrc)
   └── metadata.json (optional)

2. Multiple tracks (each with matching subtitle):
   resources/audiobooks/{book_id}/
   ├── 01 Track Name.mp3
   ├── 01 Track Name.lrc
   ├── 02 Another Track.mp3
   ├── 02 Another Track.lrc
   └── metadata.json (optional)
"""

import re
import json
import logging
from pathlib import Path
from typing import List, Optional, Any, Tuple, Dict

from app.models.content_schemas import (
    ContentBundle,
    ContentBlock,
    BlockType,
    SourceType,
)
from app.services.content_providers.base import BaseContentProvider

logger = logging.getLogger(__name__)


class AudiobookProvider(BaseContentProvider):
    """
    Audiobook content provider.
    Supports SRT, VTT, and LRC subtitle formats.
    Supports multi-track audiobooks.
    """

    AUDIOBOOK_DIR = Path("resources/audiobooks")
    SUPPORTED_AUDIO = {".mp3", ".m4a", ".wav", ".ogg"}
    SUPPORTED_SUBTITLE = {".srt", ".vtt", ".lrc"}

    @property
    def source_type(self) -> SourceType:
        return SourceType.AUDIOBOOK

    def _find_all_tracks(self, book_path: Path) -> List[Dict[str, Any]]:
        """
        Find all audio tracks in the book directory.
        Returns list of {audio_path, subtitle_path, title} dicts.
        """
        tracks = []

        # Find all audio files
        audio_files = []
        for ext in self.SUPPORTED_AUDIO:
            audio_files.extend(book_path.glob(f"*{ext}"))

        # Sort by filename for consistent ordering
        audio_files = sorted(audio_files, key=lambda p: p.stem)

        for audio_path in audio_files:
            # Find matching subtitle (same stem, different extension)
            subtitle_path = None
            for sub_ext in self.SUPPORTED_SUBTITLE:
                potential_sub = audio_path.with_suffix(sub_ext)
                if potential_sub.exists():
                    subtitle_path = potential_sub
                    break

            # Extract track title from filename
            track_title = audio_path.stem

            tracks.append(
                {
                    "audio_path": audio_path,
                    "subtitle_path": subtitle_path,
                    "title": track_title,
                    "index": len(tracks),
                }
            )

        return tracks

    def _find_audio_file(self, book_path: Path) -> Optional[Path]:
        """Find the first audio file in the book directory."""
        tracks = self._find_all_tracks(book_path)
        if tracks:
            return tracks[0]["audio_path"]
        return None

    def _find_subtitle_file(self, book_path: Path) -> Optional[Path]:
        """Find the first subtitle file in the book directory."""
        tracks = self._find_all_tracks(book_path)
        if tracks and tracks[0]["subtitle_path"]:
            return tracks[0]["subtitle_path"]
        return None

    def _parse_srt(self, srt_path: Path) -> List[ContentBlock]:
        """Parse SRT subtitle file."""
        blocks = []
        content = srt_path.read_text(encoding="utf-8")

        # SRT format:
        # 1
        # 00:00:01,000 --> 00:00:04,000
        # Text content

        pattern = r"(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n(.*?)(?=\n\n|\Z)"
        matches = re.findall(pattern, content, re.DOTALL)

        for idx, start, end, text in matches:
            start_sec = self._time_to_seconds(start)
            end_sec = self._time_to_seconds(end)
            text = text.strip().replace("\n", " ")

            blocks.append(
                ContentBlock(
                    type=BlockType.AUDIO_SEGMENT,
                    text=text,
                    sentences=[text],
                    start_time=start_sec,
                    end_time=end_sec,
                )
            )

        return blocks

    def _parse_vtt(self, vtt_path: Path) -> List[ContentBlock]:
        """Parse VTT subtitle file."""
        blocks = []
        content = vtt_path.read_text(encoding="utf-8")

        # Skip WEBVTT header
        if content.startswith("WEBVTT"):
            content = content.split("\n\n", 1)[1] if "\n\n" in content else ""

        # VTT format similar to SRT, but time uses . instead of ,
        pattern = r"(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})\n(.*?)(?=\n\n|\Z)"
        matches = re.findall(pattern, content, re.DOTALL)

        for start, end, text in matches:
            start_sec = self._time_to_seconds(start.replace(".", ","))
            end_sec = self._time_to_seconds(end.replace(".", ","))
            text = text.strip().replace("\n", " ")

            blocks.append(
                ContentBlock(
                    type=BlockType.AUDIO_SEGMENT,
                    text=text,
                    sentences=[text],
                    start_time=start_sec,
                    end_time=end_sec,
                )
            )

        return blocks

    def _parse_lrc(self, lrc_path: Path) -> List[ContentBlock]:
        """Parse LRC lyrics file.

        Supports multiple LRC timestamp formats:
        - [mm:ss.xx] - with centiseconds
        - [mm:ss] - without centiseconds
        - [mm:ss:xx] - alternative format with colon
        """
        blocks = []
        content = lrc_path.read_text(encoding="utf-8")

        # Remove UTF-8 BOM if present
        if content.startswith("\ufeff"):
            content = content[1:]

        # Parse timestamps - support multiple formats
        # Format 1: [mm:ss.xx] or [mm:ss:xx] with centiseconds
        # Format 2: [mm:ss] without centiseconds
        timestamps = []

        for line in content.split("\n"):
            line = line.strip()
            if not line:
                continue

            # Try to match timestamp at start of line
            # Pattern: [mm:ss] or [mm:ss.xx] or [mm:ss:xx]
            match = re.match(r"\[(\d{1,2}):(\d{2})(?:[.:])(\d{2})?\](.*)", line)
            if not match:
                # Fallback: [mm:ss] without centiseconds
                match = re.match(r"\[(\d{1,2}):(\d{2})\](.*)", line)
                if match:
                    mm = int(match.group(1))
                    ss = int(match.group(2))
                    text = match.group(3).strip()
                    start_sec = mm * 60 + ss
                    timestamps.append((start_sec, text))
                    continue
            if match:
                mm = int(match.group(1))
                ss = int(match.group(2))
                cs = int(match.group(3)) if match.group(3) else 0
                text = match.group(4).strip()

                start_sec = mm * 60 + ss + cs / 100
                timestamps.append((start_sec, text))

        # Build blocks with end times
        for i, (start_sec, text) in enumerate(timestamps):
            # End time = next line's start time
            if i + 1 < len(timestamps):
                end_sec = timestamps[i + 1][0]
            else:
                end_sec = start_sec + 5  # Default 5 seconds

            if text:
                blocks.append(
                    ContentBlock(
                        type=BlockType.AUDIO_SEGMENT,
                        text=text,
                        sentences=[text],
                        start_time=start_sec,
                        end_time=end_sec,
                    )
                )

        return blocks

    def _parse_subtitle(self, subtitle_path: Path) -> List[ContentBlock]:
        """Parse subtitle file based on extension."""
        if not subtitle_path:
            return []

        ext = subtitle_path.suffix.lower()
        if ext == ".srt":
            return self._parse_srt(subtitle_path)
        elif ext == ".vtt":
            return self._parse_vtt(subtitle_path)
        elif ext == ".lrc":
            return self._parse_lrc(subtitle_path)
        return []

    def _time_to_seconds(self, time_str: str) -> float:
        """Convert time string to seconds."""
        # Format: HH:MM:SS,mmm or MM:SS,mmm
        parts = time_str.replace(",", ".").split(":")
        if len(parts) == 3:
            h, m, s = parts
            return int(h) * 3600 + int(m) * 60 + float(s)
        elif len(parts) == 2:
            m, s = parts
            return int(m) * 60 + float(s)
        return 0

    def get_tracks(self, book_id: str) -> List[Dict[str, Any]]:
        """Get list of tracks for a book."""
        book_path = self.AUDIOBOOK_DIR / book_id
        if not book_path.exists():
            return []

        tracks = self._find_all_tracks(book_path)
        return [
            {
                "index": t["index"],
                "title": t["title"],
                "has_subtitles": t["subtitle_path"] is not None,
            }
            for t in tracks
        ]

    async def fetch(
        self,
        book_id: str,
        track_index: int = 0,
        **kwargs: Any,
    ) -> ContentBundle:
        """Fetch audiobook content for a specific track."""
        book_path = self.AUDIOBOOK_DIR / book_id

        if not book_path.exists():
            raise FileNotFoundError(f"Audiobook not found: {book_id}")

        # Find all tracks
        tracks = self._find_all_tracks(book_path)
        if not tracks:
            raise FileNotFoundError(f"No audio files found in: {book_id}")

        # Validate track index
        if track_index < 0 or track_index >= len(tracks):
            track_index = 0

        track = tracks[track_index]
        audio_file = track["audio_path"]
        subtitle_file = track["subtitle_path"]

        # Parse subtitle file
        blocks = self._parse_subtitle(subtitle_file) if subtitle_file else []

        # Build audio URL (served via API route)
        audio_url = f"/api/content/audiobook/{book_id}/audio?track={track_index}"

        # Read metadata
        metadata_file = book_path / "metadata.json"
        metadata = {}
        if metadata_file.exists():
            try:
                metadata = json.loads(metadata_file.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse metadata.json for {book_id}")

        # Title: use track title if multiple tracks, else book title
        book_title = metadata.get("title", book_id)
        if len(tracks) > 1:
            title = f"{book_title} - {track['title']}"
        else:
            title = book_title

        # Combine full text
        full_text = " ".join(b.text for b in blocks if b.text)

        return ContentBundle(
            id=f"audiobook:{book_id}:{track_index}",
            source_type=SourceType.AUDIOBOOK,
            title=title,
            audio_url=audio_url,
            blocks=blocks,
            full_text=full_text,
            metadata={
                "book_id": book_id,
                "track_index": track_index,
                "track_count": len(tracks),
                "audio_file": audio_file.name,
                "subtitle_file": subtitle_file.name if subtitle_file else None,
                "tracks": [{"index": t["index"], "title": t["title"]} for t in tracks],
                **metadata,
            },
        )

    def get_audio_file(
        self, book_id: str, track_index: int = 0
    ) -> Optional[Tuple[Path, str]]:
        """Get audio file path and MIME type for a specific track."""
        book_path = self.AUDIOBOOK_DIR / book_id
        tracks = self._find_all_tracks(book_path)

        if not tracks:
            return None

        if track_index < 0 or track_index >= len(tracks):
            track_index = 0

        audio_file = tracks[track_index]["audio_path"]

        mime_types = {
            ".mp3": "audio/mpeg",
            ".m4a": "audio/mp4",
            ".wav": "audio/wav",
            ".ogg": "audio/ogg",
        }
        mime_type = mime_types.get(audio_file.suffix.lower(), "audio/mpeg")

        return audio_file, mime_type

    def list_audiobooks(self) -> List[dict]:
        """List all available audiobooks."""
        if not self.AUDIOBOOK_DIR.exists():
            return []

        books = []
        for book_path in self.AUDIOBOOK_DIR.iterdir():
            if book_path.is_dir():
                tracks = self._find_all_tracks(book_path)
                if tracks:
                    # Read metadata
                    metadata_file = book_path / "metadata.json"
                    metadata = {}
                    if metadata_file.exists():
                        try:
                            metadata = json.loads(
                                metadata_file.read_text(encoding="utf-8")
                            )
                        except json.JSONDecodeError:
                            pass

                    books.append(
                        {
                            "id": book_path.name,
                            "title": metadata.get("title", book_path.name),
                            "author": metadata.get("author"),
                            "description": metadata.get("description"),
                            "track_count": len(tracks),
                            "has_subtitles": any(t["subtitle_path"] for t in tracks),
                        }
                    )

        return books
