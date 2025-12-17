import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_api_docs_reachable(client: AsyncClient):
    # Verify Swagger UI is reachable (App is up)
    response = await client.get("/docs")
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_legacy_root_removed(client: AsyncClient):
    # Verify legacy frontend serving is removed
    response = await client.get("/")
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_stats_empty_db(client: AsyncClient):
    # This verifies the DB is connected (even if empty)
    response = await client.get("/api/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_xp" in data
    assert data["total_xp"] == 0
