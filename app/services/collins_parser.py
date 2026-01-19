"""
Collins Dictionary Parser - Extracts structured data from Collins COBUILD HTML.

This parser is specifically designed for CollinsCOBUILDOverhaul V 2-30.mdx format.
"""

import re
import logging
from typing import List, Optional, Tuple
from bs4 import BeautifulSoup, Tag

from app.models.collins_schemas import (
    CollinsAudio,
    CollinsInflection,
    CollinsExample,
    CollinsSense,
    CollinsEntry,
    CollinsWord,
)

logger = logging.getLogger(__name__)

# ========== PERFORMANCE LIMITS ==========
# High-frequency words can have many senses and examples.
# Truncating to reasonable limits improves performance.
MAX_SENSES_PER_ENTRY = 10
MAX_EXAMPLES_PER_SENSE = 3
MAX_SYNONYMS_PER_SENSE = 10
MAX_PHRASAL_VERBS = 10
MAX_INFLECTIONS = 10


class CollinsParser:
    """
    Parser for Collins COBUILD dictionary HTML.

    Extracts structured data including:
    - Headword, pronunciations (UK/US), audio
    - Word frequency (1-5)
    - Inflections
    - Senses with definitions, examples, translations
    - Synonyms, phrasal verbs
    """

    # ========== LRU CACHE ==========
    # Cache parsed results to avoid re-parsing the same HTML.
    # Key: (hash of HTML, word, include_raw_html)
    # Value: CollinsWord model
    _parse_cache: dict = {}
    _cache_max_size: int = 500

    def __init__(self):
        pass

    def parse(
        self, html: str, word: str, include_raw_html: bool = False
    ) -> CollinsWord:
        """
        Parse Collins HTML and return structured data.

        Args:
            html: Raw HTML from Collins MDX
            word: The word being looked up
            include_raw_html: Whether to include raw HTML in response (for debugging)

        Returns:
            CollinsWord with parsed entry
        """
        if not html or not html.strip():
            return CollinsWord(word=word, found=False)

        # Handle redirect entries
        if html.strip().startswith("@@@LINK="):
            return CollinsWord(word=word, found=False)

        # Check cache (use hash of HTML as key to save memory)
        import hashlib
        cache_key = (
            hashlib.md5(html.encode()).hexdigest(),
            word.lower(),
            include_raw_html,
        )
        if cache_key in self._parse_cache:
            return self._parse_cache[cache_key]

        try:
            # Use lxml parser for ~5-10x faster parsing
            soup = BeautifulSoup(html, "lxml")

            # Find the main entry container
            word_entry = soup.select_one(".word_entry")
            if not word_entry:
                return CollinsWord(word=word, found=False)

            entry = self._parse_entry(soup, word_entry)

            result = CollinsWord(
                word=word,
                found=True,
                entry=entry,
                raw_html=html if include_raw_html else None,
            )

            # Add to cache (with simple eviction if too large)
            if len(self._parse_cache) >= self._cache_max_size:
                # Remove oldest entries (FIFO-ish by clearing half)
                keys_to_remove = list(self._parse_cache.keys())[
                    : self._cache_max_size // 2
                ]
                for k in keys_to_remove:
                    del self._parse_cache[k]
            self._parse_cache[cache_key] = result

            return result

        except Exception as e:
            logger.error(f"Error parsing Collins HTML for '{word}': {e}")
            return CollinsWord(word=word, found=False)

    def _parse_entry(self, soup: BeautifulSoup, word_entry: Tag) -> CollinsEntry:
        """Parse the main word entry."""

        # 1. Headword
        headword = self._extract_headword(word_entry)

        # 2. Pronunciations and audio
        pron_uk, pron_us, audio_uk, audio_us = self._extract_pronunciations(word_entry)

        # 3. Frequency
        frequency = self._extract_frequency(word_entry)

        # 4. Inflections
        inflections = self._extract_inflections(word_entry)

        # 5. Senses (from collins_content)
        senses = self._extract_senses(soup)

        # 6. Phrasal verbs
        phrasal_verbs = self._extract_phrasal_verbs(soup)

        return CollinsEntry(
            headword=headword,
            pronunciation_uk=pron_uk,
            pronunciation_us=pron_us,
            audio_uk=audio_uk,
            audio_us=audio_us,
            frequency=frequency,
            inflections=inflections,
            senses=senses,
            phrasal_verbs=phrasal_verbs,
        )

    def _extract_headword(self, word_entry: Tag) -> str:
        """Extract the headword."""
        hw = word_entry.select_one(".word_key")
        return hw.get_text(strip=True) if hw else ""

    def _extract_pronunciations(
        self, word_entry: Tag
    ) -> Tuple[
        Optional[str], Optional[str], Optional[CollinsAudio], Optional[CollinsAudio]
    ]:
        """Extract UK and US pronunciations with audio."""
        pron_uk = None
        pron_us = None
        audio_uk = None
        audio_us = None

        pron_container = word_entry.select_one("span.pron")
        if not pron_container:
            return pron_uk, pron_us, audio_uk, audio_us

        # Find UK pronunciation
        uk_span = pron_container.select_one(".pron.type_uk")
        if uk_span:
            pron_uk = uk_span.get_text(strip=True)
            # Find parent <a> for audio
            parent_a = uk_span.find_parent("a")
            if parent_a and parent_a.get("href", "").startswith("sound://"):
                audio_uk = self._make_audio(parent_a["href"])

        # Find US pronunciation
        us_span = pron_container.select_one(".pron.type_us")
        if us_span:
            pron_us = us_span.get_text(strip=True)
            parent_a = us_span.find_parent("a")
            if parent_a and parent_a.get("href", "").startswith("sound://"):
                audio_us = self._make_audio(parent_a["href"])

        return pron_uk, pron_us, audio_uk, audio_us

    def _extract_frequency(self, word_entry: Tag) -> Optional[int]:
        """
        Extract word frequency (1-5).
        Based on the number of filled (roundRed) circles.
        """
        freq_container = word_entry.select_one(".word-frequency-img")
        if not freq_container:
            return None

        # Count levels with 'roundRed' class (filled circles)
        filled = freq_container.select(".level.roundRed")
        return len(filled) if filled else None

    def _extract_inflections(self, word_entry: Tag) -> List[CollinsInflection]:
        """Extract word inflections (simmers, simmering, simmered, etc.)."""
        inflections = []

        form_container = word_entry.select_one(".form_inflected")
        if not form_container:
            return inflections

        # Find all inflected forms (they are <a> tags with class orth)
        for a_tag in form_container.select("a.orth"):
            # Get text but exclude icon spans
            form_text = ""
            for child in a_tag.children:
                if isinstance(child, str):
                    form_text += child
                elif isinstance(child, Tag):
                    # Skip icon-speak-form spans
                    if child.get("class") and "icon-speak-form" in child.get(
                        "class", []
                    ):
                        continue
                    form_text += child.get_text()

            form_text = form_text.strip()

            # Clean up any remaining unicode icons (speaker icon is \uea27)
            form_text = re.sub(r"[\ue000-\uf8ff]", "", form_text)

            # Get the label from title attribute
            label = a_tag.get("title", "")

            # Extract audio if available
            audio = None
            href = a_tag.get("href", "")
            if href.startswith("sound://"):
                audio = self._make_audio(href)

            if form_text:
                inflections.append(
                    CollinsInflection(form=form_text, label=label, audio=audio)
                )

        return inflections[:MAX_INFLECTIONS]  # Performance: limit inflections

    def _extract_cross_reference(self, soup: BeautifulSoup) -> Optional[str]:
        """
        Extract cross-reference target word if this is a "see: xxx" entry.
        Returns the target word (e.g., "unequivocal" from "→see: unequivocal") or None.
        """
        # Look for "see:" pattern in collins_en_cn (not .example)
        see_block = soup.select_one(".collins_content > .collins_en_cn:not(.example)")
        if not see_block:
            return None

        # Check for "see:" text
        see_text = see_block.select_one(".text_gray")
        if see_text and "see:" in see_text.get_text().lower():
            # Find the linked word
            link = see_block.select_one("a.explain")
            if link:
                # Extract word from href like "entry://unequivocal#unequivocally"
                href = link.get("href", "")
                if href.startswith("entry://"):
                    target = href.replace("entry://", "").split("#")[0]
                    return target
                # Or just use the link text
                return link.get_text(strip=True)
        return None

    def _extract_senses(self, soup: BeautifulSoup) -> List[CollinsSense]:
        """Extract all senses/meanings."""
        senses = []

        # Senses are in .collins_en_cn.example blocks
        sense_blocks = soup.select(".collins_content > .collins_en_cn.example")

        for block in sense_blocks:
            sense = self._parse_sense_block(block)
            if sense:
                senses.append(sense)

                # Check for note block (e.g., "Simmer is also a noun")
                note_block = block.find_next_sibling("div", class_="note")
                if note_block and "type-sense" in note_block.get("class", []):
                    # Parse note as additional info
                    note_sense = self._parse_note_block(note_block, len(senses))
                    if note_sense:
                        # Add note examples to current sense or create sub-sense
                        sense.note = note_sense.definition
                        sense.note_examples = note_sense.examples

        return senses[:MAX_SENSES_PER_ENTRY]  # Performance: limit senses

    def _parse_sense_block(self, block: Tag) -> Optional[CollinsSense]:
        """Parse a single sense block."""
        caption = block.select_one(".caption")
        if not caption:
            return None

        # Index
        index = 1  # Default to 1
        num_elem = caption.select_one(".num")
        if num_elem:
            try:
                index = int(num_elem.get_text(strip=True))
            except ValueError:
                pass  # Keep default

        # Part of speech
        pos_elem = caption.select_one(".st")
        pos = pos_elem.get_text(strip=True) if pos_elem else None

        # Definition (English) - text after .st but before .def_cn
        # We need to extract just the English definition
        definition = self._extract_definition_en(caption)

        # Definition (Chinese)
        def_cn_elem = caption.select_one(".def_cn")
        def_cn = None
        if def_cn_elem:
            def_cn = self._extract_chinese_text(def_cn_elem)

        # Examples
        examples = self._extract_examples(block)

        # Synonyms
        synonyms = self._extract_synonyms(block)

        if not definition:
            return None

        return CollinsSense(
            index=index,  # No fallback needed, defaults to 1
            definition=definition,
            definition_cn=def_cn,
            part_of_speech=pos,
            examples=examples,
            synonyms=synonyms,
        )

    def _parse_note_block(
        self, block: Tag, parent_index: int
    ) -> Optional[CollinsSense]:
        """Parse a note block (e.g., 'Simmer is also a noun')."""
        # Get note text
        note_text = ""
        for child in block.children:
            if isinstance(child, str):
                note_text += child
            elif child.name not in ["ul", "div"]:
                note_text += child.get_text()

        note_text = note_text.strip()

        # Extract examples from note
        examples = self._extract_examples(block)

        if note_text:
            return CollinsSense(
                index=parent_index, definition=note_text, examples=examples
            )
        return None

    def _extract_definition_en(self, caption: Tag) -> str:
        """Extract English definition from caption."""
        # Clone to avoid modifying original
        texts = []

        for child in caption.children:
            if isinstance(child, str):
                text = child.strip()
                if text:
                    texts.append(text)
            elif isinstance(child, Tag):
                # Skip certain elements
                if child.get("class"):
                    classes = child.get("class", [])
                    if any(c in classes for c in ["num", "st", "def_cn", "anchor"]):
                        continue
                    if "cn_before" in classes or "cn_after" in classes:
                        continue

                # Get text from other elements (the definition itself)
                text = child.get_text(strip=True)
                if text:
                    texts.append(text)

        result = " ".join(texts)

        # Clean up: remove the Chinese text that might be inline
        # Remove patterns like (冲突、争吵等)酝酿，即将爆发
        result = re.sub(r"[\u4e00-\u9fff，；。、]+", "", result)
        result = re.sub(r"\s+", " ", result).strip()

        return result

    def _extract_chinese_text(self, element: Tag) -> str:
        """Extract Chinese text from an element."""
        chinese_spans = element.select(".chinese-text")
        texts = [span.get_text(strip=True) for span in chinese_spans]
        return "".join(texts)

    def _extract_examples(self, container: Tag) -> List[CollinsExample]:
        """Extract example sentences from a container."""
        examples = []

        # Examples are in <ul> > <li> > <p> structure
        for li in container.select("ul > li"):
            paragraphs = li.select("p")

            if len(paragraphs) >= 1:
                # First <p> is English
                en_p = paragraphs[0]

                # Extract English text (without grammar pattern)
                en_text = self._extract_example_text(en_p)

                # Extract grammar pattern if present
                grammar = None
                tips = en_p.select_one(".tips_sentence")
                if tips:
                    grammar = tips.get_text(strip=True)
                    grammar = grammar.strip("[] ")

                # Second <p> is Chinese translation (if exists)
                cn_text = None
                if len(paragraphs) >= 2:
                    cn_text = self._extract_chinese_text(paragraphs[1])
                    if not cn_text:
                        cn_text = paragraphs[1].get_text(strip=True)

                if en_text:
                    examples.append(
                        CollinsExample(
                            text=en_text,
                            translation=cn_text if cn_text else None,
                            grammar_pattern=grammar,
                        )
                    )

        return examples[:MAX_EXAMPLES_PER_SENSE]  # Performance: limit examples

    def _extract_example_text(self, p_elem: Tag) -> str:
        """Extract example text from <p>, excluding grammar hints."""
        texts = []

        for child in p_elem.children:
            if isinstance(child, str):
                texts.append(child)
            elif isinstance(child, Tag):
                # Skip tips_sentence and tts_button
                if child.get("class"):
                    classes = child.get("class", [])
                    if "tips_sentence" in classes or "tts_button" in classes:
                        continue
                texts.append(child.get_text())

        result = "".join(texts)
        result = re.sub(r"\s+", " ", result).strip()
        return result

    def _extract_synonyms(self, container: Tag) -> List[str]:
        """Extract synonyms from a container."""
        synonyms = []

        syn_div = container.select_one(".synonym")
        if not syn_div:
            return synonyms

        for form in syn_div.select(".form"):
            # Get text, prefer <a> text if exists
            a_tag = form.select_one("a")
            if a_tag:
                synonyms.append(a_tag.get_text(strip=True))
            else:
                text = form.get_text(strip=True)
                if text:
                    synonyms.append(text)

        return synonyms[:MAX_SYNONYMS_PER_SENSE]  # Performance: limit synonyms

    def _extract_phrasal_verbs(self, soup: BeautifulSoup) -> List[str]:
        """Extract phrasal verbs."""
        phrasal_verbs = []

        # Look for phrasal verb section
        pv_section = soup.select_one(".caption.about")
        if pv_section:
            for a_tag in pv_section.select("a.explain"):
                text = a_tag.get_text(strip=True)
                if text:
                    phrasal_verbs.append(text)

        return phrasal_verbs[:MAX_PHRASAL_VERBS]  # Performance: limit phrasal verbs

    def _make_audio(self, sound_url: str) -> CollinsAudio:
        """Convert sound:// URL to API URL."""
        # sound://COLmp3/50560.mp3 -> /dict/resource?path=COLmp3/50560.mp3
        path = sound_url.replace("sound://", "")
        return CollinsAudio(
            original_path=sound_url, api_url=f"/dict/resource?path={path}"
        )


# Singleton instance
collins_parser = CollinsParser()
