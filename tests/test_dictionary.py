import pytest
from httpx import AsyncClient
from unittest.mock import patch

@pytest.mark.asyncio
async def test_dictionary_lookup(client: AsyncClient):
    # Mock the return value of dict_manager.lookup
    mock_results = [
        {
            "dictionary": "Test Dict",
            "entry": "hello",
            "definition": "A greeting.",
            "source_dir": "test_dict"
        }
    ]
    
    with patch("app.services.dictionary.dict_manager.lookup", return_value=mock_results):
        response = await client.post("/api/dictionary/lookup", json={"word": "hello"})
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert len(data["results"]) == 1
        assert data["results"][0]["definition"] == "A greeting."

@pytest.mark.asyncio
async def test_dictionary_context_no_api_key(client: AsyncClient):
    # Mock llm_service.sync_client to be None
    with patch("app.services.llm.llm_service.sync_client", None):
        response = await client.post("/api/dictionary/context", json={
            "word": "run",
            "sentence": "I run fast."
        })
        assert response.status_code == 200
        data = response.json()
        assert "AI client is not configured" in data["explanation"]
