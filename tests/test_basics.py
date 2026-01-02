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
async def test_performance_endpoint(client: AsyncClient):
    # Verify /api/performance is reachable
    response = await client.get("/api/performance")
    assert response.status_code == 200
    data = response.json()
    assert "study_time" in data
    assert "reading_stats" in data
