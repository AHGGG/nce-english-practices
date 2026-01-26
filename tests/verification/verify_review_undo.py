import asyncio
import sys
import os
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from app.core.db import AsyncSessionLocal
from app.api.routers.review import undo_last_review, complete_review
from app.models.orm import ReviewItem, ReviewLog
from sqlalchemy import select, delete


# Mock dependencies
class MockUser:
    def __init__(self, user_id="test_undo_user"):
        self.user_id = user_id

    def __call__(self):
        return self.user_id


async def verify_undo():
    async with AsyncSessionLocal() as db:
        user_id = "test_undo_user"

        print(f"--- Setting up test user: {user_id} ---")
        # Ensure clean state
        await db.execute(
            delete(ReviewLog).where(
                ReviewLog.review_item_id.in_(
                    select(ReviewItem.id).where(ReviewItem.user_id == user_id)
                )
            )
        )
        await db.execute(delete(ReviewItem).where(ReviewItem.user_id == user_id))
        await db.commit()

        print("--- Creating Test Item ---")
        # Create item: EF=2.5, Interval=1.0, Rep=0 (Default)
        item = ReviewItem(
            user_id=user_id,
            source_id="test:1",
            sentence_index=0,
            sentence_text="Test Sentence",
            difficulty_type="vocabulary",
            easiness_factor=2.5,
            interval_days=1.0,
            repetition=0,
            next_review_at=datetime.utcnow(),
        )
        db.add(item)
        await db.commit()
        await db.refresh(item)
        item_id = item.id
        print(
            f"Created Item {item_id}: EF={item.easiness_factor}, Int={item.interval_days}, Rep={item.repetition}"
        )
        assert item.easiness_factor == 2.5
        assert item.interval_days == 1.0
        assert item.repetition == 0

        print("\n--- Test 1: Complete Review (Success Q=5) ---")
        # Complete review with Q=5 (Easy)
        # Expected:
        # EF' = 2.5 + (0.1 - (0) * ...) = 2.6
        # Rep = 1
        # Interval = 1.0 (First rep is always 1 day)
        from app.api.routers.review import CompleteReviewRequest

        req = CompleteReviewRequest(item_id=item_id, quality=5)
        _ = await complete_review(req, user_id, db)

        await db.refresh(item)
        print(
            f"After Review: EF={item.easiness_factor:.2f}, Int={item.interval_days}, Rep={item.repetition}"
        )
        assert item.repetition == 1
        assert item.easiness_factor > 2.5  # Should increase

        print("\n--- Test 2: Undo Review ---")
        # Undo
        _ = await undo_last_review(user_id, db)

        await db.refresh(item)
        print(
            f"After Undo: EF={item.easiness_factor:.2f}, Int={item.interval_days}, Rep={item.repetition}"
        )

        assert item.repetition == 0
        assert abs(item.easiness_factor - 2.5) < 0.01
        assert item.interval_days == 1.0
        print("✅ Undo matches initial state!")

        print("\n--- Test 3: Complete Review (Fail Q=1) ---")
        # Fail
        req = CompleteReviewRequest(item_id=item_id, quality=1)
        _ = await complete_review(req, user_id, db)

        await db.refresh(item)
        print(
            f"After Fail: EF={item.easiness_factor:.2f}, Int={item.interval_days}, Rep={item.repetition}"
        )
        assert item.repetition == 0
        assert item.interval_days == 1.0
        # EF unchanged on fail

        print("\n--- Test 4: Undo Fail ---")
        _ = await undo_last_review(user_id, db)
        await db.refresh(item)
        print(
            f"After Undo Fail: EF={item.easiness_factor:.2f}, Int={item.interval_days}, Rep={item.repetition}"
        )

        assert item.repetition == 0
        assert item.easiness_factor == 2.5
        print("✅ Undo Fail matches initial state!")

        # Cleanup
        await db.execute(delete(ReviewLog).where(ReviewLog.review_item_id == item_id))
        await db.execute(delete(ReviewItem).where(ReviewItem.id == item_id))
        await db.commit()


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(verify_undo())
