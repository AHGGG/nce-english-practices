"""
ContentFeeder Service - Provides content for the Voice Learning Interface.

Uses the Collins Dictionary to pull real example sentences.
"""

import random
from typing import Optional, List
from pydantic import BaseModel, Field

from app.services.dictionary import dict_manager
from app.services.collins_parser import collins_parser
from app.models.collins_schemas import CollinsExample


class FeedContent(BaseModel):
    """A piece of content to feed to the Voice Interface."""
    text: str = Field(..., description="The main text/sentence to present")
    translation: Optional[str] = Field(None, description="Chinese translation if available")
    source_word: str = Field(..., description="The word this example came from")
    definition: Optional[str] = Field(None, description="The definition of the word")
    source_type: str = Field(default="dictionary", description="dictionary, rss, podcast, etc.")
    highlights: List[str] = Field(default_factory=list, description="List of words to highlight in the text")
    article_title: Optional[str] = Field(None, description="Title of the source article (for RSS)")
    article_link: Optional[str] = Field(None, description="URL of the source article (for RSS)")
    # Sequential reading support
    article_idx: Optional[int] = Field(None, description="Current article index")
    sentence_idx: Optional[int] = Field(None, description="Current sentence index within article")
    total_sentences: Optional[int] = Field(None, description="Total sentences in current article")
    has_next: Optional[bool] = Field(None, description="Whether there's more content to read")
    # Debug field - full article content for troubleshooting
    raw_content: Optional[str] = Field(None, description="Full raw article content (for debugging)")


