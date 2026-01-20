"""
LDOCE Dictionary Parser - Extracts structured data from Longman LDOCE6++ HTML.

This parser is specifically designed for LDOCE6++ En-Cn V2-19 V2.mdx format.
"""

import re
import logging
import hashlib
from typing import List, Optional, Tuple
from bs4 import BeautifulSoup, Tag

from app.models.ldoce_schemas import (
    LDOCEAudio,
    LDOCEExample,
    LDOCECollocation,
    LDOCESense,
    LDOCEPhrasalVerb,
    LDOCEEntry,
    LDOCEWord,
    LDOCEEtymology,
    LDOCEVerbForm,
    LDOCEVerbTable,
    LDOCEExtraExample,
    LDOCEThesaurusEntry,
    LDOCEThesaurus,
)

logger = logging.getLogger(__name__)

# ========== PERFORMANCE LIMITS ==========
# High-frequency words like "on" have 40+ senses and 100+ examples.
# Truncating to reasonable limits reduces response from 2.1MB to ~100KB.
MAX_SENSES_PER_ENTRY = 10
MAX_EXAMPLES_PER_SENSE = 3
MAX_COLLOCATIONS_PER_ENTRY = 10
MAX_PHRASAL_VERBS = 10


class LDOCEParser:
    """
    Parser for LDOCE6++ dictionary HTML.

    Extracts structured data including:
    - Headword, pronunciations (BrE/AmE), audio
    - Parts of speech with multiple entries
    - Senses with definitions, examples, translations
    - Collocations and phrasal verbs
    - Word origin (etymology)
    - Verb conjugation tables
    - Extra examples from other dictionaries/corpus
    - Thesaurus entries and word sets
    """

    # ========== LRU CACHE ==========
    # Cache parsed results to avoid re-parsing the same HTML.
    # Key: (hash of HTML, word, include_raw_html)
    # Value: LDOCEWord model
    _parse_cache: dict = {}  # Simple dict cache with manual eviction
    _cache_max_size: int = 500

    def __init__(self):
        pass

    def parse(self, html: str, word: str, include_raw_html: bool = False) -> LDOCEWord:
        """
        Parse LDOCE HTML and return structured data.

        Args:
            html: Raw HTML from LDOCE MDX
            word: The word being looked up
            include_raw_html: Whether to include raw HTML in response

        Returns:
            LDOCEWord with parsed entries
        """
        if not html or not html.strip():
            return LDOCEWord(word=word, found=False)

        # Handle redirect entries
        if html.strip().startswith("@@@LINK="):
            return LDOCEWord(word=word, found=False)

        # Check cache (use hash of HTML as key to save memory)
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

            # Find all entry containers (there may be multiple: verb, noun, etc.)
            entries = self._parse_all_entries(soup)

            if not entries:
                result = LDOCEWord(word=word, found=False)
            else:
                result = LDOCEWord(
                    word=word,
                    found=True,
                    entries=entries,
                    raw_html=html if include_raw_html else None,
                )

            # Add to cache (with simple eviction if too large)
            if len(self._parse_cache) >= self._cache_max_size:
                # Remove oldest entry (FIFO-ish by clearing half)
                keys_to_remove = list(self._parse_cache.keys())[
                    : self._cache_max_size // 2
                ]
                for k in keys_to_remove:
                    del self._parse_cache[k]
            self._parse_cache[cache_key] = result

            return result

        except Exception as e:
            logger.error(f"Error parsing LDOCE HTML for '{word}': {e}")
            return LDOCEWord(word=word, found=False)

    def _parse_all_entries(self, soup: BeautifulSoup) -> List[LDOCEEntry]:
        """Parse all entries (one per part of speech)."""
        entries = []

        # LDOCE uses span.entry for each entry
        entry_elements = soup.select("span.entry")

        for entry_elem in entry_elements:
            entry = self._parse_entry(entry_elem)
            if entry:
                entries.append(entry)

        return entries

    def _parse_entry(self, entry_elem: Tag) -> Optional[LDOCEEntry]:
        """Parse a single entry container."""
        # Entry head contains headword, pronunciation, POS
        entryhead = entry_elem.select_one(".entryhead")
        if not entryhead:
            return None

        # Headword
        hwd_elem = entryhead.select_one(".hwd")
        headword = hwd_elem.get_text(strip=True) if hwd_elem else ""
        if not headword:
            return None

        # Hyphenation
        hyph_elem = entryhead.select_one(".hyphenation")
        hyphenation = hyph_elem.get_text(strip=True) if hyph_elem else None

        # Homograph number (simmer1, simmer2)
        homnum_elem = entryhead.select_one(".homnum")
        homnum = None
        if homnum_elem:
            try:
                homnum = int(homnum_elem.get_text(strip=True))
            except ValueError:
                pass

        # Part of speech
        pos_elem = entryhead.select_one(".pos")
        pos = pos_elem.get_text(strip=True) if pos_elem else None

        # Entry-level grammar (e.g., [transitive] for verbs)
        # This is used as fallback when senses don't have their own grammar
        entry_gram_elem = entryhead.select_one(".gram")
        entry_grammar = (
            entry_gram_elem.get_text(strip=True) if entry_gram_elem else None
        )

        # Pronunciation
        pron, pron_ame = self._extract_pronunciation(entryhead)

        # Audio URLs
        audio = self._extract_audio(entryhead)

        # Senses (pass entry-level grammar as default)
        senses = self._extract_senses(entry_elem, default_grammar=entry_grammar)

        # Phrasal verbs
        phrasal_verbs = self._extract_phrasal_verbs(entry_elem)

        # ========== EXTENDED DATA ==========
        # These are extracted from the .buttons popup sections
        buttons_container = entryhead.select_one(".buttons")

        # Etymology (Word Origin)
        etymology = (
            self._extract_etymology(buttons_container) if buttons_container else None
        )

        # Verb Table
        verb_table = (
            self._extract_verb_table(buttons_container) if buttons_container else None
        )

        # Extra Examples
        extra_examples = (
            self._extract_extra_examples(buttons_container) if buttons_container else []
        )

        # Thesaurus
        thesaurus = (
            self._extract_thesaurus(buttons_container) if buttons_container else None
        )

        # Collocations (from popup, not from senses)
        collocations = (
            self._extract_popup_collocations(buttons_container)
            if buttons_container
            else []
        )

        return LDOCEEntry(
            headword=headword,
            hyphenation=hyphenation,
            homnum=homnum,
            pronunciation=pron,
            pronunciation_ame=pron_ame,
            part_of_speech=pos,
            audio=audio,
            senses=senses,
            phrasal_verbs=phrasal_verbs,
            etymology=etymology,
            verb_table=verb_table,
            extra_examples=extra_examples,
            thesaurus=thesaurus,
            collocations=collocations,
        )

    def _extract_pronunciation(
        self, container: Tag
    ) -> Tuple[Optional[str], Optional[str]]:
        """Extract main and American English pronunciation."""
        pron = None
        pron_ame = None

        # Main pronunciation
        pron_elem = container.select_one(".pron")
        if pron_elem:
            pron = pron_elem.get_text(strip=True)

        # American variant
        ame_elem = container.select_one(".amevarpron")
        if ame_elem:
            pron_ame_text = ame_elem.get_text(strip=True)
            # Clean up (remove leading $ symbols)
            pron_ame = re.sub(r"^[\$\s]+", "", pron_ame_text)

        return pron, pron_ame

    def _extract_audio(self, container: Tag) -> Optional[LDOCEAudio]:
        """Extract audio URLs from the entry head."""
        bre_url = None
        ame_url = None

        # Find all audio links
        for a_tag in container.select('a[href^="sound://"]'):
            href = a_tag.get("href", "")
            img = a_tag.select_one("img")

            if img:
                src = img.get("src", "")
                # British English: spkr_r.png (red)
                # American English: spkr_b.png (blue)
                if "spkr_r" in src and not bre_url:
                    bre_url = self._make_audio_url(href)
                elif "spkr_b" in src and not ame_url:
                    ame_url = self._make_audio_url(href)

        if bre_url or ame_url:
            return LDOCEAudio(bre_url=bre_url, ame_url=ame_url)
        return None

    def _extract_senses(
        self, entry_elem: Tag, default_grammar: Optional[str] = None
    ) -> List[LDOCESense]:
        """Extract all senses from an entry.

        Args:
            entry_elem: The entry element containing senses
            default_grammar: Entry-level grammar to use when sense has no grammar
        """
        senses = []

        # Direct child senses (not inside phrasal verb entries)
        for sense_elem in entry_elem.select("span.sense"):
            # Skip senses inside phrasal verb entries
            parent = sense_elem.find_parent("span", class_="phrvbentry")
            if parent:
                continue

            sense = self._parse_sense(sense_elem, default_grammar=default_grammar)
            if sense:
                senses.append(sense)

        return senses[:MAX_SENSES_PER_ENTRY]  # Performance: limit senses

    def _parse_sense(
        self, sense_elem: Tag, default_grammar: Optional[str] = None
    ) -> Optional[LDOCESense]:
        """Parse a single sense element.

        Args:
            sense_elem: The sense element to parse
            default_grammar: Entry-level grammar to use as fallback
        """
        # Sense number
        sensenum_elem = sense_elem.select_one(".sensenum")
        index = 1
        if sensenum_elem:
            try:
                index = int(sensenum_elem.get_text(strip=True))
            except ValueError:
                pass

        # Grammar: prefer sense-level, fallback to entry-level
        gram_elem = sense_elem.select_one(".gram")
        grammar = gram_elem.get_text(strip=True) if gram_elem else default_grammar

        # Definition (English and Chinese)
        definition, definition_cn = self._extract_definition(sense_elem)

        if not definition:
            return None

        # Examples
        examples = self._extract_examples(sense_elem)

        # Collocations from this sense
        collocations = self._extract_collocations(sense_elem)

        return LDOCESense(
            index=index,
            definition=definition,
            definition_cn=definition_cn,
            grammar=grammar,
            examples=examples,
            collocations=collocations,
        )

    def _extract_definition(self, container: Tag) -> Tuple[str, Optional[str]]:
        """Extract English and Chinese definition from a sense."""
        definition = ""
        definition_cn = None

        def_elem = container.select_one(".def")
        if def_elem:
            # Chinese translation is in <tran> tag
            tran_elem = def_elem.select_one("tran")
            if tran_elem:
                definition_cn = tran_elem.get_text(strip=True)

            # English definition
            en_elem = def_elem.select_one("en")
            if en_elem:
                definition = en_elem.get_text(strip=True)
            else:
                # Fallback: if no <en> tag, get text directly from .def
                # We must exclude <tran> tag content if it exists
                text_parts = []
                for child in def_elem.children:
                    if child.name == "tran":
                        continue
                    if hasattr(child, "get_text"):
                        text_parts.append(child.get_text(strip=True))
                    else:
                        text_parts.append(str(child).strip())
                
                definition = " ".join(part for part in text_parts if part)

        return definition, definition_cn

    def _extract_examples(self, container: Tag) -> List[LDOCEExample]:
        """Extract example sentences from a container."""
        examples = []

        # Direct examples in .example spans
        for example_elem in container.select("span.example"):
            example = self._parse_example(example_elem)
            if example:
                examples.append(example)

        # Also check gramexa spans (grammar examples with patterns)
        for gramexa in container.select("span.gramexa"):
            for example_elem in gramexa.select("span.example"):
                example = self._parse_example(example_elem)
                if example:
                    examples.append(example)

        return examples[:MAX_EXAMPLES_PER_SENSE]  # Performance: limit examples

    def _parse_example(self, example_elem: Tag) -> Optional[LDOCEExample]:
        """Parse a single example element."""
        # English text is in <exaen> tag
        exaen = example_elem.select_one("exaen")
        text = ""
        audio_url = None

        if exaen:
            # Get audio if present
            audio_link = exaen.select_one('a[href^="sound://"]')
            if audio_link:
                audio_url = self._make_audio_url(audio_link.get("href", ""))

            # Get text (excluding the audio icon)
            text = exaen.get_text(separator=" ", strip=True)
            # Remove any speaker icon artifacts
            text = re.sub(r"^[\s\ue000-\uf8ff]+", "", text)
            text = re.sub(r"\s+", " ", text).strip()
        else:
            # Fallback: get direct text
            text = example_elem.get_text(separator=" ", strip=True)
            text = re.sub(r"\s+", " ", text).strip()

        if not text or len(text) < 5:
            return None

        # Chinese translation is in <example> tag (inside the span.example)
        translation = None
        trans_elem = example_elem.select_one("example")
        if trans_elem:
            translation = trans_elem.get_text(strip=True)

        return LDOCEExample(text=text, translation=translation, audio_url=audio_url)

    def _extract_collocations(self, sense_elem: Tag) -> List[LDOCECollocation]:
        """Extract collocations from a sense."""
        collocations = []

        # Look for collocation patterns
        for colloc_elem in sense_elem.select("span.collocate"):
            pattern_elem = colloc_elem.select_one(".colloc")
            if not pattern_elem:
                continue

            pattern = pattern_elem.get_text(strip=True)
            if not pattern:
                continue

            # Get examples for this collocation
            examples = []
            content_div = colloc_elem.select_one("div.content")
            if content_div:
                for example_elem in content_div.select("span.example"):
                    example = self._parse_collocation_example(example_elem)
                    if example:
                        examples.append(example)

            collocations.append(LDOCECollocation(pattern=pattern, examples=examples))

        return collocations

    def _parse_collocation_example(self, example_elem: Tag) -> Optional[LDOCEExample]:
        """Parse a collocation example (simpler structure)."""
        # Use separator=' ' to preserve spaces between HTML tags
        text = example_elem.get_text(separator=" ")
        # Normalize: remove leading bullet, collapse multiple spaces, strip edges
        text = re.sub(r"^[·•\s]+", "", text)
        text = re.sub(r"\s+", " ", text).strip()

        if not text or len(text) < 5:
            return None

        return LDOCEExample(text=text, translation=None)

    def _extract_phrasal_verbs(self, entry_elem: Tag) -> List[LDOCEPhrasalVerb]:
        """Extract phrasal verbs from an entry."""
        phrasal_verbs = []

        for pv_elem in entry_elem.select("span.phrvbentry"):
            pv = self._parse_phrasal_verb(pv_elem)
            if pv:
                phrasal_verbs.append(pv)

        return phrasal_verbs[:MAX_PHRASAL_VERBS]  # Performance: limit phrasal verbs

    def _parse_phrasal_verb(self, pv_elem: Tag) -> Optional[LDOCEPhrasalVerb]:
        """Parse a phrasal verb entry."""
        # Phrasal verb headword
        hwd_elem = pv_elem.select_one(".phrvbhwd")
        if not hwd_elem:
            return None

        phrase = hwd_elem.get_text(strip=True)
        if not phrase:
            return None

        # Find the sense inside the phrasal verb
        sense_elem = pv_elem.select_one("span.sense")
        if not sense_elem:
            return None

        definition, definition_cn = self._extract_definition(sense_elem)

        if not definition:
            return None

        # Examples
        examples = self._extract_examples(sense_elem)

        return LDOCEPhrasalVerb(
            phrase=phrase,
            definition=definition,
            definition_cn=definition_cn,
            examples=examples,
        )

    def _make_audio_url(self, sound_url: str) -> str:
        """Convert sound:// URL to API URL."""
        # sound://hwd/bre/6/simmer_n0205.mp3 -> /dict/resource?path=hwd/bre/6/simmer_n0205.mp3
        path = sound_url.replace("sound://", "")
        return f"/dict/resource?path={path}"

    # ========== EXTENDED DATA EXTRACTION ==========

    def _find_popup_content(
        self, buttons_container: Tag, button_text: str
    ) -> Optional[Tag]:
        """Find the popup content div for a specific button."""
        if not buttons_container:
            return None

        # Find button by text
        for button in buttons_container.select("span.popup-button"):
            btn_text = button.get_text(strip=True)
            if button_text.lower() in btn_text.lower():
                # The at-link div is the next sibling
                next_sibling = button.find_next_sibling("div", class_="at-link")
                return next_sibling

        return None

    def _extract_etymology(self, buttons_container: Tag) -> Optional[LDOCEEtymology]:
        """Extract word origin/etymology from Word Origin popup."""
        at_link = self._find_popup_content(buttons_container, "Word Origin")
        if not at_link:
            return None

        century = None
        origin = None
        meaning = None
        note = None

        # Find etymsense which contains the main content
        etymsense = at_link.select_one(".etymsense")
        if etymsense:
            # Century
            century_elem = etymsense.select_one(".etymcentury")
            if century_elem:
                century = century_elem.get_text(strip=True)

            # Origin word
            origin_elem = etymsense.select_one(".etymorigin")
            if origin_elem:
                origin = origin_elem.get_text(strip=True)

            # Original meaning
            meaning_elem = etymsense.select_one(".etymtran")
            if meaning_elem:
                meaning = meaning_elem.get_text(strip=True)

            # Additional note (text after the known elements)
            full_text = etymsense.get_text(strip=True)
            # Extract note by removing known parts
            for elem in [century_elem, origin_elem, meaning_elem]:
                if elem:
                    full_text = full_text.replace(elem.get_text(strip=True), "")
            note_text = full_text.strip(" ,")
            if note_text and len(note_text) > 3:
                note = note_text

        if century or origin or meaning:
            return LDOCEEtymology(
                century=century, origin=origin, meaning=meaning, note=note
            )
        return None

    def _extract_verb_table(self, buttons_container: Tag) -> Optional[LDOCEVerbTable]:
        """Extract verb conjugation table from Verb Table popup."""
        at_link = self._find_popup_content(buttons_container, "Verb Table")
        if not at_link:
            return None

        verbtable = at_link.select_one(".verbtable")
        if not verbtable:
            return None

        # Get lemma
        lemma_elem = verbtable.select_one(".lemma")
        lemma = lemma_elem.get_text(strip=True) if lemma_elem else ""
        if not lemma:
            return None

        simple_forms = []
        continuous_forms = []

        # Process each table (Simple Form, Continuous Form)
        tables = verbtable.select("table")
        for table in tables:
            header = table.select_one("td.header")
            is_continuous = header and "Continuous" in header.get_text()

            current_tense = ""
            for row in table.select("tr"):
                cells = row.select("td")
                if len(cells) < 2:
                    continue

                # Check if this row has a tense name
                col1 = cells[0] if len(cells) > 0 else None
                if (
                    col1
                    and col1.get("class", []) == ["col1"]
                    and col1.get_text(strip=True)
                ):
                    current_tense = col1.get_text(strip=True)

                # Skip header rows
                if cells[0].get("class", []) == ["header"]:
                    continue

                # Get person and form
                person = cells[1].get_text(strip=True) if len(cells) > 1 else ""

                # Get verb form (last cell)
                form_elem = row.select_one(".verb_form")
                aux_elem = row.select_one(".aux")

                if form_elem:
                    form = form_elem.get_text(strip=True)
                    auxiliary = aux_elem.get_text(strip=True) if aux_elem else None

                    verb_form = LDOCEVerbForm(
                        tense=current_tense,
                        person=person,
                        form=form,
                        auxiliary=auxiliary,
                    )

                    if is_continuous:
                        continuous_forms.append(verb_form)
                    else:
                        simple_forms.append(verb_form)

        if simple_forms or continuous_forms:
            return LDOCEVerbTable(
                lemma=lemma,
                simple_forms=simple_forms,
                continuous_forms=continuous_forms,
            )
        return None

    def _extract_extra_examples(
        self, buttons_container: Tag
    ) -> List[LDOCEExtraExample]:
        """Extract examples from other dictionaries and corpus."""
        at_link = self._find_popup_content(buttons_container, "Examples")
        if not at_link:
            return []

        extra_examples = []
        current_source = "OTHER_DICTIONARIES"

        # Look for headers that indicate source
        for elem in at_link.children:
            if hasattr(elem, "get_text"):
                text = elem.get_text(strip=True)
                if "FROM THE CORPUS" in text:
                    current_source = "CORPUS"
                elif "FROM OTHER DICTIONARIES" in text:
                    current_source = "OTHER_DICTIONARIES"

        # Get examples from ul.exas
        for ul in at_link.select("ul.exas"):
            # Check header before this ul
            header = ul.find_previous_sibling("span", class_="entry")
            if header:
                header_text = header.get_text(strip=True)
                if "CORPUS" in header_text:
                    current_source = "CORPUS"
                else:
                    current_source = "OTHER_DICTIONARIES"

            for li in ul.select("li"):
                # Use separator=' ' to preserve spaces between HTML tags
                text = li.get_text(separator=" ")
                # Normalize: collapse multiple spaces, strip edges
                text = re.sub(r"\s+", " ", text).strip()
                if text and len(text) > 5:
                    extra_examples.append(
                        LDOCEExtraExample(text=text, source=current_source)
                    )

        return extra_examples

    def _extract_thesaurus(self, buttons_container: Tag) -> Optional[LDOCEThesaurus]:
        """Extract thesaurus entries and word sets."""
        at_link = self._find_popup_content(buttons_container, "Thesaurus")
        if not at_link:
            return None

        topic = None
        entries = []
        word_sets = []

        # Get topic from secheading
        secheading = at_link.select_one(".secheading")
        if secheading:
            topic = secheading.get_text(strip=True)

        # Get thesaurus entries
        for exponent in at_link.select("span.exponent"):
            word_elem = exponent.select_one(".exp.display")
            if not word_elem:
                continue

            word = word_elem.get_text(strip=True)

            # Get definition
            content = exponent.select_one("div.content")
            definition = None
            examples = []

            if content:
                def_elem = content.select_one("span.def")
                if def_elem:
                    definition = def_elem.get_text(strip=True)

                # Get examples
                for ex_elem in content.select("span.example"):
                    ex_text = ex_elem.get_text(strip=True)
                    # Remove bullet
                    ex_text = re.sub(r"^[·•\s]+", "", ex_text)
                    if ex_text:
                        examples.append(ex_text)

            entries.append(
                LDOCEThesaurusEntry(
                    word=word,
                    definition=definition,
                    examples=examples[:3],  # Limit examples
                )
            )

        # Get word sets
        for category in at_link.select("span.category"):
            ws_head = category.select_one(".ws-head")
            if ws_head:
                # Get all words in this category
                content = category.select_one("div.content")
                if content:
                    for wswd in content.select(".wswd"):
                        ws_word = wswd.get_text(strip=True)
                        # Remove POS info
                        ws_word = re.sub(
                            r",\s*(noun|verb|adjective|adverb)$", "", ws_word
                        )
                        if ws_word:
                            word_sets.append(ws_word)

        if topic or entries or word_sets:
            return LDOCEThesaurus(
                topic=topic,
                entries=entries[:10],  # Limit entries
                word_sets=word_sets[:20],  # Limit word sets
            )
        return None

    def _extract_popup_collocations(
        self, buttons_container: Tag
    ) -> List[LDOCECollocation]:
        """Extract collocations from Collocations popup."""
        at_link = self._find_popup_content(buttons_container, "Collocations")
        if not at_link:
            return []

        collocations = []
        current_pos = None

        # Process sections (organized by part of speech)
        for section in at_link.select("span.section"):
            secheading = section.select_one(".secheading")
            if secheading:
                current_pos = secheading.get_text(strip=True)

            for colloc_elem in section.select("span.collocate"):
                pattern_elem = colloc_elem.select_one(".colloc.collo")
                if not pattern_elem:
                    continue

                pattern = pattern_elem.get_text(strip=True)
                if not pattern:
                    continue

                # Get examples
                examples = []
                content = colloc_elem.select_one("div.content")
                if content:
                    for ex_elem in content.select("span.example"):
                        # Use separator=' ' to preserve spaces between HTML tags (e.g., <span class="colloinexa">)
                        ex_text = ex_elem.get_text(separator=" ")
                        # Normalize: remove leading bullets, collapse multiple spaces, strip edges
                        ex_text = re.sub(r"^[·•\s]+", "", ex_text)
                        ex_text = re.sub(r"\s+", " ", ex_text).strip()
                        if ex_text and len(ex_text) > 5:
                            examples.append(
                                LDOCEExample(text=ex_text, translation=None)
                            )

                collocations.append(
                    LDOCECollocation(
                        pattern=pattern,
                        part_of_speech=current_pos,
                        examples=examples,  # All examples
                    )
                )

        # Also process .tail collocations (entry-based)
        for tail in at_link.select("span.tail"):
            for colloc_elem in tail.select("span.collocate"):
                pattern_elem = colloc_elem.select_one(".colloc.collo")
                if not pattern_elem:
                    continue

                pattern = pattern_elem.get_text(strip=True)
                if not pattern:
                    continue

                # Get examples
                examples = []
                content = colloc_elem.select_one("div.content")
                if content:
                    for ex_elem in content.select("span.example"):
                        # Try to get exaen for better text
                        exaen = ex_elem.select_one("exaen")
                        if exaen:
                            # Use separator=' ' to preserve spaces between HTML tags
                            ex_text = exaen.get_text(separator=" ")
                        else:
                            ex_text = ex_elem.get_text(separator=" ")
                        # Normalize: remove leading bullets, collapse multiple spaces, strip edges
                        ex_text = re.sub(r"^[·•\s]+", "", ex_text)
                        ex_text = re.sub(r"\s+", " ", ex_text).strip()
                        if ex_text and len(ex_text) > 5:
                            trans_elem = ex_elem.select_one("example")
                            translation = (
                                trans_elem.get_text(strip=True) if trans_elem else None
                            )
                            examples.append(
                                LDOCEExample(text=ex_text, translation=translation)
                            )

                collocations.append(
                    LDOCECollocation(
                        pattern=pattern,
                        part_of_speech=None,
                        examples=examples,  # All examples
                    )
                )

        return collocations[
            :MAX_COLLOCATIONS_PER_ENTRY
        ]  # Performance: limit collocations


# Singleton instance
ldoce_parser = LDOCEParser()
