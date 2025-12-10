import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/")
    assert response.status_code == 200
    # assert "text/html" in response.headers["content-type"]

@pytest.mark.asyncio
async def test_stats_empty_db(client: AsyncClient):
    # This verifies the DB is connected (even if empty)
    response = await client.get("/api/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_xp" in data
    assert data["total_xp"] == 0
