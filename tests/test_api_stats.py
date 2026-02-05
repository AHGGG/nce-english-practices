import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock


@pytest.mark.asyncio
async def test_api_get_performance(client: AsyncClient):
    """Test the simplified /api/performance endpoint."""
    mock_performance = {
        "study_time": {
            "total_seconds": 3600,
            "total_minutes": 60,
            "breakdown": {"sentence_study": 1800, "reading": 1800},
        },
        "reading_stats": {
            "total_words": 5000,
            "sessions_count": 10,
            "articles_count": 5,
        },
    }

    mock_memory_curve = {
        "actual": [{"day": 1, "retention": 0.9, "sample_size": 10}],
        "ebbinghaus": [{"day": 1, "retention": 0.9}],
        "total_words_analyzed": 10,
    }

    with (
        patch(
            "app.api.routers.stats.get_performance_data", new_callable=AsyncMock
        ) as mock_perf,
        patch(
            "app.api.routers.stats.get_memory_curve_data", new_callable=AsyncMock
        ) as mock_curve,
    ):
        mock_perf.return_value = mock_performance
        mock_curve.return_value = mock_memory_curve

        response = await client.get("/api/performance?days=30")

        assert response.status_code == 200
        data = response.json()
        assert "study_time" in data
        assert data["study_time"]["total_minutes"] == 60
        assert "reading_stats" in data
        assert data["reading_stats"]["total_words"] == 5000
        assert "memory_curve" in data
        mock_perf.assert_called_once_with(days=30, user_id="default_user")
        mock_curve.assert_called_once_with(user_id="default_user")


@pytest.mark.asyncio
async def test_api_get_study_time_detail(client: AsyncClient):
    """Test the /api/performance/study-time endpoint."""
    mock_data = {
        "daily": [
            {"date": "2023-01-01", "sentence_study": 10, "reading": 20, "voice": 30, "review": 40, "podcast": 50, "total": 150}
        ],
        "total_seconds": 150
    }

    with patch("app.api.routers.stats.get_daily_study_time", new_callable=AsyncMock) as mock_daily:
        mock_daily.return_value = mock_data

        response = await client.get("/api/performance/study-time?days=7&tz=Asia/Shanghai")

        assert response.status_code == 200
        data = response.json()
        assert data["total_seconds"] == 150
        assert len(data["daily"]) == 1
        mock_daily.assert_called_once_with(days=7, user_id="default_user", timezone="Asia/Shanghai")
