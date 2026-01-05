#!/usr/bin/env python3
"""
Reset Sentence Study Database Tables

This script clears all sentence learning and review data from the database,
forcing a fresh start after EPUB parsing refactor.

Tables affected:
- sentence_learning_records: User's sentence study progress
- review_items: Spaced repetition review queue
- review_logs: Review history
- sentence_collocation_cache: Cached collocation data

Run with: uv run python scripts/reset_sentence_data.py
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.core.db import engine, AsyncSessionLocal


async def reset_sentence_data():
    """Clear all sentence-related data from the database."""
    
    tables_to_clear = [
        "review_logs",           # Must be first (FK dependency)
        "review_items",          # Review queue
        "sentence_learning_records",  # Study progress
        "sentence_collocation_cache", # Cached collocations
    ]
    
    print("=" * 50)
    print("🔄 Sentence Data Reset Script")
    print("=" * 50)
    print("\nThis will clear the following tables:")
    for table in tables_to_clear:
        print(f"  - {table}")
    print()
    
    # Ask for confirmation
    confirm = input("⚠️  Are you sure you want to proceed? (yes/no): ")
    if confirm.lower() != "yes":
        print("❌ Aborted.")
        return
    
    print("\n🚀 Starting reset...")
    
    async with AsyncSessionLocal() as session:
        for table in tables_to_clear:
            try:
                # Check current count
                result = await session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                
                # Delete all rows
                await session.execute(text(f"DELETE FROM {table}"))
                await session.commit()
                
                print(f"  ✅ {table}: deleted {count} rows")
            except Exception as e:
                print(f"  ❌ {table}: error - {e}")
                await session.rollback()
    
    print("\n" + "=" * 50)
    print("🎉 Reset complete!")
    print("=" * 50)
    print("\nNow restart the dev server and try Sentence Study again.")


if __name__ == "__main__":
    asyncio.run(reset_sentence_data())
