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
    with patch("app.api.routers.podcast.get_current_user_id", return_value="test_user"):
        with patch("app.api.routers.podcast.AsyncSessionLocal") as mock_db_ctx:
            # Mock DB Context Manager
            mock_db_session = MagicMock()

            # Make the context manager async
            mock_db_ctx.return_value.__aenter__ = AsyncMock(
                return_value=mock_db_session
            )
            mock_db_ctx.return_value.__aexit__ = AsyncMock(return_value=None)

            # Mock Episode Result
            mock_result = MagicMock()
            mock_episode = MagicMock()
            mock_episode.audio_url = "http://example.com/audio.mp3"
            mock_result.scalar_one_or_none.return_value = mock_episode

            # mock_db_session.execute needs to be awaitable
            mock_db_session.execute = AsyncMock(return_value=mock_result)

            # Mock httpx.AsyncClient
            with patch("httpx.AsyncClient") as MockClient:
                # In impl: client = httpx.AsyncClient(...)
                # So client is MockClient.return_value
                mock_client_instance = MockClient.return_value

                # Mock the response
                mock_response = MagicMock()
                mock_response.status_code = 206
                mock_response.headers = {
                    "Content-Length": "100",
                    "Content-Range": "bytes 0-99/1000",
                    "Content-Type": "audio/mpeg",
                }

                # Mock aiter_bytes to yield some data
                async def async_gen(chunk_size=None):
                    yield b"fake_audio_data"

                mock_response.aiter_bytes = async_gen
                mock_response.aclose = AsyncMock()  # Add aclose mock

                # Mock client.build_request
                mock_request_obj = MagicMock()
                mock_client_instance.build_request.return_value = mock_request_obj

                # Mock client.send (Async)
                mock_client_instance.send = AsyncMock(return_value=mock_response)
                mock_client_instance.aclose = AsyncMock()

                # Make request using TestClient or simulate params
                # To test the actual router function logic:
                from app.api.routers.podcast import download_episode
                from fastapi import Request

                # Construct a mock Request with Range header
                mock_request = MagicMock(spec=Request)
                mock_request.headers = {"range": "bytes=0-99"}

                # Call the function
                response = await download_episode(
                    episode_id=1, request=mock_request, user_id="test_user"
                )

                # Verify headers were built correctly for upstream
                # We need to check what arguments `client.build_request` was called with

                # Retrieve the call arguments
                call_args = mock_client_instance.build_request.call_args
                # The signature is build_request(method, url, headers=...)
                # call_args.args[0] is method, [1] is url
                # call_args.kwargs['headers'] is headers

                headers_passed = call_args.kwargs.get("headers")
                assert headers_passed is not None, (
                    "Headers should be passed to build_request"
                )
                assert "User-Agent" in headers_passed, "User-Agent header is missing"
                assert "Mozilla/5.0" in headers_passed["User-Agent"], (
                    "User-Agent does not look like a browser"
                )
                assert headers_passed["Range"] == "bytes=0-99", (
                    "Range header was not forwarded"
                )

                # Check the response we got back
                assert response.status_code == 206
                assert response.headers["Content-Range"] == "bytes 0-99/1000"
                assert response.headers["Accept-Ranges"] == "bytes"

                # Verify body iteration (consume the generator)
                body = [chunk async for chunk in response.body_iterator]
                assert b"fake_audio_data" in body


@pytest.mark.asyncio
async def test_download_head_endpoint_headers():
    """
    Test that the download HEAD endpoint includes proper User-Agent header.
    """
    with patch("app.api.routers.podcast.get_current_user_id", return_value="test_user"):
        with patch("app.api.routers.podcast.AsyncSessionLocal") as mock_db_ctx:
            # Mock DB Context Manager
            mock_db_session = MagicMock()
            mock_db_ctx.return_value.__aenter__ = AsyncMock(
                return_value=mock_db_session
            )
            mock_db_ctx.return_value.__aexit__ = AsyncMock(return_value=None)

            # Mock Episode Result
            mock_result = MagicMock()
            mock_episode = MagicMock()
            mock_episode.audio_url = "http://example.com/audio.mp3"
            mock_result.scalar_one_or_none.return_value = mock_episode
            mock_db_session.execute = AsyncMock(return_value=mock_result)

            # Mock httpx.AsyncClient
            with patch("httpx.AsyncClient") as MockClient:
                mock_client_instance = MockClient.return_value

                # Mock Context Manager methods since download_episode_head uses 'async with'
                mock_client_instance.__aenter__ = AsyncMock(
                    return_value=mock_client_instance
                )
                mock_client_instance.__aexit__ = AsyncMock(return_value=None)

                # Mock HEAD response
                mock_response = MagicMock()
                mock_response.status_code = 200
                mock_response.headers = {
                    "content-length": "12345",
                    "content-type": "audio/mpeg",
                }
                mock_client_instance.head = AsyncMock(return_value=mock_response)

                # Call function
                from app.api.routers.podcast import download_episode_head

                await download_episode_head(episode_id=1, user_id="test_user")

                # Verify constructor was called with headers containing User-Agent
                # In download_episode_head, headers are passed to constructor
                call_args = MockClient.call_args
                headers_passed = call_args.kwargs.get("headers")

                assert headers_passed is not None, (
                    "Headers should be passed to AsyncClient constructor"
                )
                assert "User-Agent" in headers_passed
                assert "Mozilla/5.0" in headers_passed["User-Agent"]
