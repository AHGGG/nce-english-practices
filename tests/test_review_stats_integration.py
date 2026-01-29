import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta
from app.models.orm import ReviewItem, ReviewLog

@pytest.mark.asyncio
async def test_review_stats_integration(client: AsyncClient, db_session):
    user_id = "default_user"
    now = datetime.utcnow()

    # 1. Setup Test Data
    # 2 Items total
    # Item 1: Due now (overdue), 2 reviews, EF 2.5
    item1 = ReviewItem(
        user_id=user_id,
        source_id="test:1",
        sentence_index=0,
        sentence_text="Item 1",
        easiness_factor=2.5,
        next_review_at=now - timedelta(days=1), # Overdue
        created_at=now
    )

    # Item 2: Not due (future), 1 review, EF 2.6
    item2 = ReviewItem(
        user_id=user_id,
        source_id="test:2",
        sentence_index=0,
        sentence_text="Item 2",
        easiness_factor=2.6,
        next_review_at=now + timedelta(days=1), # Future
        created_at=now
    )

    db_session.add(item1)
    db_session.add(item2)
    await db_session.commit()
    await db_session.refresh(item1)
    await db_session.refresh(item2)

    # Logs
    logs = [
        ReviewLog(review_item_id=item1.id, quality=3, interval_at_review=1, reviewed_at=now),
        ReviewLog(review_item_id=item1.id, quality=4, interval_at_review=2, reviewed_at=now),
        ReviewLog(review_item_id=item2.id, quality=5, interval_at_review=1, reviewed_at=now),
    ]
    db_session.add_all(logs)
    await db_session.commit()

    # 2. Call Endpoint
    response = await client.get("/api/review/stats")

    # 3. Verify Results
    assert response.status_code == 200
    data = response.json()

    # Expected:
    # Total Items: 2
    # Due Items: 1 (item1)
    # Total Reviews: 3
    # Average EF: (2.5 + 2.6) / 2 = 2.55

    assert data["total_items"] == 2
    assert data["due_items"] == 1
    assert data["total_reviews"] == 3
    assert data["average_easiness_factor"] == 2.55