class ContentFeeder:
    """
    Pulls content from various sources (Dictionary, RSS, Podcast) for the Voice Interface.
    
    For Phase 20, we focus on Dictionary examples only.
    """
    
    # A curated list of common, learnable words for demo purposes
    SEED_WORDS = [
        "accumulate", "approach", "benefit", "challenge", "determine",
        "establish", "facilitate", "generate", "highlight", "implement",
        "justify", "leverage", "maintain", "negotiate", "obtain",
        "perceive", "require", "significant", "transform", "utilize",
        "achieve", "analyze", "assume", "available", "concept",
        "consist", "context", "create", "define", "demonstrate"
    ]
    
    def __init__(self):
        self._used_examples: set[str] = set()  # Track used examples to avoid repetition
        self._current_index = 0
    
    async def _disambiguate_word_sense(self, word: str, sentence: str, senses: List[dict]) -> int:
        """
        Use LLM to determine which sense of a word is being used in the given sentence.
        
        Args:
            word: The word to disambiguate
            sentence: The sentence containing the word
            senses: List of sense dicts with 'definition' key
            
        Returns:
            Index of the most appropriate sense (0-based)
        """
        if not senses:
            return 0
        if len(senses) == 1:
            return 0
        
        try:
            from app.services.llm import llm_service
            
            # Build prompt with numbered senses
            senses_text = "\n".join([
                f"{i+1}. {s.get('definition', 'No definition')}" 
                for i, s in enumerate(senses[:5])  # Limit to first 5 senses
            ])
            
            prompt = f"""Given this sentence: "{sentence}"

The word "{word}" appears with these possible meanings:
{senses_text}

Which meaning number (1-{min(len(senses), 5)}) best matches how "{word}" is used in the sentence?
Reply with ONLY the number, nothing else."""

            response = await llm_service.chat_complete(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0
            )
            
            # Parse response - should be just a number
            try:
                sense_num = int(response.strip())
                if 1 <= sense_num <= min(len(senses), 5):
                    return sense_num - 1  # Convert to 0-based
            except ValueError:
                pass
                
        except Exception as e:
            print(f"WSD error for '{word}': {e}")
        
        return 0  # Default to first sense
    
    async def get_next_content(
        self, 
        target_word: Optional[str] = None, 
        source_book: Optional[str] = None,
        min_sequence: Optional[int] = None,
        max_sequence: Optional[int] = None,
        exclude_word: Optional[str] = None,
        rss_url: Optional[str] = None,
        epub_file: Optional[str] = None,
        article_idx: Optional[int] = None,
        sentence_idx: Optional[int] = None
    ) -> Optional[FeedContent]:
        """
        Get the next piece of content.
        
        Args:
            target_word: Optional specific word to look up. If None, picks from seed list or book.
            source_book: Optional book code (e.g. 'cet4', 'coca').
            min_sequence: Optional min sequence (inclusive).
            max_sequence: Optional max sequence (inclusive).
            exclude_word: Optional word to exclude (for SKIP functionality).
            rss_url: Optional RSS feed URL for RSS mode.
            epub_file: Optional EPUB filename for EPUB mode.
            
        Returns:
            FeedContent with a real dictionary example, or None if not found.
        """
        # Pick a word
        word = target_word
        
        if not word and source_book:
            from app.services.word_list_service import word_list_service
            # TODO: Pass user_id from context if available, currently default
            word = await word_list_service.get_next_word(
                source_book, 
                min_sequence=min_sequence, 
                max_sequence=max_sequence,
                exclude_word=exclude_word
            )
        
        # 0. Content Driven Mode (Unified Provider)
        content_source_type = None
        content_params = {}
        
        if epub_file:
            content_source_type = "epub"
            content_params = {"filename": epub_file, "chapter_index": article_idx or 0}
        elif rss_url:
            content_source_type = "rss"
            content_params = {"url": rss_url, "article_index": article_idx or 0}
            
        if content_source_type:
            from app.services.content_service import content_service
            from app.models.content_schemas import SourceType
            
            try:
                # 1. Fetch Bundle (Chapter/Article)
                try:
                    bundle = await content_service.get_content(
                        SourceType(content_source_type), 
                        **content_params
                    )
                except IndexError:
                    # Tried fetching non-existent index (End of Content)
                    return None

                # 2. Navigation Logic (Sequential)
                current_s_idx = sentence_idx or 0
                sentences = bundle.sentences
                
                # Verify bounds
                if current_s_idx >= len(sentences):
                    # End of this article, try next one
                    # Recursively call self (to avoid duplicating logic)
                    if content_source_type == "epub":
                        return await self.get_next_content(
                            epub_file=epub_file, 
                            article_idx=(article_idx or 0) + 1, 
                            sentence_idx=0,
                            source_book=source_book
                        )
                    elif content_source_type == "rss":
                        return await self.get_next_content(
                            rss_url=rss_url, 
                            article_idx=(article_idx or 0) + 1, 
                            sentence_idx=0,
                            source_book=source_book
                        )
                    return None

                # 3. Construct Feed Content
                target_sentence = sentences[current_s_idx]
                text = target_sentence.text
                highlights = []
                definition = None

                # 4. Enrichment (Highlighting & WSD)
                if source_book:
                    from app.services.word_list_service import word_list_service
                    highlights = await word_list_service.identify_words_in_text(text, source_book)
                    
                    # WSD for first word
                    if highlights:
                        target_word = highlights[0]
                        # Use existing dict_manager and collins_parser
                        dict_results = dict_manager.lookup(target_word)
                        if dict_results:
                            all_senses = []
                            for r in dict_results:
                                if "Collins" in r.get("dictionary", ""):
                                    parsed = collins_parser.parse(r.get("definition", ""), target_word)
                                    if parsed.found and parsed.entry:
                                        for sense in parsed.entry.senses:
                                            all_senses.append({'definition': sense.definition})
                            if all_senses:
                                best_sense_idx = await self._disambiguate_word_sense(
                                    target_word, text, all_senses
                                )
                                best_sense = all_senses[best_sense_idx]
                                definition = f"{target_word.upper()}: {best_sense.get('definition', '')}"

                # Calculate has_next
                has_next_sentence = current_s_idx + 1 < len(sentences)
                # Naive has_next_article (assume there might be more, or check metadata)
                total_articles = bundle.metadata.get('total_chapters') or bundle.metadata.get('total_articles') or 999
                has_next_article = (article_idx or 0) + 1 < int(total_articles)

                return FeedContent(
                    text=text,
                    translation=target_sentence.translation,
                    source_word=highlights[0] if highlights else "reader",
                    definition=definition, 
                    source_type=content_source_type,
                    highlights=highlights,
                    article_title=bundle.title,
                    article_link=bundle.source_url,
                    # Navigation State
                    article_idx=article_idx or 0,
                    sentence_idx=current_s_idx,
                    total_sentences=len(sentences),
                    has_next=has_next_sentence or has_next_article,
                    raw_content=bundle.full_text  # Carry full text for contexts
                )

            except Exception as e:
                print(f"ContentFeeder Error: {e}")
                return None
             
        # 2. Dictionary Mode (Word-Driven)
            
        if not word:
            # Round-robin through seed words
            word = self.SEED_WORDS[self._current_index % len(self.SEED_WORDS)]
            self._current_index += 1
        
        # Look up in dictionary
        results = dict_manager.lookup(word)
        
        if not results:
            # Fallback: try next word
            return self._fallback_content()
        
        # Parse the first Collins result
        for result in results:
            if "Collins" in result.get("dictionary", ""):
                html = result.get("definition", "")
                parsed = collins_parser.parse(html, word)
                
                if parsed.found and parsed.entry:
                    # Find an example
                    for sense in parsed.entry.senses:
                        for example in sense.examples:
                            # Skip if we've used this example before
                            if example.text in self._used_examples:
                                continue
                            
                            self._used_examples.add(example.text)
                            
                            return FeedContent(
                                text=example.text,
                                translation=example.translation,
                                source_word=word,
                                definition=sense.definition[:100] + "..." if len(sense.definition) > 100 else sense.definition,
                                source_type=f"dictionary_{source_book}" if source_book else "dictionary"
                            )
        
        # No suitable example found
        return self._fallback_content()
    
    def _fallback_content(self) -> FeedContent:
        """Return a fallback content when dictionary lookup fails."""
        return FeedContent(
            text="The meeting has been rescheduled to next week.",
            translation="会议已改期到下周。",
            source_word="reschedule",
            definition="to arrange a new time for an event",
            source_type="fallback"
        )
    
    def reset(self):
        """Reset the feeder state."""
        self._used_examples.clear()
        self._current_index = 0
    
    def get_all_examples(self, word: str) -> Optional['WordExampleSet']:
        """
        Get ALL examples for a word, grouped by sense.
        
        Args:
            word: The word to look up.
            
        Returns:
            WordExampleSet with all senses and examples, or None if not found.
        """
        from app.models.word_example_schemas import (
            WordExampleSet, WordEntry, SenseWithExamples, ExampleItem
        )
        
        results = dict_manager.lookup(word)
        
        if not results:
            return None
        
        entries: List['WordEntry'] = []
        total_senses = 0
        total_examples = 0
        
        # Parse Collins results
        for result in results:
            if "Collins" in result.get("dictionary", ""):
                html = result.get("definition", "")
                parsed = collins_parser.parse(html, word)
                
                if parsed.found and parsed.entry:
                    senses_list: List[SenseWithExamples] = []
                    
                    for i, sense in enumerate(parsed.entry.senses, 1):
                        examples_list = [
                            ExampleItem(
                                text=ex.text,
                                translation=ex.translation,
                                audio_url=None
                            )
                            for ex in sense.examples
                        ]
                        
                        if sense.definition:  # Only add sense if it has a definition
                            # Get grammar pattern from first example if available
                            first_grammar = None
                            if sense.examples and sense.examples[0].grammar_pattern:
                                first_grammar = sense.examples[0].grammar_pattern
                            
                            senses_list.append(SenseWithExamples(
                                index=i,
                                definition=sense.definition,
                                definition_cn=sense.definition_cn,
                                grammar_pattern=first_grammar or sense.part_of_speech,
                                examples=examples_list
                            ))
                            total_senses += 1
                            total_examples += len(examples_list)
                    
                    if senses_list:
                        entries.append(WordEntry(
                            pos=sense.part_of_speech or "unknown" if sense else "unknown",
                            pronunciation=parsed.entry.pronunciation_uk,
                            audio_url=None,
                            senses=senses_list
                        ))
        
        if not entries:
            return None
        
        return WordExampleSet(
            word=word,
            entries=entries,
            source="collins",
            total_senses=total_senses,
            total_examples=total_examples
        )


# Singleton
content_feeder = ContentFeeder()
