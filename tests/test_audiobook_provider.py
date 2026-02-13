from pathlib import Path

import pytest

from app.services.content_providers.audiobook_provider import AudiobookProvider


def _create_book_with_audio(root: Path, book_id: str, filename: str) -> Path:
    book_dir = root / book_id
    book_dir.mkdir(parents=True, exist_ok=True)
    (book_dir / filename).write_bytes(b"fake-audio")
    return book_dir


@pytest.mark.asyncio
async def test_fetch_returns_empty_blocks_when_subtitle_missing(tmp_path: Path):
    provider = AudiobookProvider()
    provider.AUDIOBOOK_DIR = tmp_path

    _create_book_with_audio(tmp_path, "book-no-sub", "audio.mp3")

    bundle = await provider.fetch(book_id="book-no-sub", track_index=0)

    assert bundle.source_type.value == "audiobook"
    assert bundle.blocks == []
    assert bundle.audio_url == "/api/content/audiobook/book-no-sub/audio?track=0"
    assert bundle.metadata.get("subtitle_file") is None


@pytest.mark.parametrize(
    "audio_name, expected_mime",
    [
        ("audio.mp3", "audio/mpeg"),
        ("audio.m4a", "audio/mp4"),
        ("audio.wav", "audio/wav"),
    ],
)
def test_get_audio_file_supports_common_formats(
    tmp_path: Path,
    audio_name: str,
    expected_mime: str,
):
    provider = AudiobookProvider()
    provider.AUDIOBOOK_DIR = tmp_path

    book_id = f"book-{audio_name.split('.')[-1]}"
    _create_book_with_audio(tmp_path, book_id, audio_name)

    result = provider.get_audio_file(book_id)

    assert result is not None
    audio_path, mime_type = result
    assert audio_path.name == audio_name
    assert mime_type == expected_mime
