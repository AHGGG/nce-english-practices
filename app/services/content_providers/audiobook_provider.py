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
import os
import struct
import logging
from pathlib import Path
from typing import List, Optional, Any, Tuple, Dict
import mutagen
from mutagen.mp4 import MP4, MP4StreamInfoError

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
    Supports multi-track audiobooks and M4B/M4A chapters.
    """

    AUDIOBOOK_DIR = Path("resources/audiobooks")
    SUPPORTED_AUDIO = {".mp3", ".m4a", ".wav", ".ogg", ".m4b"}
    SUPPORTED_SUBTITLE = {".srt", ".vtt", ".lrc"}

    @property
    def source_type(self) -> SourceType:
        return SourceType.AUDIOBOOK

    def get_capabilities(self) -> dict[str, bool]:
        return {
            "has_catalog": True,
            "has_units": True,
            "has_text": False,
            "has_segments": True,
            "has_audio": True,
            "has_images": False,
            "has_timeline": True,
            "has_region_alignment": False,
            "supports_tts_fallback": False,
            "supports_highlight": True,
            "supports_sentence_study": True,
        }

    def _extract_chapters(self, file_path: Path) -> List[Dict[str, Any]]:
        """Extract chapters from M4B/M4A files using manual atom parsing."""
        try:
            # Only process mp4/m4a/m4b files
            if file_path.suffix.lower() not in {".m4b", ".m4a", ".mp4"}:
                return []

            parser = M4BChapterParser(file_path)
            return parser.parse()

        except Exception as e:
            logger.warning(f"Failed to extract chapters from {file_path}: {e}")
            return []

    def _find_all_tracks(self, book_path: Path) -> List[Dict[str, Any]]:
        """
        Find all audio tracks in the book directory.
        Returns list of {audio_path, subtitle_path, title, start_time, end_time} dicts.
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

            # Check for internal chapters (M4B/M4A)
            chapters = self._extract_chapters(audio_path)

            if chapters:
                # Add a track for each chapter
                for i, chapter in enumerate(chapters):
                    tracks.append(
                        {
                            "audio_path": audio_path,
                            "subtitle_path": subtitle_path,
                            "title": chapter.get("title", f"Chapter {i + 1}"),
                            "index": len(tracks),
                            "start_time": chapter.get("start_time", 0),
                            "end_time": chapter.get("end_time"),
                            "is_chapter": True,
                        }
                    )
            else:
                # Regular single track
                tracks.append(
                    {
                        "audio_path": audio_path,
                        "subtitle_path": subtitle_path,
                        "title": audio_path.stem,
                        "index": len(tracks),
                        "start_time": 0,
                        "end_time": None,  # Indicates full duration/unknown
                        "is_chapter": False,
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
                "start_time": t.get("start_time", 0),
                "end_time": t.get("end_time"),
            }
            for t in tracks
        ]

    async def fetch(
        self,
        **kwargs: Any,
    ) -> ContentBundle:
        """Fetch audiobook content for a specific track."""
        book_id = kwargs.get("book_id")
        track_index = kwargs.get("track_index", 0)

        if not book_id:
            raise ValueError("book_id is required")

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

        # Add media fragment for chapters
        start_time = track.get("start_time", 0)
        end_time = track.get("end_time")
        if start_time > 0 or end_time:
            # HTML5 Media Fragments: #t=[start_time][,end_time]
            fragment = f"#t={start_time}"
            if end_time:
                fragment += f",{end_time}"
            audio_url += fragment

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
                "start_time": start_time,
                "end_time": end_time,
                "capabilities": self.get_capabilities(),
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
            ".m4b": "audio/mp4",
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


