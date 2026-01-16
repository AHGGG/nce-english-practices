"""
LDOCE Parser Diagnostic Script
Parses the simmer.html fixture and reports what data was extracted vs what exists in HTML.
"""

from pathlib import Path
from app.services.ldoce_parser import ldoce_parser


def main():
    html = Path("tests/fixtures/ldoce_simmer.html").read_text(encoding="utf-8")
    result = ldoce_parser.parse(html, "simmer")

    print("=" * 60)
    print("LDOCE PARSER DIAGNOSTIC REPORT")
    print("=" * 60)
    print(f"Word: {result.word}")
    print(f"Found: {result.found}")
    print(f"Total Entries: {len(result.entries)}")
    print()

    for i, entry in enumerate(result.entries):
        print(f"\n{'=' * 50}")
        print(f"ENTRY {i + 1}: {entry.headword} ({entry.part_of_speech})")
        print(f"{'=' * 50}")

        # Basic info
        print(f"  Pronunciation: {entry.pronunciation}")
        print(f"  Senses: {len(entry.senses)}")
        print(f"  Phrasal Verbs: {len(entry.phrasal_verbs)}")

        # Etymology
        print("\n  [ETYMOLOGY]")
        if entry.etymology:
            print(f"    Century: {entry.etymology.century}")
            print(f"    Origin: {entry.etymology.origin}")
            print(f"    Meaning: {entry.etymology.meaning}")
            print(f"    Note: {entry.etymology.note}")
        else:
            print("    NOT FOUND!")

        # Verb Table
        print("\n  [VERB TABLE]")
        if entry.verb_table:
            print(f"    Lemma: {entry.verb_table.lemma}")
            print(f"    Simple forms ({len(entry.verb_table.simple_forms)}):")
            for f in entry.verb_table.simple_forms[:4]:
                print(f"      - {f.tense}: {f.form}")
            print(f"    Continuous forms ({len(entry.verb_table.continuous_forms)}):")
            for f in entry.verb_table.continuous_forms[:2]:
                print(f"      - {f.tense}: {f.form}")
        else:
            print("    NOT FOUND!")

        # Extra Examples
        print(f"\n  [EXTRA EXAMPLES] ({len(entry.extra_examples)} total)")
        for ex in entry.extra_examples[:3]:
            print(f"    [{ex.source}] {ex.text[:60]}...")

        # Thesaurus
        print("\n  [THESAURUS]")
        if entry.thesaurus:
            print(f"    Topic: {entry.thesaurus.topic}")
            print(f"    Entries ({len(entry.thesaurus.entries)}):")
            for te in entry.thesaurus.entries[:3]:
                print(
                    f"      - {te.word}: {te.definition[:40] if te.definition else 'N/A'}..."
                )
            print(
                f"    Word Sets ({len(entry.thesaurus.word_sets)}): {entry.thesaurus.word_sets[:5]}"
            )
        else:
            print("    NOT FOUND!")

        # Collocations
        print(f"\n  [COLLOCATIONS] ({len(entry.collocations)} total)")
        for col in entry.collocations[:5]:
            print(f"    - {col.pattern} [{col.part_of_speech or 'N/A'}]")


if __name__ == "__main__":
    main()
