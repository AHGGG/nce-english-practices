"""
Tests for Sentence Study API endpoints (ASL - Adaptive Sentence Learning).
"""

import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
async def test_record_clear_response(client: AsyncClient):
    """Test recording a clear response without word clicks."""
    response = await client.post(
        "/api/sentence-study/record",
        json={
            "source_type": "epub",
            "source_id": "epub:test.epub:1",
            "sentence_index": 0,
            "initial_response": "clear",
            "word_clicks": [],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "record_id" in data


@pytest.mark.asyncio
async def test_record_clear_with_word_clicks(client: AsyncClient):
    """Test recording clear with word clicks - indicates vocab gap despite understanding."""
    response = await client.post(
        "/api/sentence-study/record",
        json={
            "source_type": "epub",
            "source_id": "epub:test.epub:1",
            "sentence_index": 1,
            "initial_response": "clear",
            "word_clicks": ["unprecedented", "surge"],
        },
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_record_unclear_vocabulary(client: AsyncClient):
    """Test recording an unclear response with vocabulary choice."""
    response = await client.post(
        "/api/sentence-study/record",
        json={
            "source_type": "epub",
            "source_id": "epub:test.epub:1",
            "sentence_index": 2,
            "initial_response": "unclear",
            "unclear_choice": "vocabulary",
            "simplified_response": "got_it",
            "word_clicks": ["unprecedented"],
        },
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_record_unclear_grammar(client: AsyncClient):
    """Test recording an unclear response with grammar choice."""
    response = await client.post(
        "/api/sentence-study/record",
        json={
            "source_type": "epub",
            "source_id": "epub:test.epub:1",
            "sentence_index": 3,
            "initial_response": "unclear",
            "unclear_choice": "grammar",
            "simplified_response": "got_it",
            "word_clicks": [],
        },
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_record_unclear_both(client: AsyncClient):
    """Test recording an unclear response with 'both' choice (fundamental gap)."""
    response = await client.post(
        "/api/sentence-study/record",
        json={
            "source_type": "epub",
            "source_id": "epub:test.epub:1",
            "sentence_index": 4,
            "initial_response": "unclear",
            "unclear_choice": "both",
            "simplified_response": "got_it",
            "word_clicks": [],
        },
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_get_progress_empty(client: AsyncClient):
    """Test fetching progress for an article with no records."""
    response = await client.get("/api/sentence-study/epub:empty-test.epub:1/progress")
    assert response.status_code == 200
    data = response.json()
    assert data["studied_count"] == 0
    assert data["clear_count"] == 0
    assert data["current_index"] == 0


@pytest.mark.asyncio
async def test_get_progress_with_records(client: AsyncClient):
    """Test fetching progress after recording some sentences."""
    source_id = "epub:progress-test.epub:1"

    # Record 3 sentences: 2 clear, 1 unclear
    await client.post(
        "/api/sentence-study/record",
        json={
            "source_type": "epub",
            "source_id": source_id,
            "sentence_index": 0,
            "initial_response": "clear",
        },
    )
    await client.post(
        "/api/sentence-study/record",
        json={
            "source_type": "epub",
            "source_id": source_id,
            "sentence_index": 1,
            "initial_response": "clear",
        },
    )
    await client.post(
        "/api/sentence-study/record",
        json={
            "source_type": "epub",
            "source_id": source_id,
            "sentence_index": 2,
            "initial_response": "unclear",
            "unclear_choice": "vocabulary",
        },
    )

    # Check progress
    response = await client.get(f"/api/sentence-study/{source_id}/progress")
    assert response.status_code == 200
    data = response.json()

    assert data["studied_count"] == 3
    assert data["clear_count"] == 2
    assert data["unclear_count"] == 1
    assert data["current_index"] == 3  # Next sentence to study


@pytest.mark.asyncio
async def test_get_study_highlights(client: AsyncClient):
    """Test fetching all study highlights (word/phrase clicks) for an article."""
    source_id = "epub:highlight-test.epub:1"

    # Record some sentences with word and phrase clicks
    await client.post(
        "/api/sentence-study/record",
        json={
            "source_type": "epub",
            "source_id": source_id,
            "sentence_index": 0,
            "initial_response": "unclear",
            "unclear_choice": "vocabulary",
            "word_clicks": ["unprecedented", "surge"],
            "phrase_clicks": ["take advantage of"],
        },
    )
    await client.post(
        "/api/sentence-study/record",
        json={
            "source_type": "epub",
            "source_id": source_id,
            "sentence_index": 1,
            "initial_response": "clear",
            "word_clicks": ["remarkable"],  # Clear but still looked up a word
            "phrase_clicks": [],
        },
    )

    # Fetch highlights with total_sentences=2 (to test is_complete)
    response = await client.get(
        f"/api/sentence-study/{source_id}/study-highlights?total_sentences=2"
    )
    assert response.status_code == 200
    data = response.json()

    # Verify aggregated word clicks
    assert "unprecedented" in data["word_clicks"]
    assert "surge" in data["word_clicks"]
    assert "remarkable" in data["word_clicks"]

    # Verify aggregated phrase clicks
    assert "take advantage of" in data["phrase_clicks"]

    # Verify counts
    assert data["studied_count"] == 2
    assert data["clear_count"] == 1
    assert data["is_complete"] is True


@pytest.mark.asyncio
async def test_detect_collocations_with_keyword(client: AsyncClient):
    """
    Test that detect-collocations endpoint correctly parses key_word from LLM response.
    """

    # Mock response from LLM
    mock_llm_response_content = """
    [
        {
            "text": "sit down",
            "key_word": "sit",
            "start_word_idx": 0,
            "end_word_idx": 1
        },
        {
            "text": "look forward to",
            "key_word": "look",
            "start_word_idx": 4,
            "end_word_idx": 6
        }
    ]
    """

    # Setup the mock
    mock_completion = MagicMock()
    mock_completion.choices = [
        MagicMock(message=MagicMock(content=mock_llm_response_content))
    ]

    # We need to patch where llm_service is used.
    # In app/api/routers/sentence_study.py, it imports llm_service from app.services.llm
    with patch(
        "app.services.llm.llm_service.async_client.chat.completions.create",
        new_callable=AsyncMock,
    ) as mock_create:
        mock_create.return_value = mock_completion

        response = await client.post(
            "/api/sentence-study/detect-collocations",
            json={"sentence": "Sit down and look forward to the show."},
        )

        assert response.status_code == 200
        data = response.json()

        collocations = data["collocations"]
        assert len(collocations) == 2

        # Verify first collocation
        c1 = collocations[0]
        assert c1["text"] == "sit down"
        assert c1["key_word"] == "sit"
        assert c1["start_word_idx"] == 0
        assert c1["end_word_idx"] == 1

        # Verify second collocation
        c2 = collocations[1]
        assert c2["text"] == "look forward to"
        assert c2["key_word"] == "look"
        assert c2["start_word_idx"] == 4
        assert c2["end_word_idx"] == 6
