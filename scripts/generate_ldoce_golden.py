"""
Golden Standard Generator for LDOCE Parser Testing

This script extracts raw HTML from the dictionary MDX files and saves them
as golden standard test data for regression testing.

Usage:
    uv run python scripts/generate_ldoce_golden.py <word> [--output-dir DIR]
"""

import argparse
import json
import sys
import asyncio
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.dictionary import dict_manager
from app.services.ldoce_parser import ldoce_parser


async def generate_golden_standard(word: str, output_dir: Path):
    """Generate golden standard HTML and expected JSON for a word."""

    print("🔍 Loading dictionaries...")
    await dict_manager.load_dictionaries()

    print(f"🔍 Looking up '{word}' in LDOCE...")

    # Get raw dictionary results
    results = await dict_manager.lookup(word)

    # Find LDOCE result
    ldoce_html = None
    for result in results:
        if "LDOCE" in result.get("dictionary", "").upper():
            ldoce_html = result.get("definition", "")
            break

    if not ldoce_html:
        print(f"❌ Word '{word}' not found in LDOCE dictionary")
        return False

    # Save raw HTML
    html_path = output_dir / f"{word}.html"
    html_path.write_text(ldoce_html, encoding="utf-8")
    print(f"✅ Saved raw HTML to: {html_path}")

    # Parse and save structured data (current parser output)
    parsed = ldoce_parser.parse(ldoce_html, word, include_raw_html=False)

    # Convert to dict for JSON serialization
    parsed_dict = parsed.model_dump()

    json_path = output_dir / f"{word}_current.json"
    json_path.write_text(
        json.dumps(parsed_dict, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"✅ Saved current parser output to: {json_path}")

    # Print summary for manual review
    print(f"\n📊 Summary for '{word}':")
    print(f"   Entries: {len(parsed.entries)}")
    for i, entry in enumerate(parsed.entries):
        print(f"   Entry {i + 1}: {entry.headword} ({entry.part_of_speech})")
        print(f"      - Senses: {len(entry.senses)}")
        print(f"      - Phrasal verbs: {len(entry.phrasal_verbs)}")
        if entry.senses:
            first_sense = entry.senses[0]
            print(f"      - First sense grammar: {first_sense.grammar}")
            print(
                f"      - First sense has CN translation: {first_sense.definition_cn is not None}"
            )

    print("\n⚠️  Next steps:")
    print(f"   1. Review {json_path} and compare with real dictionary")
    print(f"   2. Create {word}_expected.json with correct values")
    print("   3. Add test cases to tests/test_ldoce_parser_golden.py")

    return True


def main():
    parser = argparse.ArgumentParser(
        description="Generate LDOCE golden standard test data"
    )
    parser.add_argument("word", help="Word to generate golden standard for")
    parser.add_argument(
        "--output-dir",
        default="resources/test_data/ldoce_golden",
        help="Output directory for test data",
    )

    args = parser.parse_args()
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    asyncio.run(generate_golden_standard(args.word, output_dir))


if __name__ == "__main__":
    main()
