"""
Tests for LDOCE Dictionary Parser
"""

import pytest
from pathlib import Path

from app.services.ldoce_parser import ldoce_parser


FIXTURES_DIR = Path(__file__).parent / "fixtures"


class TestLDOCEParser:
    """Test LDOCE HTML parsing."""

    def load_fixture(self, word: str) -> str:
        """Load HTML fixture for a word."""
        path = FIXTURES_DIR / f"ldoce_{word}.html"
        if path.exists():
            return path.read_text(encoding="utf-8")
        return ""

    def test_parse_simmer_found(self):
        """Test that simmer is found."""
        html = self.load_fixture("simmer")
        result = ldoce_parser.parse(html, "simmer")

        assert result.found is True
        assert len(result.entries) >= 1

    def test_parse_simmer_multiple_entries(self):
        """Test that simmer has multiple entries (verb and noun)."""
        html = self.load_fixture("simmer")
        result = ldoce_parser.parse(html, "simmer")

        # simmer has both verb (simmer1) and noun (simmer2) entries
        assert len(result.entries) >= 2

        pos_list = [e.part_of_speech for e in result.entries if e.part_of_speech]
        assert "verb" in pos_list
        assert "noun" in pos_list

    def test_parse_simmer_headword(self):
        """Test headword extraction."""
        html = self.load_fixture("simmer")
        result = ldoce_parser.parse(html, "simmer")

        assert result.entries[0].headword == "simmer"

    def test_parse_simmer_homnum(self):
        """Test homograph number extraction."""
        html = self.load_fixture("simmer")
        result = ldoce_parser.parse(html, "simmer")

        # First entry should be simmer1, second should be simmer2
        assert result.entries[0].homnum == 1
        if len(result.entries) > 1:
            assert result.entries[1].homnum == 2

    def test_parse_simmer_pronunciation(self):
        """Test pronunciation extraction."""
        html = self.load_fixture("simmer")
        result = ldoce_parser.parse(html, "simmer")

        entry = result.entries[0]
        assert entry.pronunciation is not None
        assert "sɪm" in entry.pronunciation

    def test_parse_simmer_audio(self):
        """Test audio URL extraction."""
        html = self.load_fixture("simmer")
        result = ldoce_parser.parse(html, "simmer")

        entry = result.entries[0]
        assert entry.audio is not None
        # Should have either BrE or AmE audio
        assert entry.audio.bre_url or entry.audio.ame_url

    def test_parse_simmer_senses(self):
        """Test sense extraction."""
        html = self.load_fixture("simmer")
        result = ldoce_parser.parse(html, "simmer")

        # Verb entry should have multiple senses
        verb_entry = result.entries[0]
        assert len(verb_entry.senses) >= 1

        # First sense should be about cooking
        sense1 = verb_entry.senses[0]
        assert sense1.index == 1
        assert (
            "boil" in sense1.definition.lower() or "cook" in sense1.definition.lower()
        )

    def test_parse_simmer_definition_translation(self):
        """Test definition with Chinese translation."""
        html = self.load_fixture("simmer")
        result = ldoce_parser.parse(html, "simmer")

        # First sense should have Chinese translation
        sense1 = result.entries[0].senses[0]
        assert sense1.definition_cn is not None
        # Chinese characters should be present
        assert any("\u4e00" <= c <= "\u9fff" for c in sense1.definition_cn)

    def test_parse_simmer_grammar(self):
        """Test grammar pattern extraction."""
        html = self.load_fixture("simmer")
        result = ldoce_parser.parse(html, "simmer")

        # First sense should have grammar
        sense1 = result.entries[0].senses[0]
        assert sense1.grammar is not None
        assert (
            "intransitive" in sense1.grammar.lower()
            or "transitive" in sense1.grammar.lower()
        )

    def test_parse_simmer_examples(self):
        """Test example extraction."""
        html = self.load_fixture("simmer")
        result = ldoce_parser.parse(html, "simmer")

        # First sense should have examples
        sense1 = result.entries[0].senses[0]
        assert len(sense1.examples) >= 1

        # Example should have text and translation
        example = sense1.examples[0]
        assert len(example.text) > 10
        assert example.translation is not None

    def test_parse_simmer_phrasal_verbs(self):
        """Test phrasal verb extraction."""
        html = self.load_fixture("simmer")
        result = ldoce_parser.parse(html, "simmer")

        # Verb entry should have "simmer down"
        verb_entry = result.entries[0]
        assert len(verb_entry.phrasal_verbs) >= 1

        pv_phrases = [pv.phrase for pv in verb_entry.phrasal_verbs]
        assert "simmer down" in pv_phrases

    def test_parse_empty_html(self):
        """Test handling of empty HTML."""
        result = ldoce_parser.parse("", "nonexistent")
        assert result.found is False
        assert len(result.entries) == 0

    def test_parse_link_redirect(self):
        """Test handling of redirect entries."""
        html = "@@@LINK=another_word"
        result = ldoce_parser.parse(html, "redirect")
        assert result.found is False


