#!/usr/bin/env python3
"""
Clear historical sentence collocation cache records.

Use this when collocation prompt/schema changes and you want all sentences to be
re-detected with fresh LLM results.

Examples:
  uv run python scripts/clear_collocation_cache.py
  uv run python scripts/clear_collocation_cache.py --yes
  uv run python scripts/clear_collocation_cache.py --dry-run
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from sqlalchemy import text

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.db import AsyncSessionLocal


TABLE_NAME = "sentence_collocation_cache"


async def get_row_count() -> int:
    async with AsyncSessionLocal() as session:
        result = await session.execute(text(f"SELECT COUNT(*) FROM {TABLE_NAME}"))
        count = result.scalar_one()
        return int(count)


async def clear_cache() -> int:
    async with AsyncSessionLocal() as session:
        result = await session.execute(text(f"SELECT COUNT(*) FROM {TABLE_NAME}"))
        before = int(result.scalar_one())
        await session.execute(text(f"DELETE FROM {TABLE_NAME}"))
        await session.commit()
        return before


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Clear historical collocation cache records."
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Skip confirmation prompt.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show how many rows would be deleted without deleting.",
    )
    return parser.parse_args()


async def main() -> int:
    args = parse_args()

    print("=" * 56)
    print("Collocation Cache Cleanup")
    print("=" * 56)

    count = await get_row_count()
    print(f"Target table: {TABLE_NAME}")
    print(f"Current rows: {count}")

    if args.dry_run:
        print("\n[DRY RUN] No data was deleted.")
        return 0

    if count == 0:
        print("\nNothing to delete.")
        return 0

    if not args.yes:
        confirm = input("\nDelete all rows now? Type 'yes' to confirm: ").strip()
        if confirm.lower() != "yes":
            print("Aborted. No data deleted.")
            return 1

    deleted = await clear_cache()
    print(f"\nDeleted rows: {deleted}")
    print("Done. Restart the backend if it is running to clear in-memory cache too.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
