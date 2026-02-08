import pytest
from pathlib import Path
from unittest.mock import MagicMock, patch
from app.services.content_providers.audiobook_provider import AudiobookProvider
from app.services.transcription import TranscriptionResult, TranscriptionSegment


@pytest.mark.asyncio
async def test_transcribe_audiobook_endpoint(client, tmp_path):
    """
    Test the audiobook transcription endpoint.
    Mocks the provider, engine, and threadpool execution to verify SRT generation.
    """
    # Setup mock audiobook directory
    book_dir = tmp_path / "test_book"
    book_dir.mkdir()
    audio_file = book_dir / "chapter1.mp3"
    audio_file.write_text("fake audio content")

    # Mock Provider
    mock_provider = MagicMock(spec=AudiobookProvider)
    # get_audio_file returns (path, mime_type)
    mock_provider.get_audio_file.return_value = (audio_file, "audio/mpeg")

    # Mock Engine
    mock_engine = MagicMock()
    mock_result = TranscriptionResult(
        segments=[
            TranscriptionSegment(start_time=0.0, end_time=1.5, text="Hello"),
            TranscriptionSegment(start_time=1.5, end_time=3.0, text="World"),
        ],
        full_text="Hello World",
        duration=3.0,
    )
    mock_engine.transcribe.return_value = mock_result

    # Async mock for run_in_threadpool
    async def mock_run_in_threadpool(func, *args, **kwargs):
        return func(*args, **kwargs)

    # Patch dependencies
    with (
        patch(
            "app.api.routers.audiobook.get_audiobook_provider",
            return_value=mock_provider,
        ),
        patch("app.api.routers.audiobook.get_default_engine", return_value=mock_engine),
        patch(
            "app.api.routers.audiobook.run_in_threadpool",
            side_effect=mock_run_in_threadpool,
        ),
    ):
        # Make request
        # Note: We need a valid user token or dependency override.
        # The 'client' fixture in conftest.py already overrides get_current_user_id.
        response = await client.post(
            "/api/content/audiobook/test_book/transcribe?track=0"
        )

        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pending"
        assert data["audio_file"] == "chapter1.mp3"
        assert data["target_subtitle"] == "chapter1.srt"

        # Verify SRT file creation
        # Since we mocked run_in_threadpool to run synchronously, the background task logic
        # (which is added to BackgroundTasks) normally runs *after* the response.
        # However, FastAPI BackgroundTasks run after the response is sent.
        # In a test client, we might need to manually trigger it or rely on the fact that
        # we called the function directly?
        # Wait, the endpoint adds it to background_tasks.
        # app/api/routers/audiobook.py: background_tasks.add_task(...)

        # To test the logic inside the background task, we should probably unit test
        # _run_audiobook_transcription directly or rely on a way to execute background tasks in tests.
        # But simpler: let's verify the endpoint called add_task correctly.
        # OR: We can just call the internal function `_run_audiobook_transcription` in this test
        # to verify the SRT generation logic, and trust FastAPI to run the task.

    # Verify SRT generation logic by calling the function directly
    # We need to import it. It's not exported by default but available in the module.
    from app.api.routers.audiobook import _run_audiobook_transcription

    srt_file = book_dir / "chapter1.srt"

    # We need to patch get_default_engine inside the function too, or pass it via dependency injection?
    # The function calls get_default_engine() internally.
    with (
        patch("app.api.routers.audiobook.get_default_engine", return_value=mock_engine),
        patch(
            "app.api.routers.audiobook.run_in_threadpool",
            side_effect=mock_run_in_threadpool,
        ),
    ):
        await _run_audiobook_transcription(
            book_id="test_book",
            track_index=0,
            audio_path=audio_file,
            subtitle_path=srt_file,
        )

        assert srt_file.exists()
        content = srt_file.read_text(encoding="utf-8")

        # Verify SRT format
        assert "1" in content
        assert "00:00:00,000 --> 00:00:01,500" in content
        assert "Hello" in content
        assert "2" in content
        assert "00:00:01,500 --> 00:00:03,000" in content
        assert "World" in content
