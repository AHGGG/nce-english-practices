import re
import hashlib
from typing import Any, List
from app.models.content_schemas import ContentBundle, ContentSentence, SourceType
from app.services.content_providers.base import BaseContentProvider

class PlainTextProvider(BaseContentProvider):
    """
    Provider for direct text input.
    """
    
    @property
    def source_type(self) -> SourceType:
        return SourceType.PLAIN_TEXT

    def _extract_sentences(self, text: str) -> List[str]:
        text = re.sub(r'\s+', ' ', text)
        raw_sentences = re.split(r'(?<=[.!?])\s+', text)
        return [s.strip() for s in raw_sentences if s.strip()]

    async def fetch(self, text: str, title: str = "Untitled Text", **kwargs: Any) -> ContentBundle:
        """
        Process raw text.
        """
        sentences = self._extract_sentences(text)
        content_sentences = [ContentSentence(text=s) for s in sentences]
        
        # Hash text for ID
        text_hash = hashlib.md5(text.encode('utf-8')).hexdigest()
        
        return ContentBundle(
            id=f"text:{text_hash[:10]}",
            source_type=SourceType.PLAIN_TEXT,
            title=title,
            sentences=content_sentences,
            full_text=text
        )
