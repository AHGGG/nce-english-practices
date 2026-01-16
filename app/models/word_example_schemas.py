"""
Multi-Example Content Schemas for the Voice Learning Interface.

Provides structured data for words with multiple definitions and examples.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class ExampleItem(BaseModel):
    """A single example sentence."""

    text: str = Field(..., description="Example sentence in English")
    translation: Optional[str] = Field(None, description="Chinese translation")
    audio_url: Optional[str] = Field(None, description="Audio URL if available")


class SenseWithExamples(BaseModel):
    """A single sense/definition with its examples."""

    index: int = Field(..., description="Sense number (1, 2, 3...)")
    definition: str = Field(..., description="English definition")
    definition_cn: Optional[str] = Field(
        None, description="Chinese translation of definition"
    )
    grammar_pattern: Optional[str] = Field(
        None, description="Grammar pattern like [+ that]"
    )
    examples: List[ExampleItem] = Field(
        default_factory=list, description="Example sentences"
    )


class WordEntry(BaseModel):
    """A dictionary entry for one part of speech."""

    pos: str = Field(..., description="Part of speech (noun, verb, adjective...)")
    pronunciation: Optional[str] = Field(None, description="IPA pronunciation")
    audio_url: Optional[str] = Field(None, description="Audio URL for pronunciation")
    senses: List[SenseWithExamples] = Field(
        default_factory=list, description="List of senses/definitions"
    )


class WordExampleSet(BaseModel):
    """Complete set of examples for a word, grouped by entry and sense."""

    word: str = Field(..., description="The word being looked up")
    entries: List[WordEntry] = Field(
        default_factory=list, description="Entries by part of speech"
    )
    source: str = Field(
        default="dictionary", description="Source of data (collins, ldoce, etc.)"
    )

    # Total counts for navigation
    total_senses: int = Field(
        0, description="Total number of senses across all entries"
    )
    total_examples: int = Field(0, description="Total number of examples")