class M4BChapterParser:
    """
    Simple MP4 atom parser to extract Apple-style chapters (tref -> chap).
    """

    def __init__(self, path: Path):
        self.path = path
        self.track_id_map = {}
        self.chapter_track_id = None

    def parse(self) -> List[Dict[str, Any]]:
        if not self.path.exists():
            return []

        try:
            file_size = self.path.stat().st_size
            with open(self.path, "rb") as f:
                self._walk_atoms(f, file_size)

            return self._build_chapters()
        except Exception as e:
            logger.error(f"Error parsing M4B atoms: {e}")
            return []

    def _read_atom_header(self, f):
        data = f.read(8)
        if len(data) < 8:
            return None, None, None
        size, type_bytes = struct.unpack(">I4s", data)
        try:
            atom_type = type_bytes.decode("ascii", errors="ignore")
        except:
            atom_type = "????"
        return size, atom_type, 8

    def _walk_atoms(self, f, end_pos, context=None):
        if context is None:
            context = {}

        while f.tell() < end_pos:
            pos = f.tell()
            size, atom_type, header_len = self._read_atom_header(f)
            if not size:
                break

            if size == 0:
                size = end_pos - pos
            elif size == 1:
                data = f.read(8)
                if len(data) < 8:
                    break
                size = struct.unpack(">Q", data)[0]
                header_len += 8

            # Recursion for containers
            if atom_type in ["moov", "trak", "mdia", "minf", "stbl", "udta"]:
                new_context = context.copy()
                if atom_type == "trak":
                    new_context["current_track_id"] = None

                # Check bounds
                if size > 100000000:  # Sanity check for massive atoms (except mdat)
                    # Just dive in carefully?
                    pass

                self._walk_atoms(f, pos + size, new_context)
                f.seek(pos + size)

            # Leaf atoms of interest
            elif atom_type == "tkhd":
                f.seek(pos + header_len)
                version_byte = f.read(1)
                if not version_byte:
                    break
                version = version_byte[0]

                # Payload offset for ID
                # v0: version(1)+flags(3)+creation(4)+mod(4) = 12 bytes. ID at 12.
                # v1: version(1)+flags(3)+creation(8)+mod(8) = 20 bytes. ID at 20.
                if version == 0:
                    f.seek(pos + header_len + 12)
                    data = f.read(4)
                else:
                    f.seek(pos + header_len + 20)
                    data = f.read(4)

                if len(data) == 4:
                    track_id = struct.unpack(">I", data)[0]
                    context["current_track_id"] = track_id
                    if track_id not in self.track_id_map:
                        self.track_id_map[track_id] = {}
                f.seek(pos + size)

            elif atom_type == "mdhd":
                f.seek(pos + header_len)
                data = f.read(size - header_len)
                if len(data) > 4:
                    version = data[0]
                    # v0: ver(1)+flags(3)+creat(4)+mod(4) = 12 bytes. Timescale at 12.
                    # v1: ver(1)+flags(3)+creat(8)+mod(8) = 20 bytes. Timescale at 20.
                    timescale = 600
                    if version == 0 and len(data) >= 16:
                        timescale = struct.unpack(">I", data[12:16])[0]
                    elif version == 1 and len(data) >= 24:
                        timescale = struct.unpack(">I", data[20:24])[0]

                    tid = context.get("current_track_id")
                    if tid:
                        self.track_id_map[tid]["timescale"] = timescale
                f.seek(pos + size)

            elif atom_type == "tref":
                # Parse references inside to find 'chap'
                curr = pos + header_len
                ref_end = pos + size
                f.seek(curr)
                while f.tell() < ref_end:
                    s, t, _ = self._read_atom_header(f)
                    if not s:
                        break
                    if t == "chap":
                        # Valid chapter ref
                        data_len = s - 8
                        if data_len >= 4:
                            chap_id = struct.unpack(">I", f.read(4))[0]
                            if self.chapter_track_id is None:
                                self.chapter_track_id = chap_id
                        f.seek(curr + s)  # Next ref atom
                    else:
                        f.seek(curr + s)
                    curr += s
                f.seek(pos + size)

            elif atom_type == "stts":  # Time-to-Sample
                tid = context.get("current_track_id")
                if tid:
                    f.seek(pos + header_len)
                    f.read(4)  # Version/Flags
                    entry_count_data = f.read(4)
                    if len(entry_count_data) == 4:
                        entry_count = struct.unpack(">I", entry_count_data)[0]
                        entries = []
                        # Limit to reasonable count to avoid OOM on bad parse
                        if entry_count < 10000:
                            for _ in range(entry_count):
                                d = f.read(8)
                                if len(d) < 8:
                                    break
                                count, duration = struct.unpack(">II", d)
                                entries.append((count, duration))
                        self.track_id_map[tid]["stts"] = entries
                f.seek(pos + size)

            elif atom_type == "stsz":  # Sample Size
                tid = context.get("current_track_id")
                if tid:
                    f.seek(pos + header_len)
                    f.read(4)  # Version/Flags
                    sample_size_data = f.read(4)
                    entry_count_data = f.read(4)
                    if len(sample_size_data) == 4 and len(entry_count_data) == 4:
                        sample_size = struct.unpack(">I", sample_size_data)[0]
                        entry_count = struct.unpack(">I", entry_count_data)[0]
                        sizes = []
                        if sample_size == 0:
                            # Limit to reasonable count
                            if entry_count < 10000:
                                for _ in range(entry_count):
                                    d = f.read(4)
                                    if len(d) < 4:
                                        break
                                    sizes.append(struct.unpack(">I", d)[0])
                        else:
                            sizes = [sample_size] * entry_count
                        self.track_id_map[tid]["stsz"] = sizes
                f.seek(pos + size)

            elif atom_type == "stco":  # Chunk Offset (32-bit)
                tid = context.get("current_track_id")
                if tid:
                    f.seek(pos + header_len)
                    f.read(4)
                    entry_count_data = f.read(4)
                    if len(entry_count_data) == 4:
                        entry_count = struct.unpack(">I", entry_count_data)[0]
                        offsets = []
                        if entry_count < 10000:
                            for _ in range(entry_count):
                                d = f.read(4)
                                if len(d) < 4:
                                    break
                                offsets.append(struct.unpack(">I", d)[0])
                        self.track_id_map[tid]["stco"] = offsets
                f.seek(pos + size)

            elif atom_type == "co64":  # Chunk Offset (64-bit)
                tid = context.get("current_track_id")
                if tid:
                    f.seek(pos + header_len)
                    f.read(4)
                    entry_count_data = f.read(4)
                    if len(entry_count_data) == 4:
                        entry_count = struct.unpack(">I", entry_count_data)[0]
                        offsets = []
                        if entry_count < 10000:
                            for _ in range(entry_count):
                                d = f.read(8)
                                if len(d) < 8:
                                    break
                                offsets.append(struct.unpack(">Q", d)[0])
                        self.track_id_map[tid]["stco"] = offsets
                f.seek(pos + size)

            elif atom_type == "stsc":  # Sample-to-Chunk
                tid = context.get("current_track_id")
                if tid:
                    f.seek(pos + header_len)
                    f.read(4)
                    entry_count_data = f.read(4)
                    if len(entry_count_data) == 4:
                        entry_count = struct.unpack(">I", entry_count_data)[0]
                        entries = []
                        if entry_count < 10000:
                            for _ in range(entry_count):
                                d = f.read(12)
                                if len(d) < 12:
                                    break
                                entries.append(struct.unpack(">III", d))
                        self.track_id_map[tid]["stsc"] = entries
                f.seek(pos + size)

            else:
                f.seek(pos + size)

    def _build_chapters(self) -> List[Dict[str, Any]]:
        if not self.chapter_track_id:
            return []

        tid = self.chapter_track_id
        info = self.track_id_map.get(tid)
        if not info:
            return []

        timescale = info.get("timescale", 600)
        stts = info.get("stts", [])
        stsz = info.get("stsz", [])
        stco = info.get("stco", [])
        stsc = info.get("stsc", [])

        # Calculate durations
        sample_durations = []
        for count, duration in stts:
            sample_durations.extend([duration] * count)

        # Calculate chunk sample counts
        chunk_sample_counts = {}
        if not stsc:
            # Fallback: assume 1 sample per chunk if stsc missing (rare)
            for i in range(len(stco)):
                chunk_sample_counts[i + 1] = 1
        else:
            for i in range(len(stsc)):
                first_chunk, samples_per_chunk, _ = stsc[i]
                if i < len(stsc) - 1:
                    next_first_chunk = stsc[i + 1][0]
                else:
                    next_first_chunk = len(stco) + 1

                for c in range(first_chunk, next_first_chunk):
                    chunk_sample_counts[c] = samples_per_chunk

        # Map samples to offsets
        sample_offsets = []
        current_sample_idx = 0

        # Sort chunks by index to be safe (though stco usually sorted)
        # stco is just a list of offsets, index corresponds to chunk ID 1..N
        for chunk_idx, offset in enumerate(stco, 1):
            count = chunk_sample_counts.get(chunk_idx, 1)
            current_offset_in_chunk = offset
            for _ in range(count):
                if current_sample_idx < len(stsz):
                    size = stsz[current_sample_idx]
                    sample_offsets.append(current_offset_in_chunk)
                    current_offset_in_chunk += size
                    current_sample_idx += 1

        # Read Titles
        chapters = []
        current_time = 0

        try:
            with open(self.path, "rb") as f:
                for i, offset in enumerate(sample_offsets):
                    duration = sample_durations[i] if i < len(sample_durations) else 0
                    size = stsz[i]

                    f.seek(offset)
                    # Text sample: [2 bytes len][string]
                    # Sometimes size includes other atoms, but for text track usually it's just text
                    # Standard QT text sample starts with 16-bit length
                    if size > 2:
                        length_word = struct.unpack(">H", f.read(2))[0]
                        # Sanity check: length word should be <= size - 2
                        # Sometimes there's extra garbage (like 'encd' atom)
                        read_len = min(length_word, size - 2)

                        if read_len > 0:
                            title_bytes = f.read(read_len)
                            title = title_bytes.decode("utf-8", errors="ignore")
                        else:
                            title = f"Chapter {i + 1}"
                    else:
                        title = f"Chapter {i + 1}"

                    start_sec = current_time / timescale
                    end_sec = (current_time + duration) / timescale

                    chapters.append(
                        {"title": title, "start_time": start_sec, "end_time": end_sec}
                    )

                    current_time += duration
        except Exception as e:
            logger.error(f"Error reading chapter text: {e}")

        return chapters
