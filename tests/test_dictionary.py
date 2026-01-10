import pytest
from httpx import AsyncClient
from unittest.mock import patch, MagicMock


@pytest.mark.asyncio
async def test_api_dictionary_lookup(client: AsyncClient):
    mock_results = [
        {
            "dictionary": "Test Dict",
            "entry": "hello",
            "definition": "A greeting.",
            "source_dir": "test_dict",
        }
    ]

    # We patch `app.services.dictionary.dict_manager.lookup` directly,
    # as `app.api.routers.dictionary` imports `dict_manager` and calls `dict_manager.lookup`.
    # Since `lookup` is not async, but run_in_threadpool is used.

    with patch(
        "app.services.dictionary.dict_manager.lookup", return_value=mock_results
    ) as mock_lookup:
        response = await client.post("/api/dictionary/lookup", json={"word": "hello"})

        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert len(data["results"]) == 1
        assert data["results"][0]["definition"] == "A greeting."
        mock_lookup.assert_called_once_with("hello")


@pytest.mark.asyncio
async def test_api_dictionary_context_success(client: AsyncClient):
    # Mock llm_service.sync_client
    mock_response = MagicMock()
    mock_response.choices[0].message.content = "It means a greeting."

    # We need to patch llm_service.sync_client.chat.completions.create
    # Because `api_dict_context` uses `run_in_threadpool(lambda: client.chat.completions.create(...))`

    with patch("app.services.llm.llm_service.sync_client") as mock_client:
        mock_client.chat.completions.create.return_value = mock_response

        response = await client.post(
            "/api/dictionary/context", json={"word": "hello", "sentence": "Hello world"}
        )

        assert response.status_code == 200
        assert response.json()["explanation"] == "It means a greeting."


@pytest.mark.asyncio
async def test_api_dictionary_context_no_client(client: AsyncClient):
    with patch("app.services.llm.llm_service.sync_client", None):
        response = await client.post(
            "/api/dictionary/context", json={"word": "hello", "sentence": "Hello world"}
        )
        assert response.status_code == 200
        assert "not configured" in response.json()["explanation"]


@pytest.mark.asyncio
async def test_get_resource_legacy(client: AsyncClient):
    # Mock dict_manager.get_resource
    with patch("app.services.dictionary.dict_manager.get_resource") as mock_get:
        mock_get.return_value = (b"fake_image_data", "image/png")

        response = await client.get("/dict/resource?path=image.png")

        assert response.status_code == 200
        assert response.content == b"fake_image_data"
        assert response.headers["content-type"] == "image/png"


@pytest.mark.asyncio
async def test_get_resource_legacy_not_found(client: AsyncClient):
    with patch("app.services.dictionary.dict_manager.get_resource") as mock_get:
        mock_get.return_value = (None, "application/octet-stream")

        response = await client.get("/dict/resource?path=unknown.png")

        assert response.status_code == 404
