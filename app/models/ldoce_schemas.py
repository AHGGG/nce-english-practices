"""
LDOCE Dictionary Schemas - Structured data models for Longman Dictionary entries.

LDOCE6++ En-Cn V2-19 dictionary format.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class LDOCEAudio(BaseModel):
    """Audio URLs for British and American English pronunciations."""
    bre_url: Optional[str] = Field(None, description="British English audio URL")
    ame_url: Optional[str] = Field(None, description="American English audio URL")


class LDOCEExample(BaseModel):
    """Example sentence with translation and optional audio."""
    text: str = Field(..., description="Example sentence in English")
    translation: Optional[str] = Field(None, description="Chinese translation")
    audio_url: Optional[str] = Field(None, description="Audio URL for example")


class LDOCECollocation(BaseModel):
    """Word collocation pattern with examples."""
    pattern: str = Field(..., description="Collocation pattern like 'simmer gently'")
    part_of_speech: Optional[str] = Field(None, description="Part of speech category (ADVERB, VERB, etc.)")
    examples: List[LDOCEExample] = Field(default_factory=list, description="Usage examples")


class LDOCESense(BaseModel):
    """A single sense/meaning of a word."""
    index: int = Field(..., description="Sense number (1, 2, 3...)")
    definition: str = Field(..., description="Definition in English")
    definition_cn: Optional[str] = Field(None, description="Chinese translation of definition")
    grammar: Optional[str] = Field(None, description="Grammar pattern like '[intransitive, transitive]'")
    examples: List[LDOCEExample] = Field(default_factory=list, description="Example sentences")
    collocations: List[LDOCECollocation] = Field(default_factory=list, description="Collocations from this sense")


class LDOCEPhrasalVerb(BaseModel):
    """Phrasal verb entry."""
    phrase: str = Field(..., description="Phrasal verb like 'simmer down'")
    definition: str = Field(..., description="Definition in English")
    definition_cn: Optional[str] = Field(None, description="Chinese translation")
    examples: List[LDOCEExample] = Field(default_factory=list, description="Example sentences")


# ========== NEW MODELS FOR EXTENDED DATA ==========

class LDOCEEtymology(BaseModel):
    """Word origin/etymology information."""
    century: Optional[str] = Field(None, description="Time period like '1600-1700'")
    origin: Optional[str] = Field(None, description="Origin word like 'simper'")
    meaning: Optional[str] = Field(None, description="Original meaning like 'to simmer'")
    note: Optional[str] = Field(None, description="Additional notes like 'perhaps from the sound'")


class LDOCEVerbForm(BaseModel):
    """A single verb form in the conjugation table."""
    tense: str = Field(..., description="Tense name like 'Present', 'Past', 'Present perfect'")
    person: str = Field(..., description="Person like 'I, you, we, they' or 'he, she, it'")
    form: str = Field(..., description="Conjugated form like 'simmer', 'simmers', 'simmered'")
    auxiliary: Optional[str] = Field(None, description="Auxiliary verb like 'have', 'has', 'will'")


class LDOCEVerbTable(BaseModel):
    """Complete verb conjugation table."""
    lemma: str = Field(..., description="Base form of the verb")
    simple_forms: List[LDOCEVerbForm] = Field(default_factory=list, description="Simple tense forms")
    continuous_forms: List[LDOCEVerbForm] = Field(default_factory=list, description="Continuous tense forms")


class LDOCEExtraExample(BaseModel):
    """Example from other dictionaries or corpus."""
    text: str = Field(..., description="Example sentence text")
    source: str = Field(..., description="Source: 'OTHER_DICTIONARIES' or 'CORPUS'")


class LDOCEThesaurusEntry(BaseModel):
    """Related word from thesaurus."""
    word: str = Field(..., description="Related word like 'boil', 'fry', 'bake'")
    definition: Optional[str] = Field(None, description="Definition of the related word")
    examples: List[str] = Field(default_factory=list, description="Example sentences")


class LDOCEThesaurus(BaseModel):
    """Thesaurus section with related words and word sets."""
    topic: Optional[str] = Field(None, description="Topic heading like 'ways of cooking'")
    entries: List[LDOCEThesaurusEntry] = Field(default_factory=list, description="Related words with definitions")
    word_sets: List[str] = Field(default_factory=list, description="Words in the word set category")


class LDOCEEntry(BaseModel):
    """
    A complete dictionary entry for a word (one part of speech).
    
    A word like 'simmer' may have multiple entries: verb entry and noun entry.
    """
    headword: str = Field(..., description="The word being defined")
    hyphenation: Optional[str] = Field(None, description="Word with syllable breaks")
    homnum: Optional[int] = Field(None, description="Homograph number (1, 2, etc.) for words like simmer1, simmer2")
    pronunciation: Optional[str] = Field(None, description="IPA pronunciation")
    pronunciation_ame: Optional[str] = Field(None, description="American English variant pronunciation")
    part_of_speech: Optional[str] = Field(None, description="Part of speech (verb, noun, adjective)")
    audio: Optional[LDOCEAudio] = Field(None, description="Audio pronunciations")
    senses: List[LDOCESense] = Field(default_factory=list, description="List of meanings")
    phrasal_verbs: List[LDOCEPhrasalVerb] = Field(default_factory=list, description="Related phrasal verbs")
    
    # Extended data fields
    etymology: Optional[LDOCEEtymology] = Field(None, description="Word origin information")
    verb_table: Optional[LDOCEVerbTable] = Field(None, description="Verb conjugation table (for verbs)")
    extra_examples: List[LDOCEExtraExample] = Field(default_factory=list, description="Examples from other dictionaries/corpus")
    thesaurus: Optional[LDOCEThesaurus] = Field(None, description="Thesaurus entries and word sets")
    collocations: List[LDOCECollocation] = Field(default_factory=list, description="Collocations from corpus")


class LDOCEWord(BaseModel):
    """
    Complete response for an LDOCE dictionary lookup.
    
    Contains multiple entries when a word has different parts of speech
    (e.g., 'simmer' as verb and as noun).
    """
    word: str = Field(..., description="The queried word")
    found: bool = Field(..., description="Whether the word was found")
    entries: List[LDOCEEntry] = Field(default_factory=list, description="Dictionary entries (one per POS)")
    raw_html: Optional[str] = Field(None, description="Original HTML (for debugging)")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "word": "simmer",
                "found": True,
                "entries": [
                    {
                        "headword": "simmer",
                        "homnum": 1,
                        "part_of_speech": "verb",
                        "pronunciation": "ˈsɪmə",
                        "senses": [
                            {
                                "index": 1,
                                "definition": "to boil gently, or to cook something slowly by boiling it gently",
                                "definition_cn": "〔用文火〕慢慢地煮，煨，炖",
                                "grammar": "[intransitive, transitive]",
                                "examples": [
                                    {
                                        "text": "Bring the soup to the boil and allow it to simmer gently for about half an hour.",
                                        "translation": "把汤煮开，然后用文火炖半小时左右。"
                                    }
                                ]
                            }
                        ],
                        "phrasal_verbs": [
                            {
                                "phrase": "simmer down",
                                "definition": "to become calm again after you have been very angry",
                                "definition_cn": "〔盛怒后〕平静下来，冷静下来"
                            }
                        ],
                        "etymology": {
                            "century": "1600-1700",
                            "origin": "simper",
                            "meaning": "'to simmer'",
                            "note": "perhaps from the sound"
                        },
                        "extra_examples": [
                            {"text": "Simmer the macaroni in lightly salted water.", "source": "OTHER_DICTIONARIES"},
                            {"text": "Let the soup simmer for 10 minutes.", "source": "CORPUS"}
                        ],
                        "thesaurus": {
                            "topic": "ways of cooking",
                            "entries": [
                                {"word": "boil", "definition": "to cook food in very hot water"},
                                {"word": "fry", "definition": "to cook food in hot oil, butter, or fat"}
                            ]
                        },
                        "collocations": [
                            {"pattern": "simmer gently", "part_of_speech": "ADVERB"},
                            {"pattern": "simmer down", "part_of_speech": "ADVERB"}
                        ]
                    },
                    {
                        "headword": "simmer",
                        "homnum": 2,
                        "part_of_speech": "noun",
                        "senses": [
                            {
                                "index": 1,
                                "definition": "when something is boiling gently",
                                "definition_cn": "慢慢沸腾的状态，文火慢煮，小沸"
                            }
                        ]
                    }
                ]
            }
        }
    }

