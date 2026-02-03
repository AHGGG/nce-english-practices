import asyncio
import sys
import argparse
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import delete, select
from app.core.db import AsyncSessionLocal
from app.models.podcast_orm import (
    PodcastFeedSubscription,
    UserEpisodeState,
    PodcastListeningSession,
    PodcastFeed,
    PodcastEpisode,
)


async def unsubscribe_all(
    user_id: str, force: bool = False, clean_history: bool = False
):
    """
    Unsubscribe a user from all podcasts and optionally clean history.
    Also cleans up podcast feeds that have no other subscribers.

    # Basic usage (unsubscribe only)
    uv run python scripts/unsubscribe_all_podcasts.py <user_id>
    # Docker compose usage (unsubscribe only)
    docker compose exec app uv run python scripts/unsubscribe_all_podcasts.py <user_id>

    # Automated run (no prompt)
    uv run python scripts/unsubscribe_all_podcasts.py <user_id> --force
    # Complete clean slate (unsubscribe + delete history)
    uv run python scripts/unsubscribe_all_podcasts.py <user_id> --clean-history
    """
    async with AsyncSessionLocal() as session:
        # Check current subscriptions
        stmt_subs = select(PodcastFeedSubscription).where(
            PodcastFeedSubscription.user_id == user_id
        )
        result_subs = await session.execute(stmt_subs)
        subs = result_subs.scalars().all()
        subs_count = len(subs)

        # Store feed IDs to check for orphans later
        feed_ids_to_check = [sub.feed_id for sub in subs]

        history_count = 0
        session_count = 0

        if clean_history:
            # Check history (UserEpisodeState)
            stmt_hist = select(UserEpisodeState).where(
                UserEpisodeState.user_id == user_id
            )
            result_hist = await session.execute(stmt_hist)
            history_count = len(result_hist.scalars().all())

            # Check sessions (PodcastListeningSession)
            stmt_sess = select(PodcastListeningSession).where(
                PodcastListeningSession.user_id == user_id
            )
            result_sess = await session.execute(stmt_sess)
            session_count = len(result_sess.scalars().all())

        if subs_count == 0 and (
            not clean_history or (history_count == 0 and session_count == 0)
        ):
            print(
                f"User '{user_id}' has no subscriptions"
                + (" or history." if clean_history else ".")
            )
            return

        print(f"User '{user_id}' has:")
        print(f"  - {subs_count} subscriptions")
        if clean_history:
            print(f"  - {history_count} episode states (history)")
            print(f"  - {session_count} listening sessions")

        # Confirm deletion
        if not force:
            prompt = "Are you sure you want to DELETE ALL subscriptions"
            if clean_history:
                prompt += " AND HISTORY"
            prompt += f" for user '{user_id}'? (y/N): "

            confirm = input(prompt)
            if confirm.lower() != "y":
                print("Operation cancelled.")
                return

        # Delete Subscriptions
        if subs_count > 0:
            delete_subs = delete(PodcastFeedSubscription).where(
                PodcastFeedSubscription.user_id == user_id
            )
            await session.execute(delete_subs)
            print(f"Deleted {subs_count} subscriptions.")

        # Delete History if requested
        if clean_history:
            if history_count > 0:
                delete_hist = delete(UserEpisodeState).where(
                    UserEpisodeState.user_id == user_id
                )
                await session.execute(delete_hist)
                print(f"Deleted {history_count} episode states.")

            if session_count > 0:
                delete_sess = delete(PodcastListeningSession).where(
                    PodcastListeningSession.user_id == user_id
                )
                await session.execute(delete_sess)
                print(f"Deleted {session_count} listening sessions.")

        # Prune orphaned feeds (feeds with no remaining subscriptions)
        if feed_ids_to_check:
            # Check if any other users are subscribed to these feeds
            stmt_remaining = select(PodcastFeedSubscription.feed_id).where(
                PodcastFeedSubscription.feed_id.in_(feed_ids_to_check)
            )
            result_remaining = await session.execute(stmt_remaining)
            # These feeds still have subscriptions
            remaining_feed_ids = set(result_remaining.scalars().all())

            # Identify orphans
            orphaned_feed_ids = set(feed_ids_to_check) - remaining_feed_ids

            if orphaned_feed_ids:
                print(f"Found {len(orphaned_feed_ids)} orphaned feeds. Cleaning up...")

                # 1. Get all episode IDs for these feeds
                # We need to manually delete dependent records because bulk delete doesn't trigger ORM cascades,
                # and the database might not have ON DELETE CASCADE configured.
                stmt_episodes = select(PodcastEpisode.id).where(
                    PodcastEpisode.feed_id.in_(orphaned_feed_ids)
                )
                result_episodes = await session.execute(stmt_episodes)
                episode_ids = result_episodes.scalars().all()

                if episode_ids:
                    # 2. Delete UserEpisodeState for these episodes (all users)
                    delete_states = delete(UserEpisodeState).where(
                        UserEpisodeState.episode_id.in_(episode_ids)
                    )
                    await session.execute(delete_states)

                    # 3. Delete PodcastListeningSession for these episodes (all users)
                    delete_sessions = delete(PodcastListeningSession).where(
                        PodcastListeningSession.episode_id.in_(episode_ids)
                    )
                    await session.execute(delete_sessions)

                    # 4. Delete Episodes
                    delete_episodes = delete(PodcastEpisode).where(
                        PodcastEpisode.id.in_(episode_ids)
                    )
                    await session.execute(delete_episodes)
                    print(
                        f"Deleted {len(episode_ids)} orphaned episodes and their history/states."
                    )

                # 5. Delete Feeds
                delete_feeds = delete(PodcastFeed).where(
                    PodcastFeed.id.in_(orphaned_feed_ids)
                )
                await session.execute(delete_feeds)
                print(f"Pruned {len(orphaned_feed_ids)} orphaned podcast feeds.")
            else:
                print(
                    "No orphaned feeds found (other users are subscribed to these feeds)."
                )

        await session.commit()
        print(f"Successfully cleaned up data for user '{user_id}'.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Unsubscribe user from all podcasts and optionally clean history."
    )
    parser.add_argument("user_id", help="The user ID to target")
    parser.add_argument(
        "-f", "--force", action="store_true", help="Skip confirmation prompt"
    )
    parser.add_argument(
        "--clean-history",
        action="store_true",
        help="Also delete listening history and sessions (Clean Slate)",
    )

    args = parser.parse_args()

    # Run async function
    try:
        asyncio.run(unsubscribe_all(args.user_id, args.force, args.clean_history))
    except KeyboardInterrupt:
        print("\nOperation cancelled.")
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)
