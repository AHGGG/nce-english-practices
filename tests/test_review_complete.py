import pytest
from httpx import AsyncClient
from sqlalchemy import select
from app.models.orm import ReviewLog, ReviewItem
from app.api.routers.review import calculate_sm2
from datetime import datetime, timedelta
from unittest.mock import patch

@pytest.mark.asyncio
async def test_complete_review_with_time(client: AsyncClient, db_session):
    # 1. Create a ReviewItem manually
    item = ReviewItem(
        user_id="default_user",
        source_id="test:1",
        sentence_index=0,
        sentence_text="Test sentence",
        next_review_at=datetime.utcnow() - timedelta(minutes=1),
        interval_days=1.0,
        easiness_factor=2.5,
        repetition=0,
        created_at=datetime.utcnow()
    )
    db_session.add(item)
    await db_session.commit()
    await db_session.refresh(item)

    # 2. Complete review with duration
    duration = 5000 # 5 seconds
    response = await client.post(
        "/api/review/complete",
        json={
            "item_id": item.id,
            "quality": 3,
            "duration_ms": duration
        }
    )
    assert response.status_code == 200

    # 3. Verify Log
    stmt = select(ReviewLog).where(ReviewLog.review_item_id == item.id)
    result = await db_session.execute(stmt)
    log = result.scalars().first()
    assert log is not None
    assert log.duration_ms == duration
    assert log.quality == 3

@pytest.mark.asyncio
async def test_performance_data_includes_review_time(client, db_session):
    # 1. Create a Log with duration
    # We need a ReviewItem first due to FK
    item = ReviewItem(
        user_id="default_user",
        source_id="test:2",
        sentence_index=0,
        sentence_text="Test 2",
        next_review_at=datetime.utcnow(),
        created_at=datetime.utcnow()
    )
    db_session.add(item)
    await db_session.commit()
    await db_session.refresh(item)

    duration = 10000 # 10 seconds
    log = ReviewLog(
        review_item_id=item.id,
        quality=3,
        interval_at_review=1.0,
        duration_ms=duration,
        reviewed_at=datetime.utcnow()
    )
    db_session.add(log)
    await db_session.commit()

    # 2. Fetch Performance Data with Mock
    class SessionContext:
        def __init__(self, session):
            self.session = session
        async def __aenter__(self):
            return self.session
        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass

    with patch("app.database.performance.AsyncSessionLocal", side_effect=lambda: SessionContext(db_session)):
        from app.database.performance import get_performance_data
        data = await get_performance_data(days=1)
    
    # 3. Verify
    review_time = data["study_time"]["breakdown"]["review"]
    assert review_time >= 10 # 10 seconds
