"""
Proficiency Service - Tracks word-level proficiency for the Voice CI Interface.

Records HUH? and CONTINUE events to build a user's difficulty profile.
"""

from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import AsyncSessionLocal
from app.models.orm import WordProficiency


class ProficiencyService:
    """
    Manages word proficiency tracking for the Voice Learning interface.
    """
    
    async def record_interaction(
        self, 
        word: str, 
        interaction_type: str,  # "huh" or "continue"
        user_id: str = "default_user"
    ) -> WordProficiency:
        """
        Record a user interaction with a word.
        
        Args:
            word: The word that was encountered
            interaction_type: "huh" if user clicked HUH?, "continue" if user understood
            user_id: User identifier (default for single-user app)
            
        Returns:
            Updated WordProficiency record
        """
        async with AsyncSessionLocal() as db:
            try:
                # Find or create proficiency record
                stmt = select(WordProficiency).where(
                    WordProficiency.user_id == user_id,
                    WordProficiency.word == word.lower()
                )
                result = await db.execute(stmt)
                record = result.scalar_one_or_none()
                
                if not record:
                    record = WordProficiency(
                        user_id=user_id,
                        word=word.lower(),
                        exposure_count=0,
                        huh_count=0,
                        continue_count=0
                    )
                    db.add(record)
                
                # Update counts
                record.exposure_count += 1
                
                if interaction_type == "huh":
                    record.huh_count += 1
                elif interaction_type == "continue":
                    record.continue_count += 1
                
                # Recalculate difficulty score (huh_rate)
                if record.exposure_count > 0:
                    record.difficulty_score = record.huh_count / record.exposure_count
                
                # Update status based on metrics
                record.status = self._calculate_status(record)
                
                await db.commit()
                await db.refresh(record)
                
                return record
                
            except Exception as e:
                await db.rollback()
                raise e
    
    def _calculate_status(self, record: WordProficiency) -> str:
        """
        Determine learning status based on interaction history.
        
        Status progression:
        - new: exposure_count < 3
        - learning: difficulty_score > 0.3 or exposure_count < 5
        - mastered: difficulty_score <= 0.3 and exposure_count >= 5
        """
        if record.exposure_count < 3:
            return "new"
        elif record.difficulty_score > 0.3 or record.exposure_count < 5:
            return "learning"
        else:
            return "mastered"
    
    async def get_difficult_words(
        self, 
        user_id: str = "default_user",
        limit: int = 20
    ) -> List[WordProficiency]:
        """
        Get the user's most difficult words (highest HUH? rate).
        
        Returns:
            List of WordProficiency records sorted by difficulty
        """
        async with AsyncSessionLocal() as db:
            stmt = (
                select(WordProficiency)
                .where(WordProficiency.user_id == user_id)
                .where(WordProficiency.huh_count > 0)
                .order_by(WordProficiency.difficulty_score.desc())
                .limit(limit)
            )
            result = await db.execute(stmt)
            return list(result.scalars().all())
    
    async def get_word_stats(
        self, 
        word: str, 
        user_id: str = "default_user"
    ) -> Optional[WordProficiency]:
        """
        Get proficiency stats for a specific word.
        """
        async with AsyncSessionLocal() as db:
            stmt = select(WordProficiency).where(
                WordProficiency.user_id == user_id,
                WordProficiency.word == word.lower()
            )
            result = await db.execute(stmt)
            return result.scalar_one_or_none()


# Singleton
proficiency_service = ProficiencyService()
