import pytest
from unittest.mock import AsyncMock, patch
from app.services.podcast_service import podcast_service

@pytest.mark.asyncio
async def test_parse_feed_validates_url():
    """Test that parse_feed calls validate_url_security."""

    # Mock validate_url_security to raise ValueError
    with patch("app.services.podcast_service.validate_url_security") as mock_validate:
        mock_validate.side_effect = ValueError("Blocked!")

        with pytest.raises(ValueError, match="Blocked!"):
            await podcast_service.parse_feed("http://malicious.com")

        mock_validate.assert_called_once_with("http://malicious.com")

@pytest.mark.asyncio
async def test_parse_feed_valid_url():
    """Test that parse_feed proceeds for valid URL."""

    # Mock validate_url_security to pass
    with patch("app.services.podcast_service.validate_url_security") as mock_validate:
        # Mock httpx client
        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client_cls.return_value.__aenter__.return_value = mock_client

            mock_response = AsyncMock()
            mock_response.text = """
            <rss version="2.0">
            <channel>
                <title>Test Feed</title>
                <item><title>Ep 1</title></item>
            </channel>
            </rss>
            """
            mock_client.get.return_value = mock_response

            result = await podcast_service.parse_feed("http://valid.com/feed.xml")

            assert result["feed"]["title"] == "Test Feed"
            mock_validate.assert_called_once_with("http://valid.com/feed.xml")
