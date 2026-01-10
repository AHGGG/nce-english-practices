import pytest
from app.services.word_list_service import word_list_service
from app.models.orm import WordBook, WordBookEntry, WordProficiency
from sqlalchemy import delete


@pytest.mark.asyncio
async def test_identify_words_skips_mastered(db_session):
    # Cleanup
    await db_session.execute(delete(WordProficiency))
    await db_session.execute(delete(WordBookEntry))
    await db_session.execute(delete(WordBook))

    # Create Book
    book = WordBook(code="test_book_id", name="Test Book Ident")
    db_session.add(book)
    await db_session.flush()

    # Create Entries
    entries = [
        WordBookEntry(book_id=book.id, word="apple", sequence=1),
        WordBookEntry(book_id=book.id, word="banana", sequence=2),
        WordBookEntry(book_id=book.id, word="cherry", sequence=3),
    ]
    db_session.add_all(entries)

    # Master 'apple'
    prof = WordProficiency(user_id="default_user", word="apple", status="mastered")
    db_session.add(prof)

    await db_session.commit()

    # Identify words in text "apple banana cherry"
    text = "I like an apple and a banana and a cherry."

    # Should exclude apple
    words = await word_list_service.identify_words_in_text(
        text, "test_book_id", user_id="default_user", db_session=db_session
    )

    assert "banana" in words
    assert "cherry" in words
    assert "apple" not in words
    assert len(words) == 2
