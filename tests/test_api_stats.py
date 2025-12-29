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


@pytest.mark.asyncio
async def test_api_get_performance(client: AsyncClient):
    """Test the new /api/performance endpoint with business-aligned metrics."""
    mock_performance = {
        "summary": {
            "vocab_size": 1200,
            "mastery_rate": 0.35,
            "comprehension_score": 0.82,
            "total_study_minutes": 1845
        },
        "vocabulary": {
            "distribution": {"new": 500, "learning": 350, "mastered": 350},
            "difficult_words": [{"word": "ambiguous", "difficulty": 0.8, "huh_count": 4}],
            "recent_words": [{"word": "negotiate", "source": "epub", "timestamp": "2024-12-29T10:00:00"}]
        },
        "activity": {
            "daily_counts": [{"date": "2024-12-20", "count": 15}],
            "by_type": {"quiz": {"count": 50, "passed": 42}}
        },
        "sources": {
            "distribution": {"epub": 45, "rss": 20, "dictionary": 25}
        }
    }

    with patch("app.api.routers.stats.get_performance_data", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_performance

        response = await client.get("/api/performance?days=30")

        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert data["summary"]["vocab_size"] == 1200
        assert "vocabulary" in data
        assert "activity" in data
        assert "sources" in data
        mock_get.assert_called_once_with(days=30)
