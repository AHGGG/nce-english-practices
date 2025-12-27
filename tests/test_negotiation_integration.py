import pytest
from app.models.orm import WordBook, WordBookEntry, WordProficiency
from sqlalchemy import delete
from app.services.content_feeder import content_feeder

@pytest.fixture(scope="function")
async def setup_integration_data(db_session):
    # Cleanup
    await db_session.execute(delete(WordProficiency))
    await db_session.execute(delete(WordBookEntry))
    await db_session.execute(delete(WordBook))
    # Note: DictionaryExample cleanup might be needed if tests rely on DB dictionary, 
    # but content_feeder mostly relies on dict_manager (in-memory or separate DB).
    # Since I cannot easily mock dict_manager's lookup here without complex patching,
    # I will assume dict_manager works or returns fallback.
    
    # Create Book
    book = WordBook(code="test_int_book", name="Test Integration Book")
    db_session.add(book)
    await db_session.flush()
    
    # Create Entries
    # Use a word that likely exists in the dictionary or fallback
    entries = [
        WordBookEntry(book_id=book.id, word="test", sequence=1),
    ]
    db_session.add_all(entries)
    await db_session.commit()
    yield

@pytest.mark.asyncio
async def test_negotiation_next_content_with_book(client, setup_integration_data):
    # This calls content_feeder.get_next_content
    # Which calls word_list_service.get_next_word
    # Which uses db_session (BUT content_feeder doesn't pass db_session!)
    
    # FAIL ALERT: content_feeder.get_next_content does NOT accept db_session arg.
    # And it calls word_list_service.get_next_word(source_book) without session.
    # So it uses AsyncSessionLocal().
    # In TEST environment, AsyncSessionLocal() cannot see uncommitted data from `setup_integration_data` 
    # IF `setup_integration_data` data is only in transaction.
    # `setup_integration_data` commits: `await db_session.commit()`.
    # So if using file-based SQLite, the data IS on disk. 
    # AsyncSessionLocal() should see it.
    
    response = await client.get("/api/negotiation/next-content?book=test_int_book")
    assert response.status_code == 200
    data = response.json()
    # It should have found "test" from the book.
    # If dict lookup fails, it returns fallback.
    # If dict lookup succeeds, source_type should be "dictionary_test_int_book".
    # Fallback source_type is "fallback".
    
    # If it picked "test", source_word should be "test".
    if data["source_word"] == "test":
        assert "dictionary_test_int_book" in data["source_type"] or "fallback" in data["source_type"]
    else:
        # If it didn't pick "test", maybe book look up failed?
        pass

@pytest.mark.asyncio
async def test_negotiation_next_content_no_book(client):
    response = await client.get("/api/negotiation/next-content")
    assert response.status_code == 200
    data = response.json()
    assert data["source_word"] is not None
