#!/usr/bin/env python3
"""
Convert MDX/MDD dictionary files to SQLite database for low-memory usage.

Usage:
    uv run python scripts/convert_mdx_to_sqlite.py

This script will:
1. Scan resources/dictionaries/ for .mdx files
2. Convert each MDX to a SQLite database (.db)
3. Also import MDD resources if present
"""

import sqlite3
import time
from pathlib import Path

try:
    from readmdict import MDX, MDD
except ImportError:
    print("Error: readmdict not installed. Run: uv sync --extra dictionary")
    exit(1)

DICT_BASE_DIR = Path("resources/dictionaries")


def create_database(db_path: Path) -> sqlite3.Connection:
    """Create SQLite database with proper schema."""
    conn = sqlite3.connect(str(db_path))

    # Create entries table for word definitions - word is unique (last wins like dict)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS entries (
            word TEXT PRIMARY KEY,
            word_lower TEXT NOT NULL,
            definition BLOB NOT NULL
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_word_lower ON entries(word_lower)")

    # Create resources table for MDD content (audio, images, CSS)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS resources (
            path TEXT PRIMARY KEY,
            content BLOB NOT NULL
        )
    """)

    return conn


def convert_mdx(mdx_path: Path, conn: sqlite3.Connection) -> int:
    """Convert MDX file to SQLite entries table."""
    print(f"  Loading MDX: {mdx_path.name}...")
    mdx = MDX(str(mdx_path))

    # Use dict to deduplicate (last wins, like legacy behavior)
    entries = {}
    count = 0

    for key, value in mdx.items():
        try:
            word = key.decode("utf-8").strip()
            entries[word] = (word, word.lower(), value)  # Overwrites duplicates
            count += 1
        except UnicodeDecodeError:
            continue

    print(f"  Found {count} total entries, {len(entries)} unique words")

    # Batch insert deduplicated entries
    batch = list(entries.values())
    batch_size = 10000
    inserted = 0

    for i in range(0, len(batch), batch_size):
        chunk = batch[i : i + batch_size]
        conn.executemany(
            "INSERT OR REPLACE INTO entries (word, word_lower, definition) VALUES (?, ?, ?)",
            chunk,
        )
        inserted += len(chunk)
        print(f"    Inserted {inserted} entries...")

    conn.commit()
    return len(entries)


def convert_mdd(mdd_path: Path, conn: sqlite3.Connection) -> int:
    """Convert MDD file to SQLite resources table."""
    print(f"  Loading MDD: {mdd_path.name}...")
    mdd = MDD(str(mdd_path))

    batch = []
    count = 0

    for key, value in mdd.items():
        batch.append((key, value))
        count += 1

        if len(batch) >= 1000:
            conn.executemany(
                "INSERT OR REPLACE INTO resources (path, content) VALUES (?, ?)", batch
            )
            batch = []
            print(f"    Inserted {count} resources...")

    if batch:
        conn.executemany(
            "INSERT OR REPLACE INTO resources (path, content) VALUES (?, ?)", batch
        )

    conn.commit()
    return count


def convert_dictionary(mdx_path: Path) -> None:
    """Convert a single MDX (and optional MDD) to SQLite."""
    db_path = mdx_path.with_suffix(".db")

    # Skip if already converted and newer than source
    if db_path.exists():
        if db_path.stat().st_mtime > mdx_path.stat().st_mtime:
            print(f"Skipping {mdx_path.name} (already converted)")
            return
        else:
            print(f"Re-converting {mdx_path.name} (source updated)")
            db_path.unlink()

    print(f"\nConverting: {mdx_path}")
    start_time = time.time()

    conn = create_database(db_path)

    # Convert MDX entries
    entry_count = convert_mdx(mdx_path, conn)
    print(f"  [OK] Imported {entry_count} word entries")

    # Convert MDD resources if exists
    mdd_path = mdx_path.with_suffix(".mdd")
    if mdd_path.exists():
        resource_count = convert_mdd(mdd_path, conn)
        print(f"  [OK] Imported {resource_count} resources")

    # Optimize database
    print("  Optimizing database...")
    conn.execute("ANALYZE")
    conn.execute("VACUUM")
    conn.close()

    elapsed = time.time() - start_time
    db_size_mb = db_path.stat().st_size / (1024 * 1024)
    print(f"  [OK] Done in {elapsed:.1f}s, database size: {db_size_mb:.1f} MB")


def main():
    if not DICT_BASE_DIR.exists():
        print(f"Error: Dictionary directory not found: {DICT_BASE_DIR}")
        return

    # Find all MDX files
    mdx_files = list(DICT_BASE_DIR.rglob("*.mdx"))

    if not mdx_files:
        print(f"No MDX files found in {DICT_BASE_DIR}")
        return

    print(f"Found {len(mdx_files)} MDX dictionary file(s)")

    for mdx_path in mdx_files:
        try:
            convert_dictionary(mdx_path)
        except Exception as e:
            print(f"Error converting {mdx_path}: {e}")

    print("\n[DONE] Conversion complete!")


if __name__ == "__main__":
    main()
