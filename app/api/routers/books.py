from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.services.word_list_service import word_list_service
from app.api.deps.auth import get_current_user_id

router = APIRouter(prefix="/books", tags=["books"])


class WordBookResponse(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str]

    model_config = ConfigDict(from_attributes=True)


@router.get("/", response_model=List[WordBookResponse])
async def get_books(db: AsyncSession = Depends(get_db)):
    """
    Get list of available word books.
    """
    return await word_list_service.get_books(db_session=db)


@router.get("/{code}", response_model=WordBookResponse)
async def get_book(code: str, db: AsyncSession = Depends(get_db)):
    """
    Get details of a specific word book.
    """
    book = await word_list_service.get_book_by_code(code, db_session=db)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@router.get("/{code}/next")
async def get_next_word(
    code: str,
    user_id: str = Depends(get_current_user_id),
    start: Optional[int] = None,
    end: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Get the next recommended word from the book.
    Optional query params:
    - start: min sequence (inclusive)
    - end: max sequence (inclusive)
    """
    word = await word_list_service.get_next_word(
        code, user_id=user_id, db_session=db, min_sequence=start, max_sequence=end
    )
    if not word:
        # Check if book exists
        book = await word_list_service.get_book_by_code(code, db_session=db)
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")

        # Book exists but no words? Or all mastered?
        return {
            "word": None,
            "message": "No more words to learn in this book or range.",
        }

    return {"word": word}
