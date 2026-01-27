import pytest
import shutil
from pathlib import Path
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi import HTTPException
from app.api.routers.podcast import _proxy_image

# Test setup
# We override the podcast_cache_dir for testing to avoid cluttering the real cache
TEST_CACHE_DIR = Path("tests/temp_cache")


@pytest.fixture(autouse=True)
def clean_cache():
    """Clean up cache directory before and after tests."""
    # Since settings is already instantiated in podcast.py, patching Settings.podcast_cache_dir property
    # might not work if it's accessed via the instance.
    # Instead, we patch the 'settings' object in app.api.routers.podcast directly.

    with patch("app.api.routers.podcast.settings") as mock_settings:
        mock_settings.podcast_cache_dir = TEST_CACHE_DIR
        # Also need to mock other settings accessed
        mock_settings.PROXY_URL = None
        mock_settings.SECRET_KEY = "test-secret"

        if TEST_CACHE_DIR.exists():
            shutil.rmtree(TEST_CACHE_DIR)
        TEST_CACHE_DIR.mkdir(parents=True, exist_ok=True)

        yield

        if TEST_CACHE_DIR.exists():
            shutil.rmtree(TEST_CACHE_DIR)


@pytest.mark.asyncio
async def test_proxy_image_cache_miss_then_hit():
    """Test that image is fetched, cached, and then served from cache."""
    # We must patch validate_url_security to allow the example.com URL
    with patch("app.core.utils.validate_url_security"):

        url = "http://example.com/image.jpg"
        dummy_content = b"\xff\xd8\xff\xe0\x00\x10JFIF"  # Fake JPEG header

        # Mock httpx.AsyncClient
        with patch("httpx.AsyncClient") as mock_client_cls:
            # Create an AsyncMock for the client instance
            mock_client = AsyncMock()

            # Configure __aenter__ to return the mock client itself
            mock_client.__aenter__.return_value = mock_client
            mock_client.__aexit__.return_value = None

            # Mock Response
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.content = dummy_content
            mock_response.headers = {"content-type": "image/jpeg"}

            # Ensure client.get returns the mock response
            mock_client.get.return_value = mock_response

            # Configure the class to return our mock instance
            mock_client_cls.return_value = mock_client

            # 1. First Call: Cache Miss
            response = await _proxy_image(url)

            # Verify response
            assert response.status_code == 200  # FileResponse usually sets 200
            assert "image.jpg" in response.headers["content-disposition"]

            # Verify network call
            mock_client.get.assert_called_once_with(url)

            # Verify file creation
            import hashlib

            url_hash = hashlib.md5(url.encode("utf-8")).hexdigest()
            expected_path = TEST_CACHE_DIR / f"{url_hash}.jpg"
            assert expected_path.exists()
            assert expected_path.read_bytes() == dummy_content

            # 2. Second Call: Cache Hit
            mock_client.get.reset_mock()

            response2 = await _proxy_image(url)

            # Verify response
            assert str(response2.path) == str(expected_path)

            # Verify NO network call
            mock_client.get.assert_not_called()


@pytest.mark.asyncio
async def test_proxy_image_invalid_url():
    """Test validation."""
    with pytest.raises(HTTPException) as exc:
        await _proxy_image("ftp://bad-protocol.com")
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_proxy_image_upstream_404():
    """Test upstream 404 handling."""
    # Patch validate_url_security
    with patch("app.core.utils.validate_url_security"):
        url = "http://example.com/notfound.jpg"

        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.__aexit__.return_value = None

            mock_response = MagicMock()
            mock_response.status_code = 404
            mock_client.get.return_value = mock_response
            mock_client_cls.return_value = mock_client

            with pytest.raises(HTTPException) as exc:
                await _proxy_image(url)
            assert exc.value.status_code == 404

@pytest.mark.asyncio
async def test_proxy_image_ssrf_protection():
    """Test that internal IPs are blocked."""

    # Simulate validate_url_security raising ValueError
    with patch("app.core.utils.validate_url_security", side_effect=ValueError("Access to private/local IP 192.168.1.1 is forbidden")):
        with pytest.raises(HTTPException) as exc:
            await _proxy_image("http://192.168.1.1/image.jpg")

        assert exc.value.status_code == 400
        assert "Access to private/local IP 192.168.1.1 is forbidden" in exc.value.detail
