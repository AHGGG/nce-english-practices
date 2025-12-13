import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock

# --- Content Router Tests ---

@pytest.mark.asyncio
async def test_api_generate_theme_exception_leak(client: AsyncClient):
    sensitive_info = "Database Connection Failed: postgres://user:pass@localhost:5432/db"

    with patch("app.database.get_session_vocab", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = None
        with patch("fastapi.concurrency.run_in_threadpool", new_callable=AsyncMock) as mock_run:
            mock_run.side_effect = Exception(sensitive_info)

            response = await client.post("/api/theme", json={"topic": "Travel"})

            assert response.status_code == 500
            data = response.json()
            assert sensitive_info not in data["detail"]
            assert data["detail"] == "Internal Server Error"

@pytest.mark.asyncio
async def test_api_generate_sentences_exception_leak(client: AsyncClient):
    sensitive_info = "Timeout connecting to 10.0.0.5"

    with patch("fastapi.concurrency.run_in_threadpool", new_callable=AsyncMock) as mock_run:
        mock_run.side_effect = Exception(sensitive_info)

        response = await client.post("/api/sentences", json={
            "topic": "Run",
            "time_layer": "Past",
            "subject": "I",
            "verb_base": "run",
            "verb_past": "ran",
            "verb_participle": "run"
        })

        assert response.status_code == 500
        data = response.json()
        assert sensitive_info not in data["detail"]
        assert data["detail"] == "Internal Server Error"

# --- Practice Router Tests ---

@pytest.mark.asyncio
async def test_api_generate_quiz_exception_leak(client: AsyncClient):
    sensitive_info = "LLM API Key Invalid: sk-12345"

    with patch("fastapi.concurrency.run_in_threadpool", new_callable=AsyncMock) as mock_run:
        mock_run.side_effect = Exception(sensitive_info)

        response = await client.post("/api/quiz", json={
            "topic": "Run",
            "tense": "Past",
            "aspect": "Simple",
            "correct_sentence": "I ran."
        })

        assert response.status_code == 500
        data = response.json()
        assert sensitive_info not in data["detail"]
        assert data["detail"] == "Internal Server Error"

@pytest.mark.asyncio
async def test_api_chat_start_exception_leak(client: AsyncClient):
    sensitive_info = "DB Table Not Found: users"

    # start_new_mission is imported directly, so we patch it
    with patch("app.api.routers.practice.start_new_mission", new_callable=AsyncMock) as mock_start:
        mock_start.side_effect = Exception(sensitive_info)

        response = await client.post("/api/chat/start", json={
            "topic": "Travel",
            "tense": "Present",
            "aspect": "Simple"
        })

        assert response.status_code == 500
        data = response.json()
        assert sensitive_info not in data["detail"]
        assert data["detail"] == "Internal Server Error"

@pytest.mark.asyncio
async def test_api_log_exception_leak(client: AsyncClient):
    sensitive_info = "Disk Full at /var/log"

    # log_matrix_attempt is imported directly
    with patch("app.api.routers.practice.log_matrix_attempt") as mock_log:
        mock_log.side_effect = Exception(sensitive_info)

        response = await client.post("/api/log", json={
            "topic": "Test",
            "words": {},
            "verb": {},
            "tense": "Past",
            "form": "Simple",
            "expected": "a",
            "user": "b",
            "result": {}
        })

        # This endpoint returns 200 with error in body currently (as per implementation)
        # But we changed the message to be generic
        assert response.status_code == 200 # Note: The status code logic wasn't changed, only message
        data = response.json()
        assert sensitive_info not in data["message"]
        assert data["message"] == "Internal Server Error"

# --- Dictionary Router Tests ---

@pytest.mark.asyncio
async def test_api_dict_lookup_exception_leak(client: AsyncClient):
    sensitive_info = "File read error: /etc/passwd"

    with patch("fastapi.concurrency.run_in_threadpool", new_callable=AsyncMock) as mock_run:
        mock_run.side_effect = Exception(sensitive_info)

        response = await client.post("/api/dictionary/lookup", json={"word": "hello"})

        assert response.status_code == 200
        data = response.json()
        assert sensitive_info not in data["error"]
        assert data["error"] == "Internal Dictionary Error"
