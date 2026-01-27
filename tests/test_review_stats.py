import pytest
from httpx import AsyncClient
from app.models.orm import ReviewItem, ReviewLog
from datetime import datetime, timedelta

@pytest.mark.asyncio
async def test_get_review_stats(client: AsyncClient, db_session):
    user_id = "default_user"

    # 1. Setup Data
    # Create 3 items
    # Item 1: Due now, EF 2.5
    # Item 2: Not due, EF 3.0
    # Item 3: Due now, EF 2.0

    now = datetime.utcnow()

    item1 = ReviewItem(
        user_id=user_id,
        source_id="s1",
        sentence_index=1,
        sentence_text="t1",
        next_review_at=now - timedelta(days=1),
        easiness_factor=2.5,
        interval_days=1.0,
        repetition=1
    )

    item2 = ReviewItem(
        user_id=user_id,
        source_id="s2",
        sentence_index=2,
        sentence_text="t2",
        next_review_at=now + timedelta(days=1),
        easiness_factor=3.0,
        interval_days=2.0,
        repetition=2
    )

    item3 = ReviewItem(
        user_id=user_id,
        source_id="s3",
        sentence_index=3,
        sentence_text="t3",
        next_review_at=now - timedelta(hours=1),
        easiness_factor=2.0,
        interval_days=1.0,
        repetition=1
    )

    db_session.add_all([item1, item2, item3])
    await db_session.commit()
    await db_session.refresh(item1)

    # Create Logs
    # 2 logs for item 1
    log1 = ReviewLog(review_item_id=item1.id, quality=3, interval_at_review=1.0, duration_ms=1000)
    log2 = ReviewLog(review_item_id=item1.id, quality=4, interval_at_review=1.0, duration_ms=1000)

    db_session.add_all([log1, log2])
    await db_session.commit()

    # 2. Call API
    response = await client.get("/api/review/stats")
    assert response.status_code == 200
    data = response.json()

    # 3. Verify
    # Total Items: 3
    assert data["total_items"] == 3

    # Due Items: 2 (item1, item3)
    assert data["due_items"] == 2

    # Total Reviews: 2
    assert data["total_reviews"] == 2

    # Average EF: (2.5 + 3.0 + 2.0) / 3 = 2.5
    assert data["average_easiness_factor"] == 2.5
