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
    
    def get_next_content(self, target_word: Optional[str] = None) -> Optional[FeedContent]:
        """
        Get the next piece of content.
        
        Args:
            target_word: Optional specific word to look up. If None, picks from seed list.
            
        Returns:
            FeedContent with a real dictionary example, or None if not found.
        """
        # Pick a word
        if target_word:
            word = target_word
        else:
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
                                source_type="dictionary"
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
