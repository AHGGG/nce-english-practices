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

    def get_capabilities(self) -> dict[str, bool]:
        return {
            "has_catalog": False,
            "has_units": False,
            "has_text": True,
            "has_segments": True,
            "has_audio": False,
            "has_images": False,
            "has_timeline": False,
            "has_region_alignment": False,
            "supports_tts_fallback": True,
            "supports_highlight": True,
            "supports_sentence_study": True,
        }

    def _extract_sentences(self, text: str) -> List[str]:
        text = re.sub(r"\s+", " ", text)
        raw_sentences = re.split(r"(?<=[.!?])\s+", text)
        return [s.strip() for s in raw_sentences if s.strip()]

    async def fetch(self, **kwargs: Any) -> ContentBundle:
        """
        Process raw text.
        """
        text = kwargs.get("text", "")
        title = kwargs.get("title", "Untitled Text")

        sentences = self._extract_sentences(text)
        content_sentences = [ContentSentence(text=s) for s in sentences]

        # Hash text for ID
        text_hash = hashlib.md5(text.encode("utf-8")).hexdigest()

        return ContentBundle(
            id=f"text:{text_hash[:10]}",
            source_type=SourceType.PLAIN_TEXT,
            title=title,
            sentences=content_sentences,
            full_text=text,
            metadata={"capabilities": self.get_capabilities()},
        )
