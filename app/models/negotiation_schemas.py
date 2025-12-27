from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class NegotiationStep(str, Enum):
    """The current step in the recursive negotiation loop."""
    ORIGINAL = "original"       # The original i+2 content
    EXPLAIN_EN = "explain_en"   # L2 Explanation (i+1 simplification)
    EXPLAIN_CN = "explain_cn"   # L1 Explanation (Fallback)
    VERIFY = "verify"           # Verification with new context

class UserIntention(str, Enum):
    """The user's non-verbal signal."""
    CONTINUE = "continue"       # "I got it" / "Next"
    HUH = "huh"                 # "I don't get it" / "Explain"
    ABORT = "abort"             # "Stop"

class NegotiationContext(BaseModel):
    """The context of what is being negotiated."""
    target_content: str = Field(..., description="The sentence or word being discussed")
    source_type: str = Field(..., description="dictionary, rss, podcast, story")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Extra metadata like original article ID, etc.")
    focus_words: List[str] = Field(default_factory=list, description="Specific words identified as difficult")
    definition: Optional[str] = Field(None, description="The dictionary definition of the word/sense")
    part_of_speech: Optional[str] = Field(None, description="The POS tag (e.g. verb, noun)")
    translation_hint: Optional[str] = Field(None, description="The existing translation for reference")

class NegotiationSessionState(BaseModel):
    """The transient state of the current negotiation loop."""
    session_id: str
    current_step: NegotiationStep = NegotiationStep.ORIGINAL
    history: List[Dict[str, Any]] = Field(default_factory=list, description="History of this specific negotiation loop")
    attempt_count: int = 0

class NegotiationRequest(BaseModel):
    """Request from the UI/Voice Layer."""
    session_id: str
    user_intention: UserIntention
    context: Optional[NegotiationContext] = None # Required for start, optional for continue
    user_audio_transcript: Optional[str] = None  # If user spoke something specific

class NegotiationResponse(BaseModel):
    """Response to the UI/Voice Layer."""
    audio_text: str = Field(..., description="The text to be spoken by TTS")
    display_text: Optional[str] = Field(None, description="Text to be shown (if user requested scaffold)")
    next_step: NegotiationStep
    should_listen: bool = Field(True, description="Whether to open mic after speaking")
    visual_aids: List[str] = Field(default_factory=list, description="Images or diagrams if available")
