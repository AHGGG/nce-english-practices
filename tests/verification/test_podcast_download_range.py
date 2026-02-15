import pytest
from httpx import AsyncClient

# Mock the podcast service or database if needed, but for integration test
# we want to test the router logic.


@pytest.mark.asyncio
async def test_download_range_support(client: AsyncClient, db_session):
    # 1. Create a dummy podcast episode in DB (using existing fixtures if available, else manual)
    # Since we don't have easy access to factories here, let's mock the upstream httpx request instead
    # The routers uses `httpx.AsyncClient` internally blocks us from easily mocking
    # without `respx` or monkeypatching.
    pass


# Retrying with a simpler Unit Test approach using Starlette TestClient and mocking httpx
from unittest.mock import MagicMock, patch, AsyncMock


@pytest.mark.asyncio
async def test_download_endpoint_range_header():
    """
    Test that the download endpoint correctly handles Range headers
    and forwards them to the upstream client.
    """
    with patch(
        "app.services.podcast_service.podcast_service.get_episode_audio_url",
        return_value="http://example.com/audio.mp3",
    ):
        with patch("httpx.AsyncClient") as MockClient:
            mock_client_instance = MockClient.return_value

            mock_response = MagicMock()
            mock_response.status_code = 206
            mock_response.headers = {
                "Content-Length": "100",
                "Content-Range": "bytes 0-99/1000",
                "Content-Type": "audio/mpeg",
            }

            async def async_gen(chunk_size=None):
                yield b"fake_audio_data"

            mock_response.aiter_bytes = async_gen
            mock_response.aclose = AsyncMock()

            mock_request_obj = MagicMock()
            mock_client_instance.build_request.return_value = mock_request_obj
            mock_client_instance.send = AsyncMock(return_value=mock_response)
            mock_client_instance.aclose = AsyncMock()

            from app.api.routers.podcast import download_episode
            from fastapi import Request

            mock_request = MagicMock(spec=Request)
            mock_request.headers = {"range": "bytes=0-99"}
            mock_db = MagicMock()

            response = await download_episode(
                episode_id=1,
                request=mock_request,
                user_id="test_user",
                db=mock_db,
            )

            call_args = mock_client_instance.build_request.call_args
            headers_passed = call_args.kwargs.get("headers")
            assert headers_passed is not None
            assert "User-Agent" in headers_passed
            assert "Mozilla/5.0" in headers_passed["User-Agent"]
            assert headers_passed["Range"] == "bytes=0-99"

            assert response.status_code == 206
            assert response.headers["Content-Range"] == "bytes 0-99/1000"
            assert response.headers["Accept-Ranges"] == "bytes"

            body = [chunk async for chunk in response.body_iterator]
            assert b"fake_audio_data" in body


@pytest.mark.asyncio
async def test_download_head_endpoint_headers():
    """
    Test that the download HEAD endpoint includes proper User-Agent header.
    """
    with patch(
        "app.services.podcast_service.podcast_service.get_episode_audio_url",
        return_value="http://example.com/audio.mp3",
    ):
        with patch("httpx.AsyncClient") as MockClient:
            mock_client_instance = MockClient.return_value
            mock_client_instance.__aenter__ = AsyncMock(
                return_value=mock_client_instance
            )
            mock_client_instance.__aexit__ = AsyncMock(return_value=None)

            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.headers = {
                "content-length": "12345",
                "content-type": "audio/mpeg",
            }
            mock_client_instance.head = AsyncMock(return_value=mock_response)

            from app.api.routers.podcast import download_episode_head

            await download_episode_head(
                episode_id=1,
                user_id="test_user",
                db=MagicMock(),
            )

            call_args = MockClient.call_args
            headers_passed = call_args.kwargs.get("headers")

            assert headers_passed is not None
            assert "User-Agent" in headers_passed
            assert "Mozilla/5.0" in headers_passed["User-Agent"]
