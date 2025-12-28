import pytest
from app.models.orm import WordBook, WordBookEntry, WordProficiency
from sqlalchemy import delete

@pytest.fixture(scope="function")
async def setup_book_data(db_session):
    # Cleanup
    await db_session.execute(delete(WordProficiency))
    await db_session.execute(delete(WordBookEntry))
    await db_session.execute(delete(WordBook))
    
    # Create Book
    book = WordBook(code="test_api_book", name="Test API Book")
    db_session.add(book)
    await db_session.flush()
    
    # Create Entries
    entries = [
        WordBookEntry(book_id=book.id, word="hello", sequence=1),
        WordBookEntry(book_id=book.id, word="world", sequence=2),
    ]
    db_session.add_all(entries)
    await db_session.commit()
    yield

@pytest.mark.asyncio
async def test_get_books(client, setup_book_data):
    response = await client.get("/api/books/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any(b["code"] == "test_api_book" for b in data)

@pytest.mark.asyncio
async def test_get_book_detail(client, setup_book_data):
    response = await client.get("/api/books/test_api_book")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == "test_api_book"
    assert data["name"] == "Test API Book"

@pytest.mark.asyncio
async def test_get_next_word(client, setup_book_data):
    response = await client.get("/api/books/test_api_book/next")
    assert response.status_code == 200
    data = response.json()
    # Now uses random selection, so we just check it's one of the valid words
    assert data["word"] in ["hello", "world"]

@pytest.mark.asyncio
async def test_get_next_word_not_found(client, setup_book_data):
    response = await client.get("/api/books/unknown_book/next")
    assert response.status_code == 404
