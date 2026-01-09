import pytest
from app.services.proficiency_service import proficiency_service
from app.models.orm import WordBook, WordBookEntry, WordProficiency
from sqlalchemy import delete

@pytest.mark.asyncio
async def test_sweep_inference(db_session):
    # Cleanup
    await db_session.execute(delete(WordProficiency))
    await db_session.execute(delete(WordBookEntry))
    await db_session.execute(delete(WordBook))
    
    # Create Book with Ranks
    book = WordBook(code="test_coca", name="COCA Test")
    db_session.add(book)
    await db_session.flush()
    
    entries = []
    # Band 0-1000: User knows everything (simulated)
    for i in range(30):
        entries.append(WordBookEntry(book_id=book.id, word=f"easy{i}", sequence=i + 10))
    
    # Band 5000-6000: User struggles
    for i in range(10):
        entries.append(WordBookEntry(book_id=book.id, word=f"hard{i}", sequence=i + 5000))
        
    db_session.add_all(entries)
    await db_session.commit()
    
    # Simulate Sweep
    # User read article, swept "easy0"..."easy29" (implicit known)
    # User clicked "hard0"..."hard4" (explicit unknown)
    
    swept_words = [f"easy{i}" for i in range(30)]
    inspected_words = [f"hard{i}" for i in range(5)]
    
    result = await proficiency_service.process_sweep(
        user_id="default_user",
        swept_words=swept_words,
        inspected_words=inspected_words,
        db_session=db_session
    )
    
    # Validation
    # 1. Check recommendation
    rec = result["recommendation"]
    assert rec is not None
    assert 0 in rec["bands"] # Should recommend Band 0 (0-1000)
    assert 5000 not in rec["bands"] # Should NOT recommend Band 5000
    
    # 2. Check DB status using the test session directly
    # (get_word_stats uses its own session and can't see uncommitted data)
    from sqlalchemy import select
    stmt = select(WordProficiency).where(
        WordProficiency.user_id == "default_user",
        WordProficiency.word == "easy0"
    )
    res = await db_session.execute(stmt)
    stats = res.scalar_one_or_none()
    assert stats is not None, "easy0 proficiency record not found"
    assert stats.status == "mastered"
