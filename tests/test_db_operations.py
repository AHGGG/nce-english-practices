import pytest
from unittest.mock import patch
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

from app.database import (
    log_session, get_session_vocab,
    log_story, get_story,
    log_attempt, get_user_stats,
    add_review_note, get_due_reviews, update_srs_schedule
)
from app.db_models import ReviewNote, SRSSchedule

# Helpers for testing DB functions that instantiate their own session
@asynccontextmanager
async def mock_session_local_factory(db_session):
    yield db_session

@pytest.fixture
def mock_db_context(db_session):
    # This fixture patches AsyncSessionLocal to return the TEST session (db_session fixture).
    # It also patches commit to flush, so we can verify state but rollback after test.

    @asynccontextmanager
    async def factory():
        yield db_session

    async def fake_commit():
        await db_session.flush()

    with patch("app.database.AsyncSessionLocal", side_effect=factory), \
         patch.object(db_session, "commit", side_effect=fake_commit):
        yield

@pytest.mark.asyncio
async def test_session_vocab_flow(mock_db_context):
    topic = "Travel"
    vocab = {"words": ["ticket", "plane"]}

    # 1. Log Session
    await log_session(topic, vocab)

    # 2. Retrieve Session
    result = await get_session_vocab(topic)
    assert result == vocab

    # 3. Retrieve Non-Existent
    result_none = await get_session_vocab("Unknown")
    assert result_none is None

@pytest.mark.asyncio
async def test_story_flow(mock_db_context):
    topic = "Fairy"
    tense = "Past"
    story_data = {
        "title": "A Tale",
        "content": "Once upon...",
        "highlights": ["Once"],
        "grammar_notes": []
    }

    # 1. Log Story
    await log_story(topic, tense, story_data)

    # 2. Get Story
    result = await get_story(topic, tense)
    assert result is not None
    assert result["title"] == "A Tale"

    # 3. Duplicate Log (should not fail, just return)
    await log_story(topic, tense, story_data)

@pytest.mark.asyncio
async def test_attempt_stats_flow(mock_db_context):
    # 1. Log Attempts
    await log_attempt("quiz", "T1", "Past", {}, {}, True, xp=10, duration_seconds=60)
    await log_attempt("quiz", "T1", "Past", {}, {}, False, xp=10, duration_seconds=30)

    # 2. Get Stats
    stats = await get_user_stats()

    assert stats["total_xp"] == 11 # 10 + 1
    assert stats["total_minutes"] == 2 # 90 sec -> 1.5 -> round to 2? or int division?
    # Implementation: round(total_sec / 60). 90/60=1.5 -> round(1.5)=2 (Python 3 rounds to nearest even for .5 usually, but let's check)

    activities = stats["activities"]
    assert len(activities) == 1
    assert activities[0]["activity_type"] == "quiz"
    assert activities[0]["count"] == 2
    assert activities[0]["passed"] == 1

    assert len(stats["recent"]) == 2

@pytest.mark.asyncio
async def test_review_srs_flow(mock_db_context):
    # 1. Add Note
    note_id = await add_review_note("bad", "good")
    assert note_id is not None

    # 2. Get Due Reviews (Newly added is due immediately)
    due = await get_due_reviews()
    assert len(due) >= 1
    my_note = next((n for n in due if n["id"] == note_id), None)
    assert my_note is not None
    assert my_note["original_sentence"] == "bad"

    # 3. Update SRS
    future = datetime.utcnow() + timedelta(days=5)
    await update_srs_schedule(note_id, future, 1, 2.5, 1)

    # 4. Check not due
    due_after = await get_due_reviews()
    my_note_after = next((n for n in due_after if n["id"] == note_id), None)
    assert my_note_after is None
