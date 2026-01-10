"""
Extract LDOCE HTML samples for parser development.

This script extracts raw HTML from the LDOCE dictionary for analysis.
Run with: uv run python scripts/extract_ldoce_samples.py
"""

import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.dictionary import dict_manager

# Sample words to extract
SAMPLE_WORDS = ["run", "beautiful", "simmer", "hello", "work"]

OUTPUT_DIR = "tests/fixtures"


def main():
    print("Loading dictionaries...")
    dict_manager.load_dictionaries()

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for word in SAMPLE_WORDS:
        print(f"\nLooking up: {word}")
        results = dict_manager.lookup(word)

        for result in results:
            dict_name = result.get("dictionary", "")
            html = result.get("definition", "")

            # Check if LDOCE
            if "LDOCE" in dict_name.upper() or "longman" in dict_name.lower():
                filename = f"ldoce_{word}.html"
                filepath = os.path.join(OUTPUT_DIR, filename)

                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(html)

                print(f"  Saved: {filepath} ({len(html)} bytes)")

                # Print first 500 chars for quick inspection
                print(f"  Preview: {html[:500]}...")


if __name__ == "__main__":
    main()
