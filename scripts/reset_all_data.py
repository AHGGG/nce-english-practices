#!/usr/bin/env python3
"""
Reset ALL Database Tables

⚠️  DANGER: This script clears ALL data from the database!
Use with caution - this cannot be undone.

Run with: uv run python scripts/reset_all_data.py
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.core.db import engine, AsyncSessionLocal


async def reset_all_data():
    """Clear ALL data from the database."""
    
    # Order matters due to foreign key constraints
    # Tables with FK dependencies should be deleted first
    tables_to_clear = [
        # FK dependencies first
        "review_logs",
        "review_items",
        "context_learning_records",
        
        # Main tables
        "sentence_learning_records",
        "sentence_collocation_cache",
        "article_overview_cache",
        "reading_sessions",
        "voice_sessions",
        "vocab_learning_logs",
        "word_proficiency",
        "user_calibrations",
        "user_goals",
        "user_comprehension_profiles",
        "aui_inputs",
        "word_book_entries",
        "word_books",
        "context_resources",
        "attempts",
        "stories",
    ]
    
    print("=" * 60)
    print("🔥 FULL DATABASE RESET SCRIPT 🔥")
    print("=" * 60)
    print("\n⚠️  WARNING: This will DELETE ALL DATA from the database!")
    print("\nTables to be cleared:")
    for table in tables_to_clear:
        print(f"  - {table}")
    print()
    
    # Double confirmation
    confirm1 = input("⚠️  Are you sure? Type 'DELETE ALL' to proceed: ")
    if confirm1 != "DELETE ALL":
        print("❌ Aborted.")
        return
    
    print("\n🚀 Starting full reset...")
    
    async with AsyncSessionLocal() as session:
        total_deleted = 0
        for table in tables_to_clear:
            try:
                # Check current count
                result = await session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                
                # Delete all rows
                await session.execute(text(f"DELETE FROM {table}"))
                await session.commit()
                
                total_deleted += count
                status = f"deleted {count} rows" if count > 0 else "empty"
                print(f"  ✅ {table}: {status}")
            except Exception as e:
                print(f"  ❌ {table}: error - {e}")
                await session.rollback()
    
    print("\n" + "=" * 60)
    print(f"🎉 Reset complete! Total rows deleted: {total_deleted}")
    print("=" * 60)
    print("\nRestart the dev server to continue with a fresh database.")


if __name__ == "__main__":
    asyncio.run(reset_all_data())
