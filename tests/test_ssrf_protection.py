import pytest
import asyncio
from unittest.mock import MagicMock, patch, AsyncMock
from pathlib import Path
import shutil
from fastapi import HTTPException
from app.api.routers.podcast import _proxy_image
from app.services.podcast_service import podcast_service

# Mock settings
TEST_CACHE_DIR = Path("tests/temp_ssrf_cache")

@pytest.fixture(autouse=True)
def clean_cache():
    if TEST_CACHE_DIR.exists():
        shutil.rmtree(TEST_CACHE_DIR)
    TEST_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    yield
    if TEST_CACHE_DIR.exists():
        shutil.rmtree(TEST_CACHE_DIR)

@pytest.mark.asyncio
async def test_ssrf_proxy_image():
    """Test that _proxy_image blocks private IPs."""
    with patch("app.api.routers.podcast.settings") as mock_settings:
        mock_settings.podcast_cache_dir = TEST_CACHE_DIR
        mock_settings.PROXY_URL = None

        # Mock httpx to allow the request (if validation wasn't there)
        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.__aexit__.return_value = None
            mock_client_cls.return_value = mock_client

            # Try to access localhost
            url = "http://127.0.0.1:8000/internal-image.jpg"

            with pytest.raises(HTTPException) as exc:
                await _proxy_image(url)

            assert exc.value.status_code == 400
            # Check for generic message, NOT containing IP
            assert exc.value.detail == "Access to private/local network restricted"

@pytest.mark.asyncio
async def test_ssrf_podcast_service():
    """Test that podcast_service.parse_feed blocks private IPs."""
    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_client_cls.return_value = mock_client

        # Try to access metadata service
        url = "http://169.254.169.254/latest/meta-data/"

        with pytest.raises(ValueError) as exc:
            await podcast_service.parse_feed(url)

        # Check for generic message
        # parse_feed wraps error in "Failed to parse feed: ..."
        assert "Access to private/local network restricted" in str(exc.value)
        # Verify we are not leaking the IP in the error message (except maybe as part of the URL which is known)
        # But our validate_url_security doesn't return the IP anymore.
        # But wait, parse_feed logs "Feed parsing failed for {rss_url}: {e}"
        # The exception message from validate_url_security is just "Access to private/local network restricted".
        # So "169.254.169.254" should not be in the exception message unless it's in the URL (which it is).
        # We want to ensure it's not in the DETAIL from the validation function.
        # But we can't easily check that here since it's wrapped.
        # But `str(e)` will be "Access to private/local network restricted".
        pass
