"""
Tests for Collins Dictionary Parser
"""

import pytest
from pathlib import Path

from app.services.collins_parser import collins_parser


FIXTURES_DIR = Path(__file__).parent / "fixtures"


class TestCollinsParser:
    """Test Collins HTML parsing."""

    def load_fixture(self, word: str) -> str:
        """Load HTML fixture for a word."""
        path = FIXTURES_DIR / f"collins_{word}.html"
        if path.exists():
            return path.read_text(encoding="utf-8")
        return ""

    def test_parse_simmer_headword(self):
        """Test headword extraction."""
        html = self.load_fixture("simmer")
        result = collins_parser.parse(html, "simmer")

        assert result.found is True
        assert result.entry is not None
        assert result.entry.headword == "simmer"

    def test_parse_simmer_pronunciations(self):
        """Test UK/US pronunciation extraction."""
        html = self.load_fixture("simmer")
        result = collins_parser.parse(html, "simmer")

        assert result.entry.pronunciation_uk is not None
        assert "ɪ" in result.entry.pronunciation_uk
        assert result.entry.pronunciation_us is not None
        assert "sɪm" in result.entry.pronunciation_us

    def test_parse_simmer_audio(self):
        """Test audio URL extraction."""
        html = self.load_fixture("simmer")
        result = collins_parser.parse(html, "simmer")

        assert result.entry.audio_uk is not None
        assert "/dict/resource" in result.entry.audio_uk.api_url
        assert "50560.mp3" in result.entry.audio_uk.api_url

        assert result.entry.audio_us is not None
        assert "en_us_simmer.mp3" in result.entry.audio_us.api_url

    def test_parse_simmer_frequency(self):
        """Test word frequency extraction."""
        html = self.load_fixture("simmer")
        result = collins_parser.parse(html, "simmer")

        # simmer has 2 filled circles (roundRed)
        assert result.entry.frequency == 2

    def test_parse_simmer_inflections(self):
        """Test inflection extraction."""
        html = self.load_fixture("simmer")
        result = collins_parser.parse(html, "simmer")

        assert len(result.entry.inflections) >= 3
        forms = [inf.form for inf in result.entry.inflections]
        assert "simmers" in forms
        assert "simmering" in forms
        assert "simmered" in forms

    def test_parse_simmer_senses(self):
        """Test sense extraction."""
        html = self.load_fixture("simmer")
        result = collins_parser.parse(html, "simmer")

        assert len(result.entry.senses) >= 2

        # First sense is about cooking
        sense1 = result.entry.senses[0]
        assert sense1.index == 1
        assert "V-ERG" in (sense1.part_of_speech or "")
        assert (
            "cook" in sense1.definition.lower() or "boil" in sense1.definition.lower()
        )

    def test_parse_simmer_examples(self):
        """Test example extraction."""
        html = self.load_fixture("simmer")
        result = collins_parser.parse(html, "simmer")

        # First sense should have examples
        sense1 = result.entry.senses[0]
        assert len(sense1.examples) >= 1

        # Check example has text and translation
        example = sense1.examples[0]
        assert len(example.text) > 10
        assert example.translation is not None

    def test_parse_simmer_synonyms(self):
        """Test synonym extraction."""
        html = self.load_fixture("simmer")
        result = collins_parser.parse(html, "simmer")

        sense1 = result.entry.senses[0]
        assert len(sense1.synonyms) >= 1
        assert "bubble" in sense1.synonyms or "stew" in sense1.synonyms

    def test_parse_simmer_phrasal_verbs(self):
        """Test phrasal verb extraction."""
        html = self.load_fixture("simmer")
        result = collins_parser.parse(html, "simmer")

        assert "simmer down" in result.entry.phrasal_verbs

    def test_parse_empty_html(self):
        """Test handling of empty HTML."""
        result = collins_parser.parse("", "nonexistent")
        assert result.found is False
        assert result.entry is None

    def test_parse_link_redirect(self):
        """Test handling of redirect entries."""
        html = "@@@LINK=another_word"
        result = collins_parser.parse(html, "redirect")
        assert result.found is False

    def test_parse_hello(self):
        """Test parsing 'hello' entry."""
        html = self.load_fixture("hello")
        if not html:
            pytest.skip("hello fixture not found")

        result = collins_parser.parse(html, "hello")
        assert result.found is True
        assert result.entry.headword == "hello"


class TestCollinsParserEdgeCases:
    """Test edge cases and complex entries."""

    def load_fixture(self, word: str) -> str:
        path = FIXTURES_DIR / f"collins_{word}.html"
        if path.exists():
            return path.read_text(encoding="utf-8")
        return ""

    def test_complex_entry_run(self):
        """Test parsing complex entry like 'run' with many senses."""
        html = self.load_fixture("run")
        if not html:
            pytest.skip("run fixture not found")

        result = collins_parser.parse(html, "run")

        assert result.found is True
        assert result.entry.headword == "run"
        # Run is a very common word, should have many senses
        assert len(result.entry.senses) >= 5

    def test_adjective_entry(self):
        """Test parsing adjective entry like 'beautiful'."""
        html = self.load_fixture("beautiful")
        if not html:
            pytest.skip("beautiful fixture not found")

        result = collins_parser.parse(html, "beautiful")

        assert result.found is True
        assert result.entry.headword == "beautiful"
