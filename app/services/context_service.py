"""
Context Service - Core service for managing multi-modal learning contexts.
"""
import re
from typing import List, Optional, Dict, Any
from datetime import datetime
from bs4 import BeautifulSoup
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.context_schemas import (
    ContextType,
    LearningStatus,
    ContextResource as ContextResourceSchema,
    ContextResourceCreate,
    ContextLearningRecord as LearningRecordSchema,
    WordContextProgress,
)
from app.models.orm import ContextResource, ContextLearningRecord
from app.services.dictionary import dict_manager
from app.services.tts import tts_service
from app.core.db import AsyncSessionLocal


class ContextService:
    """
    Core service for managing context resources and learning progress.
    """

    # --- Dictionary Extraction ---
    
    def _clean_example_text(self, text: str) -> str:
        """
        Clean up example sentence text:
        - Remove excessive whitespace
        - Remove common prefixes/suffixes
        - Normalize punctuation
        """
        if not text:
            return ""
        
        # Remove leading/trailing whitespace
        text = text.strip()
        
        # Normalize whitespace (multiple spaces, newlines -> single space)
        text = re.sub(r'\s+', ' ', text)
        
        # Remove common dictionary artifacts
        # e.g., "▶", "•", "◆", bullet points
        text = re.sub(r'^[▶•◆►▪▸★☆→‣⁕※]\s*', '', text)
        
        # Remove leading numbers/letters like "1.", "a)", "(1)"
        text = re.sub(r'^[\(\[]?\d+[\)\]\.]?\s*', '', text)
        text = re.sub(r'^[\(\[]?[a-z][\)\]\.]?\s*', '', text, flags=re.IGNORECASE)
        
        # Remove phonetic transcriptions in brackets [...]
        text = re.sub(r'\[[^\]]*\]', '', text)
        
        # Remove trailing source references like "(LDOCE)", "[Collins]"
        text = re.sub(r'\s*[\(\[]?[A-Z]{2,}[\)\]]?\s*$', '', text)
        
        # Final cleanup
        text = text.strip()
        
        # Ensure sentence ends with proper punctuation
        if text and text[-1] not in '.!?。':
            # Don't add period if it looks incomplete
            if len(text) > 20 and ' ' in text:
                text += '.'
        
        return text
    
    def _is_valid_example(self, text: str, word: str) -> bool:
        """
        Validate if text is a proper example sentence:
        - Contains the target word (or its forms)
        - Has reasonable length
        - Looks like a sentence (has verb-like structures)
        """
        if not text:
            return False
        
        text_lower = text.lower()
        word_lower = word.lower()
        
        # Length check: too short or too long
        if len(text) < 15 or len(text) > 400:
            return False
        
        # Must have at least 3 words
        words = text.split()
        if len(words) < 3:
            return False
        
        # Check if it contains the target word or common forms
        word_patterns = [
            word_lower,
            word_lower + 's',      # plural/third person
            word_lower + 'ed',     # past tense
            word_lower + 'ing',    # present participle
            word_lower + 'd',      # past tense variant
            word_lower + 'es',     # plural variant
        ]
        
        contains_word = any(p in text_lower for p in word_patterns)
        
        # Allow examples without the word if they're clearly sentences
        if not contains_word:
            # Must have sentence-like structure (capital start, period end)
            if not (text[0].isupper() and text[-1] in '.!?'):
                return False
        
        # Filter out entries that look like definitions or notes
        skip_patterns = [
            r'^(syn|ant|see|cf|compare|also|usage|note|grammar)[:\s]',
            r'^(definition|meaning|example)[:\s]',
            r'^\d+\s*\.',  # numbered lists
            r'^[A-Z]{2,}\s',  # abbreviations at start
        ]
        
        for pattern in skip_patterns:
            if re.match(pattern, text, re.IGNORECASE):
                return False
        
        return True
    
    def _extract_examples_from_html(self, html: str, dict_name: str) -> List[str]:
        """
        Extract example sentences from dictionary HTML.
        Uses heuristics based on common dictionary HTML structures.
        """
        soup = BeautifulSoup(html, 'html.parser')
        raw_examples = []
        
        # Priority-ordered selectors for example sentences
        # More specific selectors first for better accuracy
        priority_selectors = [
            # High confidence: explicit example classes
            ('span.x', 'LDOCE style'),
            ('span.EXAMPLE', 'Collins style'),
            ('.exa', 'LDOCE alt'),
            ('.example', 'Generic'),
            
            # Medium confidence
            ('.propCodeX', 'Collins prop'),
            ('.sentence', 'Sentence class'),
            ('div.example', 'Div example'),
            
            # Lower confidence
            ('.eg', 'EG class'),
            ('.EXA', 'EXA uppercase'),
        ]
        
        for selector, _ in priority_selectors:
            elements = soup.select(selector)
            for el in elements:
                # Get text, handling nested elements
                text = el.get_text(separator=' ', strip=True)
                if text:
                    raw_examples.append(text)
        
        # Fallback: Look for italic text that looks like examples
        if not raw_examples:
            for italic in soup.find_all(['i', 'em']):
                # Avoid italics inside other elements we've already processed
                parent_classes = ' '.join(italic.parent.get('class', []))
                if 'definition' not in parent_classes.lower():
                    text = italic.get_text(strip=True)
                    if text and len(text) > 15:
                        raw_examples.append(text)
        
        # Process and deduplicate
        cleaned_examples = []
        seen = set()
        
        for raw in raw_examples:
            cleaned = self._clean_example_text(raw)
            
            # Skip empty or too short
            if not cleaned or len(cleaned) < 15:
                continue
            
            # Deduplicate (case-insensitive)
            normalized = cleaned.lower().strip('.')
            if normalized in seen:
                continue
            seen.add(normalized)
            
            cleaned_examples.append(cleaned)
        
        # Limit results
        return cleaned_examples[:8]  # Limit to 8 best examples per dictionary

    async def extract_from_dictionary(self, word: str) -> List[ContextResourceSchema]:
        """
        Extract example sentences from dictionaries and return as context resources.
        Does NOT save to database - use save_contexts() for that.
        """
        results = dict_manager.lookup(word)
        contexts = []
        
        for result in results:
            dict_name = result.get('dictionary', 'Unknown')
            html_content = result.get('definition', '')
            
            examples = self._extract_examples_from_html(html_content, dict_name)
            
            for example in examples:
                ctx = ContextResourceSchema(
                    id=0,  # Not saved yet
                    word=word,
                    sense_label=None,  # Could be extracted from HTML later
                    context_type=ContextType.DICTIONARY_EXAMPLE,
                    text_content=example,
                    source=dict_name,
                    story_id=None,
                    audio_url=None,
                )
                contexts.append(ctx)
        
        return contexts

    async def save_contexts(
        self, 
        contexts: List[ContextResourceSchema], 
        db: AsyncSession
    ) -> List[ContextResourceSchema]:
        """
        Save context resources to database.
        Returns the saved contexts with IDs.
        """
        saved = []
        for ctx in contexts:
            # Check for duplicates
            existing = await db.execute(
                select(ContextResource).where(
                    ContextResource.word == ctx.word,
                    ContextResource.text_content == ctx.text_content,
                    ContextResource.source == ctx.source,
                )
            )
            if existing.scalar_one_or_none():
                continue  # Skip duplicates
            
            orm_obj = ContextResource(
                word=ctx.word,
                sense_label=ctx.sense_label,
                context_type=ctx.context_type.value,
                text_content=ctx.text_content,
                source=ctx.source,
                story_id=ctx.story_id,
                audio_url=ctx.audio_url,
            )
            db.add(orm_obj)
            await db.flush()
            
            saved.append(ContextResourceSchema(
                id=orm_obj.id,
                word=orm_obj.word,
                sense_label=orm_obj.sense_label,
                context_type=ContextType(orm_obj.context_type),
                text_content=orm_obj.text_content,
                source=orm_obj.source,
                story_id=orm_obj.story_id,
                audio_url=orm_obj.audio_url,
                created_at=orm_obj.created_at,
            ))
        
        await db.commit()
        return saved

    # --- TTS Generation ---

    async def generate_tts(self, text: str, voice: Optional[str] = None) -> bytes:
        """
        Generate TTS audio for the given text.
        Returns MP3 audio bytes.
        """
        return await tts_service.generate_audio(text, voice)

    # --- Context Retrieval ---

    async def get_contexts_for_word(
        self, 
        word: str, 
        db: AsyncSession,
        context_type: Optional[ContextType] = None
    ) -> List[ContextResourceSchema]:
        """
        Get all context resources for a word from database.
        """
        query = select(ContextResource).where(ContextResource.word == word)
        
        if context_type:
            query = query.where(ContextResource.context_type == context_type.value)
        
        result = await db.execute(query)
        rows = result.scalars().all()
        
        return [
            ContextResourceSchema(
                id=row.id,
                word=row.word,
                sense_label=row.sense_label,
                context_type=ContextType(row.context_type),
                text_content=row.text_content,
                source=row.source,
                story_id=row.story_id,
                audio_url=row.audio_url,
                created_at=row.created_at,
            )
            for row in rows
        ]

    async def get_context_by_id(
        self, 
        context_id: int, 
        db: AsyncSession
    ) -> Optional[ContextResourceSchema]:
        """
        Get a single context resource by ID.
        """
        result = await db.execute(
            select(ContextResource).where(ContextResource.id == context_id)
        )
        row = result.scalar_one_or_none()
        
        if not row:
            return None
        
        return ContextResourceSchema(
            id=row.id,
            word=row.word,
            sense_label=row.sense_label,
            context_type=ContextType(row.context_type),
            text_content=row.text_content,
            source=row.source,
            story_id=row.story_id,
            audio_url=row.audio_url,
            created_at=row.created_at,
        )

    # --- Learning Progress ---

    async def update_learning_status(
        self,
        context_id: int,
        user_id: str,
        status: LearningStatus,
        db: AsyncSession,
    ) -> LearningRecordSchema:
        """
        Update or create learning status for a context.
        """
        # Find existing record
        result = await db.execute(
            select(ContextLearningRecord).where(
                ContextLearningRecord.context_id == context_id,
                ContextLearningRecord.user_id == user_id,
            )
        )
        record = result.scalar_one_or_none()
        
        if record:
            record.status = status.value
            record.last_practiced_at = datetime.now()
            record.practice_count += 1
        else:
            record = ContextLearningRecord(
                context_id=context_id,
                user_id=user_id,
                status=status.value,
                last_practiced_at=datetime.now(),
                practice_count=1,
            )
            db.add(record)
        
        await db.commit()
        await db.refresh(record)
        
        return LearningRecordSchema(
            id=record.id,
            context_id=record.context_id,
            user_id=record.user_id,
            status=LearningStatus(record.status),
            last_practiced_at=record.last_practiced_at,
            practice_count=record.practice_count,
        )

    async def get_learning_progress(
        self,
        word: str,
        user_id: str,
        db: AsyncSession,
    ) -> WordContextProgress:
        """
        Get learning progress statistics for a word.
        """
        # Get all contexts for the word
        contexts = await self.get_contexts_for_word(word, db)
        context_ids = [c.id for c in contexts]
        
        if not context_ids:
            return WordContextProgress(word=word, total=0)
        
        # Get learning records
        result = await db.execute(
            select(ContextLearningRecord).where(
                ContextLearningRecord.context_id.in_(context_ids),
                ContextLearningRecord.user_id == user_id,
            )
        )
        records = {r.context_id: r for r in result.scalars().all()}
        
        # Count statuses
        stats = {"mastered": 0, "learning": 0, "unseen": 0}
        for ctx in contexts:
            record = records.get(ctx.id)
            if record:
                status = record.status
            else:
                status = "unseen"
            stats[status] = stats.get(status, 0) + 1
        
        return WordContextProgress(
            word=word,
            total=len(contexts),
            mastered=stats.get("mastered", 0),
            learning=stats.get("learning", 0),
            unseen=stats.get("unseen", 0),
            contexts=contexts,
        )


# Singleton instance
context_service = ContextService()
