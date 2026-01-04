"""
Tests for Sentence Study API endpoints (ASL - Adaptive Sentence Learning).
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_record_clear_response(client: AsyncClient):
    """Test recording a clear response without word clicks."""
    response = await client.post("/api/sentence-study/record", json={
        "source_type": "epub",
        "source_id": "epub:test.epub:1",
        "sentence_index": 0,
        "initial_response": "clear",
        "word_clicks": []
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "record_id" in data


@pytest.mark.asyncio
async def test_record_clear_with_word_clicks(client: AsyncClient):
    """Test recording clear with word clicks - indicates vocab gap despite understanding."""
    response = await client.post("/api/sentence-study/record", json={
        "source_type": "epub",
        "source_id": "epub:test.epub:1",
        "sentence_index": 1,
        "initial_response": "clear",
        "word_clicks": ["unprecedented", "surge"]
    })
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_record_unclear_vocabulary(client: AsyncClient):
    """Test recording an unclear response with vocabulary choice."""
    response = await client.post("/api/sentence-study/record", json={
        "source_type": "epub",
        "source_id": "epub:test.epub:1",
        "sentence_index": 2,
        "initial_response": "unclear",
        "unclear_choice": "vocabulary",
        "simplified_response": "got_it",
        "word_clicks": ["unprecedented"]
    })
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_record_unclear_grammar(client: AsyncClient):
    """Test recording an unclear response with grammar choice."""
    response = await client.post("/api/sentence-study/record", json={
        "source_type": "epub",
        "source_id": "epub:test.epub:1",
        "sentence_index": 3,
        "initial_response": "unclear",
        "unclear_choice": "grammar",
        "simplified_response": "got_it",
        "word_clicks": []
    })
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_record_unclear_both(client: AsyncClient):
    """Test recording an unclear response with 'both' choice (fundamental gap)."""
    response = await client.post("/api/sentence-study/record", json={
        "source_type": "epub",
        "source_id": "epub:test.epub:1",
        "sentence_index": 4,
        "initial_response": "unclear",
        "unclear_choice": "both",
        "simplified_response": "got_it",
        "word_clicks": []
    })
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
    await client.post("/api/sentence-study/record", json={
        "source_type": "epub",
        "source_id": source_id,
        "sentence_index": 0,
        "initial_response": "clear"
    })
    await client.post("/api/sentence-study/record", json={
        "source_type": "epub",
        "source_id": source_id,
        "sentence_index": 1,
        "initial_response": "clear"
    })
    await client.post("/api/sentence-study/record", json={
        "source_type": "epub",
        "source_id": source_id,
        "sentence_index": 2,
        "initial_response": "unclear",
        "unclear_choice": "vocabulary"
    })
    
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
    await client.post("/api/sentence-study/record", json={
        "source_type": "epub",
        "source_id": source_id,
        "sentence_index": 0,
        "initial_response": "unclear",
        "unclear_choice": "vocabulary",
        "word_clicks": ["unprecedented", "surge"],
        "phrase_clicks": ["take advantage of"]
    })
    await client.post("/api/sentence-study/record", json={
        "source_type": "epub",
        "source_id": source_id,
        "sentence_index": 1,
        "initial_response": "clear",
        "word_clicks": ["remarkable"],  # Clear but still looked up a word
        "phrase_clicks": []
    })
    
    # Fetch highlights with total_sentences=2 (to test is_complete)
    response = await client.get(f"/api/sentence-study/{source_id}/study-highlights?total_sentences=2")
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