class TestLDOCEParserEdgeCases:
    """Test edge cases and complex entries."""

    def load_fixture(self, word: str) -> str:
        path = FIXTURES_DIR / f"ldoce_{word}.html"
        if path.exists():
            return path.read_text(encoding="utf-8")
        return ""

    def test_complex_entry_run(self):
        """Test parsing complex entry like 'run' with many senses."""
        html = self.load_fixture("run")
        if not html:
            pytest.skip("run fixture not found")

        result = ldoce_parser.parse(html, "run")

        assert result.found is True
        # Run should have many entries and senses
        assert len(result.entries) >= 1

        # Total senses across all entries should be substantial
        total_senses = sum(len(e.senses) for e in result.entries)
        assert total_senses >= 3

    def test_adjective_entry(self):
        """Test parsing adjective entry like 'beautiful'."""
        html = self.load_fixture("beautiful")
        if not html:
            pytest.skip("beautiful fixture not found")

        result = ldoce_parser.parse(html, "beautiful")

        assert result.found is True
        assert len(result.entries) >= 1
        assert result.entries[0].headword == "beautiful"

    def test_hello_simple_entry(self):
        """Test parsing simple entry like 'hello'."""
        html = self.load_fixture("hello")
        if not html:
            pytest.skip("hello fixture not found")

        result = ldoce_parser.parse(html, "hello")

        assert result.found is True
        assert result.entries[0].headword == "hello"


class TestLDOCEParserExtendedData:
    """Test extraction of extended data: etymology, verb table, thesaurus, collocations."""

    def load_fixture(self, word: str) -> str:
        path = FIXTURES_DIR / f"ldoce_{word}.html"
        if path.exists():
            return path.read_text(encoding="utf-8")
        return ""

    def test_simmer_etymology(self):
        """Test word origin extraction."""
        html = self.load_fixture("simmer")
        result = ldoce_parser.parse(html, "simmer")

        # Verb entry should have etymology
        verb_entry = result.entries[0]
        assert verb_entry.etymology is not None

        # Check etymology fields
        etym = verb_entry.etymology
        assert etym.century is not None and "1600" in etym.century
        assert etym.origin == "simper"
        assert etym.meaning is not None

    def test_simmer_verb_table(self):
        """Test verb conjugation table extraction."""
        html = self.load_fixture("simmer")
        result = ldoce_parser.parse(html, "simmer")

        # Only verb entry should have verb table
        verb_entry = result.entries[0]
        if verb_entry.part_of_speech == "verb":
            assert verb_entry.verb_table is not None

            vt = verb_entry.verb_table
            assert vt.lemma == "simmer"

            # Check for some forms
            assert len(vt.simple_forms) > 0

            # Find past tense form
            past_forms = [f for f in vt.simple_forms if f.tense == "Past"]
            assert len(past_forms) > 0
            assert any("simmered" in f.form for f in past_forms)

    def test_simmer_extra_examples(self):
        """Test extraction of examples from other dictionaries/corpus."""
        html = self.load_fixture("simmer")
        result = ldoce_parser.parse(html, "simmer")

        verb_entry = result.entries[0]
        assert len(verb_entry.extra_examples) > 0

        # Check sources
        sources = {ex.source for ex in verb_entry.extra_examples}
        assert "OTHER_DICTIONARIES" in sources or "CORPUS" in sources

        # Check that examples have text
        assert all(len(ex.text) > 10 for ex in verb_entry.extra_examples)

    def test_simmer_thesaurus(self):
        """Test thesaurus extraction."""
        html = self.load_fixture("simmer")
        result = ldoce_parser.parse(html, "simmer")

        verb_entry = result.entries[0]
        if verb_entry.thesaurus:
            thes = verb_entry.thesaurus

            # Check topic
            if thes.topic:
                assert "cook" in thes.topic.lower()

            # Check entries
            if thes.entries:
                words = [e.word for e in thes.entries]
                # Should have related cooking words
                assert any(
                    w in words
                    for w in ["boil", "fry", "bake", "cook", "steam", "roast"]
                )

    def test_simmer_collocations(self):
        """Test collocation extraction."""
        html = self.load_fixture("simmer")
        result = ldoce_parser.parse(html, "simmer")

        verb_entry = result.entries[0]
        assert len(verb_entry.collocations) > 0

        # Check for known collocations
        patterns = [c.pattern for c in verb_entry.collocations]
        assert "simmer gently" in patterns or any("gently" in p for p in patterns)

    def test_noun_entry_no_verb_table(self):
        """Test that noun entries don't have verb tables."""
        html = self.load_fixture("simmer")
        result = ldoce_parser.parse(html, "simmer")

        # Find noun entry
        noun_entry = next(
            (e for e in result.entries if e.part_of_speech == "noun"), None
        )
        if noun_entry:
            # Noun should not have verb table
            assert noun_entry.verb_table is None
