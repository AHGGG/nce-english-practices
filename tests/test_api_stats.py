import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock

@pytest.mark.asyncio
async def test_api_get_stats(client: AsyncClient):
    # Mock return value of get_user_stats
    mock_stats = {
        "total_sessions": 10,
        "total_messages": 50,
        "vocab_count": 5
    }

    # app.api.routers.stats imports get_user_stats from app.database
    # Since it's imported as `from app.database import get_user_stats`,
    # and used as `get_user_stats()`, we should patch `app.api.routers.stats.get_user_stats`.
    # BUT, if `app.api.routers.stats` is already imported, we might need to patch there.
    # However, standard practice if using `from module import func` is to patch where it's used.

    with patch("app.api.routers.stats.get_user_stats", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_stats

        response = await client.get("/api/stats")

        assert response.status_code == 200
        assert response.json() == mock_stats
        mock_get.assert_called_once()
