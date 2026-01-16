import asyncio
import sys
import os

# Add project root to sys.path
sys.path.append(os.getcwd())

from sqlalchemy import select
from app.core.db import AsyncSessionLocal
from app.models.orm import UserComprehensionProfile, SentenceLearningRecord


async def main():
    async with AsyncSessionLocal() as db:
        print("\n=== ASL User Profile Debug ===\n")

        # 1. Fetch Profile
        result = await db.execute(
            select(UserComprehensionProfile).where(
                UserComprehensionProfile.user_id == "default_user"
            )
        )
        profile = result.scalar_one_or_none()

        if profile:
            print(f"User ID: {profile.user_id}")
            print(f"Overall Score: {profile.overall_score:.2f}")
            print(f"Vocab Score: {profile.vocabulary_score:.2f}")
            print(f"Grammar Score: {profile.grammar_score:.2f}")
            print(f"Weak Vocab Topics: {profile.weak_vocabulary_topics}")
        else:
            print(
                "No UserProfile found for 'default_user'. Study some sentences to create one."
            )

        print("\n=== Last 5 Learning Records ===\n")

        # 2. Fetch Recent Records
        rec_result = await db.execute(
            select(SentenceLearningRecord)
            .order_by(SentenceLearningRecord.created_at.desc())
            .limit(5)
        )
        records = rec_result.scalars().all()

        for r in records:
            print(
                f"[{r.created_at.strftime('%H:%M:%S')}] ID: {r.id} | Initial: {r.initial_response} | Diagnosis: {r.diagnosed_gap_type} (Conf: {r.confidence})"
            )
            if r.word_clicks:
                print(f"  - Word Clicks: {r.word_clicks}")
            if r.phrase_clicks:
                print(f"  - Phrase Clicks: {r.phrase_clicks}")
            # Note: interactions aren't stored in DB model yet, just used for diagnosis logic (now added to DB!)
            if hasattr(r, "interaction_log") and r.interaction_log:
                print(f"  - Logs: {r.interaction_log}")

        print("\n=== Word Proficiency (Recent) ===\n")
        from app.models.orm import WordProficiency

        wp_result = await db.execute(
            select(WordProficiency)
            .order_by(WordProficiency.last_seen_at.desc())
            .limit(5)
        )
        wps = wp_result.scalars().all()
        for wp in wps:
            print(
                f"Word: {wp.word} | Score: {wp.difficulty_score:.2f} | Status: {wp.status} | Exposure: {wp.exposure_count}"
            )


async def test_new_logic():
    print("\n=== Testing New Logic (Mocking Requests) ===")

    # We can't easily call the API function directly without a DB session,
    # but we can verify the DB schema accepts the new fields if we were to run a migration (fields are JSON).
    # Ideally, run pytest again.
    pass


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
