"""
Deep diagnostic script for LDOCE Collocation extraction.
Compares HTML content with parsed results.
"""

from pathlib import Path
from bs4 import BeautifulSoup
from app.services.ldoce_parser import ldoce_parser


def main():
    html = Path("tests/fixtures/ldoce_simmer.html").read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")

    print("=" * 70)
    print("COLLOCATION EXTRACTION DEEP DIAGNOSTIC")
    print("=" * 70)

    # Step 1: Find all collocation patterns in HTML
    print("\n[STEP 1] HTML STRUCTURE ANALYSIS")
    print("-" * 50)

    # Find buttons container
    buttons = soup.select(".buttons")
    print(f"Found {len(buttons)} .buttons containers")

    for btn_idx, btn_container in enumerate(buttons):
        print(f"\n  === Buttons Container {btn_idx + 1} ===")
        popup_buttons = btn_container.select("span.popup-button")
        for pb in popup_buttons:
            text = pb.get_text(strip=True)
            print(f'    - Popup button: "{text}"')

    # Find Collocations popup content
    print("\n[STEP 2] COLLOCATIONS POPUP CONTENT")
    print("-" * 50)

    # Look for at-link divs that contain collocations
    for at_link in soup.select(".at-link"):
        header = at_link.select_one(".popheader.popcollo")
        if header:
            print(f"\n  === {header.get_text(strip=True)} ===")

            # Find all collocate entries
            collocates = at_link.select("span.collocate")
            print(f"  Found {len(collocates)} span.collocate elements")

            for col_idx, col in enumerate(collocates):
                pattern_elem = col.select_one(".colloc.collo")
                if pattern_elem:
                    pattern = pattern_elem.get_text(strip=True)

                    # Count examples
                    content = col.select_one("div.content")
                    examples = []
                    if content:
                        # Method 1: span.example
                        examples = content.select("span.example")

                    print(f'\n    [{col_idx + 1}] Pattern: "{pattern}"')
                    print(f"        Examples in HTML: {len(examples)}")

                    # Show first 3 examples
                    for i, ex in enumerate(examples[:3]):
                        text = ex.get_text(strip=True)[:60]
                        print(f"          Ex{i + 1}: {text}...")

                    if len(examples) > 3:
                        print(f"          ... and {len(examples) - 3} more")

    # Step 3: Parser results
    print("\n\n[STEP 3] PARSER EXTRACTION RESULTS")
    print("-" * 50)

    result = ldoce_parser.parse(html, "simmer")

    for entry_idx, entry in enumerate(result.entries):
        print(
            f"\n  === Entry {entry_idx + 1}: {entry.headword} ({entry.part_of_speech}) ==="
        )
        print(f"  Collocations extracted: {len(entry.collocations)}")

        for col_idx, col in enumerate(entry.collocations):
            print(
                f'\n    [{col_idx + 1}] Pattern: "{col.pattern}" [{col.part_of_speech or "N/A"}]'
            )
            print(f"        Examples extracted: {len(col.examples)}")

            for i, ex in enumerate(col.examples):
                text = ex.text[:60] if ex.text else ""
                print(f"          Ex{i + 1}: {text}...")

    # Step 4: Comparison
    print("\n\n[STEP 4] ISSUE IDENTIFICATION")
    print("-" * 50)

    # Run specific check on parser method
    from app.services.ldoce_parser import LDOCEParser

    parser = LDOCEParser()

    # Get first entry's buttons container
    entries = soup.select("span.entry")
    if entries:
        first_entry = entries[0]
        buttons_container = first_entry.select_one(".buttons")

        if buttons_container:
            collocations = parser._extract_popup_collocations(buttons_container)
            print(
                f"Direct extraction from first entry: {len(collocations)} collocations"
            )

            total_examples = sum(len(c.examples) for c in collocations)
            print(f"Total examples extracted: {total_examples}")


if __name__ == "__main__":
    main()
