from typing import List, Optional
import random
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import AsyncSessionLocal
from app.models.orm import WordBook, WordBookEntry, WordProficiency

class WordListService:
    def __init__(self):
        pass

    async def get_books(self, db_session: Optional[AsyncSession] = None) -> List[WordBook]:
        """
        Get all available word books.
        """
        if db_session:
            result = await db_session.execute(select(WordBook))
            return result.scalars().all()
            
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(WordBook))
            return result.scalars().all()

    async def get_book_by_code(self, code: str, db_session: Optional[AsyncSession] = None) -> Optional[WordBook]:
        """
        Get a word book by its code.
        """
        stmt = select(WordBook).where(WordBook.code == code)
        
        if db_session:
            result = await db_session.execute(stmt)
            return result.scalars().first()

        async with AsyncSessionLocal() as session:
            result = await session.execute(stmt)
            return result.scalars().first()

    async def get_next_word(
        self, 
        book_code: str, 
        user_id: str = "default_user", 
        db_session: Optional[AsyncSession] = None,
        min_sequence: Optional[int] = None,
        max_sequence: Optional[int] = None,
        exclude_word: Optional[str] = None
    ) -> Optional[str]:
        """
        Get the next recommended word from a book for a user.
        Prioritizes words that are NOT in WordProficiency or status != 'mastered'.
        Uses random selection for better variety.
        
        Args:
            exclude_word: Optional word to exclude from results (for SKIP functionality)
        """
        if db_session:
            return await self._get_next_word_logic(db_session, book_code, user_id, min_sequence, max_sequence, exclude_word)

        async with AsyncSessionLocal() as session:
            return await self._get_next_word_logic(session, book_code, user_id, min_sequence, max_sequence, exclude_word)

    async def _get_next_word_logic(
        self, 
        session: AsyncSession, 
        book_code: str, 
        user_id: str,
        min_sequence: Optional[int] = None,
        max_sequence: Optional[int] = None,
        exclude_word: Optional[str] = None
    ) -> Optional[str]:
        # 1. Get the book ID
        book_res = await session.execute(select(WordBook).where(WordBook.code == book_code))
        book = book_res.scalars().first()
        if not book:
            return None

        # 2. Find words that are NOT mastered
        # Using LEFT JOIN to find words with no proficiency record OR status != 'mastered'
        
        # Subquery for mastered words by this user
        mastered_subquery = (
            select(WordProficiency.word)
            .where(
                and_(
                    WordProficiency.user_id == user_id,
                    WordProficiency.status == "mastered"
                )
            )
        )

        # Query Entries excluding mastered words
        filters = [
            WordBookEntry.book_id == book.id,
            WordBookEntry.word.not_in(mastered_subquery)
        ]

        if min_sequence is not None:
            filters.append(WordBookEntry.sequence >= min_sequence)
        
        if max_sequence is not None:
            filters.append(WordBookEntry.sequence <= max_sequence)
        
        # Exclude current word if specified (for SKIP functionality)
        if exclude_word:
            filters.append(WordBookEntry.word != exclude_word)

        # Use random order for variety (instead of always picking lowest sequence)
        stmt = (
            select(WordBookEntry.word)
            .where(and_(*filters))
            .order_by(func.random())
            .limit(1)
        )

        result = await session.execute(stmt)
        word = result.scalars().first()
        
        return word

word_list_service = WordListService()
