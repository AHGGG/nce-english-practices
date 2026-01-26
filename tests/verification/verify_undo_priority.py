import asyncio
import sys
import os
from datetime import datetime, timedelta

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from app.core.db import AsyncSessionLocal
from app.api.routers.review import undo_last_review, complete_review
from app.models.orm import ReviewItem, ReviewLog
from sqlalchemy import select, delete


async def verify_undo_priority():
    async with AsyncSessionLocal() as db:
        user_id = "test_undo_prio"

        print(f"--- Setting up test user: {user_id} ---")
        # Cleanup
        await db.execute(
            delete(ReviewLog).where(
                ReviewLog.review_item_id.in_(
                    select(ReviewItem.id).where(ReviewItem.user_id == user_id)
                )
            )
        )
        await db.execute(delete(ReviewItem).where(ReviewItem.user_id == user_id))
        await db.commit()

        now = datetime.utcnow()

        # 1. Create Background Item (Overdue by 5 days)
        item_bg = ReviewItem(
            user_id=user_id,
            source_id="bg:1",
            sentence_index=0,
            sentence_text="Background Item",
            difficulty_type="vocabulary",
            easiness_factor=2.5,
            interval_days=1.0,
            repetition=0,
            next_review_at=now - timedelta(days=5),  # Due 5 days ago
        )
        db.add(item_bg)

        # 2. Create Active Item (Overdue by 2 days)
        # Originally, in queue: BG (5 days ago) -> Active (2 days ago)
        item_active = ReviewItem(
            user_id=user_id,
            source_id="active:1",
            sentence_index=0,
            sentence_text="Active Item",
            difficulty_type="vocabulary",
            easiness_factor=2.5,
            interval_days=1.0,
            repetition=0,
            next_review_at=now - timedelta(days=2),  # Due 2 days ago
        )
        db.add(item_active)
        await db.commit()

        await db.refresh(item_bg)
        await db.refresh(item_active)

        print(f"Item BG: {item_bg.id} (Due -5d)")
        print(f"Item Active: {item_active.id} (Due -2d)")

        # Verify Initial Queue Order
        stmt = (
            select(ReviewItem)
            .where(ReviewItem.user_id == user_id)
            .order_by(ReviewItem.next_review_at.asc())
        )
        result = await db.execute(stmt)
        queue = result.scalars().all()
        print("Initial Queue:", [i.id for i in queue])
        assert queue[0].id == item_bg.id
        assert queue[1].id == item_active.id

        # 3. Review Active Item
        # We simulate user reviewing item_active (even though it wasn't first, maybe they skipped or we picked random?)
        # Or let's review item_bg first to clear it? No, we want to test that Undo puts it at TOP.
        # Let's review item_active.
        print("\n--- Reviewing Active Item ---")
        from app.api.routers.review import CompleteReviewRequest

        req = CompleteReviewRequest(item_id=item_active.id, quality=5)
        await complete_review(req, user_id, db)

        # Verify Queue: Only BG remains
        result = await db.execute(stmt)
        queue = result.scalars().all()
        # Note: Active item is now in future, likely not in "due" query if we filtered, but here we query all.
        # Active item should be at end.
        print("Queue after review:", [i.id for i in queue])
        assert queue[0].id == item_bg.id

        # 4. Undo Review
        print("\n--- Undoing Review ---")
        await undo_last_review(user_id, db)

        await db.refresh(item_active)
        await db.refresh(item_bg)

        # 5. Verify Priority
        # Active Item should now be BEFORE BG Item
        result = await db.execute(stmt)
        queue = result.scalars().all()
        print("Queue after undo:", [i.id for i in queue])

        print(f"BG Due: {item_bg.next_review_at}")
        print(f"Active Due: {item_active.next_review_at}")

        assert queue[0].id == item_active.id, (
            "Undone item should be at the head of the queue"
        )
        assert item_active.next_review_at < item_bg.next_review_at, (
            "Undone item should have earlier due date than BG"
        )

        print("[OK] Undo Priority Logic Verified!")

        # Cleanup
        await db.execute(
            delete(ReviewLog).where(
                ReviewLog.review_item_id.in_([item_bg.id, item_active.id])
            )
        )
        await db.execute(delete(ReviewItem).where(ReviewItem.user_id == user_id))
        await db.commit()


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(verify_undo_priority())
