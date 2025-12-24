"""
Collins Dictionary Schemas - Structured data models for Collins COBUILD dictionary entries.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class CollinsAudio(BaseModel):
    """Audio resource with original path and API URL."""
    original_path: str = Field(..., description="Original path like sound://COLmp3/50560.mp3")
    api_url: str = Field(..., description="API endpoint like /dict/resource?path=COLmp3/50560.mp3")


class CollinsInflection(BaseModel):
    """Word inflection form (e.g., 3rd person singular, past tense)."""
    form: str = Field(..., description="Inflected form")
    label: str = Field(..., description="Grammar label (e.g., '3rd person singular present tense')")
    audio: Optional[CollinsAudio] = Field(None, description="Audio for this form")


class CollinsExample(BaseModel):
    """Example sentence with optional translation."""
    text: str = Field(..., description="Example sentence in English")
    translation: Optional[str] = Field(None, description="Chinese translation")
    grammar_pattern: Optional[str] = Field(None, description="Grammar pattern like 'VERB noun'")


class CollinsSense(BaseModel):
    """A single sense/meaning of a word."""
    index: int = Field(..., description="Sense number (1, 2, 3...)")
    definition: str = Field(..., description="Definition text in English")
    definition_cn: Optional[str] = Field(None, description="Chinese translation of definition")
    part_of_speech: Optional[str] = Field(None, description="Part of speech for this sense (V-ERG, NOUN, etc.)")
    domain: Optional[str] = Field(None, description="Domain label (COOKING, JOURNALISM)")
    examples: List[CollinsExample] = Field(default_factory=list, description="Example sentences")
    synonyms: List[str] = Field(default_factory=list, description="Synonyms")
    note: Optional[str] = Field(None, description="Usage note (e.g., 'Simmer is also a noun.')")
    note_examples: List[CollinsExample] = Field(default_factory=list, description="Examples in note section")


class CollinsEntry(BaseModel):
    """
    A complete dictionary entry for a word.
    """
    headword: str = Field(..., description="The word being defined")
    pronunciation_uk: Optional[str] = Field(None, description="UK IPA pronunciation")
    pronunciation_us: Optional[str] = Field(None, description="US IPA pronunciation")
    audio_uk: Optional[CollinsAudio] = Field(None, description="UK audio pronunciation")
    audio_us: Optional[CollinsAudio] = Field(None, description="US audio pronunciation")
    frequency: Optional[int] = Field(None, ge=1, le=5, description="Word frequency 1-5 (based on red circles)")
    inflections: List[CollinsInflection] = Field(default_factory=list, description="Inflected forms")
    senses: List[CollinsSense] = Field(default_factory=list, description="List of meanings")
    phrasal_verbs: List[str] = Field(default_factory=list, description="Related phrasal verbs")


class CollinsWord(BaseModel):
    """
    Complete response for a dictionary lookup.
    """
    word: str = Field(..., description="The queried word")
    found: bool = Field(..., description="Whether the word was found")
    entry: Optional[CollinsEntry] = Field(None, description="Dictionary entry")
    raw_html: Optional[str] = Field(None, description="Original HTML (for debugging, excluded by default)")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "word": "simmer",
                "found": True,
                "entry": {
                    "headword": "simmer",
                    "pronunciation_uk": "sɪməʳ",
                    "pronunciation_us": "ˈsɪmər",
                    "frequency": 2,
                    "senses": [
                        {
                            "index": 1,
                            "definition": "When you simmer food or when it simmers, you cook it...",
                            "definition_cn": "用文火炖;煨",
                            "part_of_speech": "V-ERG",
                            "examples": [
                                {
                                    "text": "Turn the heat down so the sauce simmers gently.",
                                    "translation": "将炉火调小，用文火炖调味汁。"
                                }
                            ],
                            "synonyms": ["bubble", "stew", "boil gently"]
                        }
                    ],
                    "phrasal_verbs": ["simmer down"]
                }
            }
        }
    }
