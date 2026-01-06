#!/usr/bin/env python3
"""
Test script to compare SQLite dictionary results with legacy MDX loading.

This script validates that the SQLite-based dictionary returns the same
results as the legacy in-memory MDX approach.

Usage:
    uv run python scripts/test_dictionary_consistency.py
"""

import os
import sqlite3
import time
from pathlib import Path

try:
    from readmdict import MDX, MDD
except ImportError:
    print("Error: readmdict not installed. Run: uv sync --extra dictionary")
    exit(1)

DICT_BASE_DIR = Path("resources/dictionaries")

# Test words including edge cases
TEST_WORDS = [
    "hello",
    "world", 
    "Python",
    "computer",
    "algorithm",
    "beautiful",
    "running",  # verb form
    "children",  # plural
    "went",  # irregular verb
    "the",  # common word
    "a",  # single letter
    "extraordinarily",  # long word
    "café",  # accented character
    "apple",
    "book",
    "house",
    "water",
    "time",
    "people",
    "way",
]


def load_legacy_mdx(mdx_path: Path) -> dict:
    """Load MDX file into memory (legacy approach)."""
    print(f"  Loading legacy MDX: {mdx_path.name}...")
    start = time.time()
    mdx = MDX(str(mdx_path))
    
    cache = {}
    for key, value in mdx.items():
        try:
            word = key.decode('utf-8').strip()
            cache[word] = value
        except UnicodeDecodeError:
            continue
    
    print(f"  [OK] Loaded {len(cache)} entries in {time.time() - start:.1f}s")
    return cache


def load_sqlite_db(db_path: Path) -> sqlite3.Connection:
    """Open SQLite database connection."""
    print(f"  Opening SQLite: {db_path.name}...")
    conn = sqlite3.connect(str(db_path))
    return conn


def lookup_legacy(word: str, cache: dict) -> bytes | None:
    """Look up word in legacy cache."""
    for w in [word, word.lower(), word.title(), word.upper()]:
        if w in cache:
            return cache[w]
    return None


def lookup_sqlite(word: str, conn: sqlite3.Connection) -> bytes | None:
    """Look up word in SQLite database - matches legacy priority order."""
    # Must try in same order as legacy: word, word.lower(), word.title(), word.upper()
    for w in [word, word.lower(), word.title(), word.upper()]:
        cursor = conn.execute(
            "SELECT definition FROM entries WHERE word = ? LIMIT 1",
            (w,)
        )
        row = cursor.fetchone()
        if row:
            return row[0]
    return None


def compare_results(legacy_result: bytes | None, sqlite_result: bytes | None) -> bool:
    """Compare two results for equality."""
    if legacy_result is None and sqlite_result is None:
        return True
    if legacy_result is None or sqlite_result is None:
        return False
    return legacy_result == sqlite_result


def test_dictionary(mdx_path: Path) -> tuple[int, int, list]:
    """Test a single dictionary, comparing legacy vs SQLite results."""
    db_path = mdx_path.with_suffix('.db')
    
    if not db_path.exists():
        print(f"  ✗ SQLite database not found: {db_path}")
        return 0, 0, []
    
    # Load both versions
    legacy_cache = load_legacy_mdx(mdx_path)
    sqlite_conn = load_sqlite_db(db_path)
    
    passed = 0
    failed = 0
    failures = []
    
    print(f"\n  Testing {len(TEST_WORDS)} words...")
    
    for word in TEST_WORDS:
        legacy_result = lookup_legacy(word, legacy_cache)
        sqlite_result = lookup_sqlite(word, sqlite_conn)
        
        if compare_results(legacy_result, sqlite_result):
            passed += 1
            status = "[OK]" if legacy_result else "[-]"  # [-] = both None (word not found)
        else:
            failed += 1
            status = "[FAIL]"
            failures.append({
                "word": word,
                "legacy_found": legacy_result is not None,
                "sqlite_found": sqlite_result is not None,
                "legacy_len": len(legacy_result) if legacy_result else 0,
                "sqlite_len": len(sqlite_result) if sqlite_result else 0,
            })
        
        print(f"    {status} {word}")
    
    sqlite_conn.close()
    return passed, failed, failures


def main():
    print("=" * 60)
    print("Dictionary Consistency Test: SQLite vs Legacy MDX")
    print("=" * 60)
    
    if not DICT_BASE_DIR.exists():
        print(f"Error: Dictionary directory not found: {DICT_BASE_DIR}")
        return
    
    # Find all MDX files
    mdx_files = list(DICT_BASE_DIR.rglob("*.mdx"))
    
    if not mdx_files:
        print(f"No MDX files found in {DICT_BASE_DIR}")
        return
    
    print(f"\nFound {len(mdx_files)} dictionary file(s)\n")
    
    total_passed = 0
    total_failed = 0
    all_failures = []
    
    for mdx_path in mdx_files:
        print(f"\n{'-' * 60}")
        print(f"Testing: {mdx_path.name}")
        print(f"{'-' * 60}")
        
        passed, failed, failures = test_dictionary(mdx_path)
        total_passed += passed
        total_failed += failed
        all_failures.extend(failures)
    
    # Summary
    print(f"\n{'=' * 60}")
    print("SUMMARY")
    print(f"{'=' * 60}")
    print(f"Total Passed: {total_passed}")
    print(f"Total Failed: {total_failed}")
    
    if all_failures:
        print(f"\nFailures:")
        for f in all_failures:
            print(f"  - {f['word']}: legacy={f['legacy_found']} ({f['legacy_len']}B), "
                  f"sqlite={f['sqlite_found']} ({f['sqlite_len']}B)")
    
    if total_failed == 0:
        print(f"\n[PASSED] All tests passed! SQLite and legacy implementations are consistent.")
        exit(0)
    else:
        print(f"\n[FAILED] {total_failed} tests failed. Please investigate the differences.")
        exit(1)


if __name__ == "__main__":
    main()
