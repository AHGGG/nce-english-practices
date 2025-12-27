import pytest
import pytest_asyncio
from app.services.word_list_service import word_list_service
from app.models.orm import WordBook, WordBookEntry, WordProficiency
from sqlalchemy import delete

@pytest_asyncio.fixture(scope="function")
async def setup_word_data(db_session):
    """
    Setup test data. 
    Depends on db_session to ensure tables are created (via db_engine -> Base.metadata.create_all).
    """
    # Cleanup
    await db_session.execute(delete(WordProficiency))
    await db_session.execute(delete(WordBookEntry))
    await db_session.execute(delete(WordBook))
    
    # Create Book
    book = WordBook(code="test_book", name="Test Book")
    db_session.add(book)
    await db_session.flush()
    
    # Create Entries
    entries = [
        WordBookEntry(book_id=book.id, word="apple", sequence=1),
        WordBookEntry(book_id=book.id, word="banana", sequence=2),
        WordBookEntry(book_id=book.id, word="cherry", sequence=3),
    ]
    db_session.add_all(entries)
    
    # Create Proficiency (Mastered 'apple')
    prof = WordProficiency(user_id="default_user", word="apple", status="mastered")
    db_session.add(prof)
    
    await db_session.commit()
    yield

@pytest.mark.asyncio
async def test_get_next_word_skips_mastered(setup_word_data, db_session):
    # Should skip 'apple' (mastered) and return 'banana' (sequence 2)
    # The service creates its own session, but since we use file-based SQLite, it sees the data.
    word = await word_list_service.get_next_word("test_book", "default_user", db_session=db_session)
    assert word == "banana"

@pytest.mark.asyncio
async def test_get_next_word_sequence(setup_word_data, db_session):
    # Mark banana as mastered too
    prof = WordProficiency(user_id="default_user", word="banana", status="mastered")
    db_session.add(prof)
    await db_session.commit()
    
    # Should return 'cherry'
    word = await word_list_service.get_next_word("test_book", "default_user", db_session=db_session)
    assert word == "cherry"

@pytest.mark.asyncio
async def test_get_next_word_empty_book(db_engine):
    # Require db_engine to ensure tables exist even if empty
    word = await word_list_service.get_next_word("non_existent_book", "default_user")
    assert word is None

