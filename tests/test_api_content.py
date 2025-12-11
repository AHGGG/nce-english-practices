import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock, MagicMock
from app.api.routers.content import ThemeVocabulary

# Note on Patching:
# app.api.routers.content imports DB functions inside the route handler functions.
# e.g., `from app.database import get_session_vocab` inside `api_generate_theme`.
# Therefore, `sys.modules` lookup for `app.database` happens at runtime inside the function.
# Patching `app.database.get_session_vocab` GLOBALLY works in this case because
# the import happens *after* the patch is applied (when the route is called).
#
# Unlike top-level imports where `from x import y` binds `y` at module load time (before tests run),
# local imports inside functions bind at call time.

@pytest.mark.asyncio
async def test_api_generate_theme_cache_hit(client: AsyncClient):
    mock_vocab = {"topic": "Travel", "words": []}

    # Correctly mocking app.database.get_session_vocab works because of local import
    with patch("app.database.get_session_vocab", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_vocab

        response = await client.post("/api/theme", json={"topic": "Travel"})

        assert response.status_code == 200
        assert response.json() == mock_vocab
        mock_get.assert_called_once_with("Travel")

@pytest.mark.asyncio
async def test_api_generate_theme_generate_new(client: AsyncClient):
    # Mock cache miss
    with patch("app.database.get_session_vocab", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = None

        mock_theme_obj = MagicMock(spec=ThemeVocabulary)
        mock_theme_obj.serialize.return_value = {"topic": "Travel", "generated": True}

        # Patching fastapi.concurrency.run_in_threadpool
        # Since it is also imported locally inside the function, global patch works.
        with patch("fastapi.concurrency.run_in_threadpool", new_callable=AsyncMock) as mock_run, \
             patch("app.database.log_session", new_callable=AsyncMock) as mock_log:

            mock_run.return_value = mock_theme_obj

            response = await client.post("/api/theme", json={"topic": "Travel"})

            assert response.status_code == 200
            assert response.json()["generated"] is True
            mock_log.assert_called_once()

@pytest.mark.asyncio
async def test_api_generate_story_cache_hit(client: AsyncClient):
    mock_story = {"content": "Once upon a time", "grammar_points": []}

    with patch("app.database.get_story", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_story

        response = await client.post("/api/story", json={"topic": "Fairy", "target_tense": "Past"})

        assert response.status_code == 200
        assert response.json() == mock_story

@pytest.mark.asyncio
async def test_api_generate_story_stream_to_data(client: AsyncClient):
    # Mock cache miss
    with patch("app.database.get_story", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = None

        # generate_story_stream is imported at top level:
        # `from app.generators.story import generate_story_stream`
        # So we MUST patch `app.api.routers.content.generate_story_stream`

        async def mock_stream(*args, **kwargs):
            yield '{"type": "text", "chunk": "Once "}'
            yield '{"type": "text", "chunk": "upon a time."}'
            yield '{"type": "data", "story": {"content": "Once upon a time.", "data": true}}'

        with patch("app.api.routers.content.generate_story_stream", side_effect=mock_stream) as mock_gen:

            response = await client.post("/api/story", json={"topic": "Fairy", "target_tense": "Past"})

            assert response.status_code == 200
            data = response.json()
            assert data["content"] == "Once upon a time."
            assert data["data"] is True

@pytest.mark.asyncio
async def test_api_generate_sentences(client: AsyncClient):
    mock_data = {"sentences": ["I ran."]}

    # run_in_threadpool imported locally
    with patch("fastapi.concurrency.run_in_threadpool", new_callable=AsyncMock) as mock_run:
        mock_run.return_value = mock_data

        response = await client.post("/api/sentences", json={
            "topic": "Run",
            "time_layer": "Past",
            "subject": "I",
            "verb_base": "run",
            "verb_past": "ran",
            "verb_participle": "run"
        })

        assert response.status_code == 200
        assert response.json() == mock_data
        mock_run.assert_called_once()
