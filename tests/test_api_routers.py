import pytest
from httpx import AsyncClient
from unittest.mock import patch, MagicMock
from app.models import ScenarioResponse, Mission

# --- Fixtures ---
# We reuse fixtures from conftest.py (client, db_session)

@pytest.mark.asyncio
async def test_api_generate_quiz(client: AsyncClient):
    with patch("app.api.routers.practice.generate_quiz") as mock_gen:
        mock_gen.return_value = {
            "question": "Test Question",
            "options": ["A", "B"],
            "correct_index": 0,
            "explanation": "Exp"
        }

        response = await client.post("/api/quiz", json={
            "topic": "Test",
            "tense": "Past",
            "aspect": "Simple",
            "correct_sentence": "I did it."
        })

        assert response.status_code == 200
        assert response.json()["question"] == "Test Question"

@pytest.mark.asyncio
async def test_api_grade_scenario(client: AsyncClient):
    # Mocking grade_scenario_response AND log_attempt
    with patch("app.api.routers.practice.grade_scenario_response") as mock_grade:
        # Return an actual Pydantic model instance
        mock_grade.return_value = ScenarioResponse(
            user_input="Input",
            is_pass=True,
            feedback="Good",
            improved_version="Better"
        )

        with patch("app.api.routers.practice.log_attempt") as mock_log:
            mock_log.return_value = None

            response = await client.post("/api/scenario/grade", json={
                "situation": "Sit",
                "goal": "Goal",
                "user_input": "Input",
                "tense": "Past"
            })

            assert response.status_code == 200
            assert response.json()["is_pass"] is True
            mock_log.assert_called_once()

@pytest.mark.asyncio
async def test_api_chat_start_reply(client: AsyncClient):
    with patch("app.api.routers.practice.start_new_mission") as mock_start:
        mock_start.return_value = {
            "session_id": "123",
            "message": "Hi",
            "mission": {
                "id": "m1", "title": "T", "description": "D", "required_grammar": []
            }
        }

        response = await client.post("/api/chat/start", json={
            "topic": "T",
            "tense": "P",
            "aspect": "S"
        })
        assert response.status_code == 200
        assert response.json()["session_id"] == "123"

    with patch("app.api.routers.practice.handle_chat_turn") as mock_reply:
        mock_reply.return_value = {"reply": "Hello"}

        response = await client.post("/api/chat/reply", json={
            "session_id": "123",
            "message": "User Hi"
        })
        assert response.status_code == 200
        assert response.json()["reply"] == "Hello"

@pytest.mark.asyncio
async def test_api_grade(client: AsyncClient):
    # grade_sentence is sync
    with patch("app.api.routers.practice.grade_sentence") as mock_grade:
        mock_grade.return_value = {"is_correct": True}

        response = await client.post("/api/grade", json={
            "expected": "A",
            "user": "A"
        })
        assert response.status_code == 200
        assert response.json()["is_correct"] is True

@pytest.mark.asyncio
async def test_api_log_generic(client: AsyncClient):
    with patch("app.api.routers.practice.log_attempt") as mock_log:
        response = await client.post("/api/log_attempt", json={
            "activity_type": "test",
            "topic": "topic",
            "tense": "tense",
            "is_pass": True,
            "duration_seconds": 10
        })
        assert response.status_code == 200
        mock_log.assert_called_once()
