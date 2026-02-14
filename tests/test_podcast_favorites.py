import pytest
from unittest.mock import patch


@pytest.mark.asyncio
async def test_get_favorite_ids(client):
    with patch(
        "app.services.podcast_service.podcast_service.get_favorite_episode_ids",
        return_value=[1, 2, 3],
    ):
        response = await client.get("/api/podcast/favorites/ids")
        assert response.status_code == 200
        assert response.json() == {"episode_ids": [1, 2, 3]}


@pytest.mark.asyncio
async def test_add_favorite_success(client):
    with patch(
        "app.services.podcast_service.podcast_service.set_episode_favorite",
        return_value=True,
    ):
        response = await client.post("/api/podcast/episode/11/favorite")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["episode_id"] == 11
        assert data["is_favorite"] is True


@pytest.mark.asyncio
async def test_add_favorite_not_found(client):
    with patch(
        "app.services.podcast_service.podcast_service.set_episode_favorite",
        return_value=False,
    ):
        response = await client.post("/api/podcast/episode/999/favorite")
        assert response.status_code == 404


@pytest.mark.asyncio
async def test_remove_favorite_success(client):
    with patch(
        "app.services.podcast_service.podcast_service.remove_episode_favorite",
        return_value=True,
    ):
        response = await client.delete("/api/podcast/episode/11/favorite")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["episode_id"] == 11
        assert data["is_favorite"] is False
