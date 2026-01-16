import pytest
from app.services.proficiency_service import proficiency_service
from app.models.orm import WordProficiency, WordBook, WordBookEntry
from sqlalchemy import delete, select


@pytest.mark.asyncio
async def test_calibration(db_session):
    # Cleanup
    await db_session.execute(delete(WordProficiency))
    await db_session.execute(delete(WordBookEntry))
    await db_session.execute(delete(WordBook))

    # Create Book
    book = WordBook(code="test_coca", name="COCA Test")
    db_session.add(book)
    await db_session.flush()
    db_session.add(WordBookEntry(book_id=book.id, word="apple", sequence=1))
    await db_session.commit()

    # Session Data
    session_data = [
        # Sentence 1: Clear -> "apple" should be mastered
        {"sentence_text": "I ate an apple.", "status": "clear", "confused_words": []},
        # Sentence 2: Confused (Syntax) -> No words, should trigger syntax diagnosis
        {
            "sentence_text": "Had I known, I would have come.",
            "status": "confused",
            "confused_words": [],
        },
    ]

    # We mock LLM service or just let it fail gracefully/mock via patch
    # For integration test, we might hit real LLM if env set, or it fails and returns error in report.
    # We just want to check the flow.

    result = await proficiency_service.analyze_calibration(
        user_id="default_user", session_data=session_data, db_session=db_session
    )

    # Debug: Check if words were identified
    print(f"Calibration Result: {result}")
    assert result["words_mastered"] > 0, (
        "No words identified for mastery in clear sentence!"
    )

    # Verify "apple" is mastered using the SAME session (uncommitted transaction)
    stmt = select(WordProficiency).where(
        WordProficiency.user_id == "default_user", WordProficiency.word == "apple"
    )
    result_db = await db_session.execute(stmt)
    stats = result_db.scalar_one_or_none()

    assert stats is not None
    assert stats.status == "mastered"

    # Verify result structure
    assert result["processed_sentences"] == 2
    assert result["words_mastered"] >= 1  # apple + others in "I ate"

    # Verify syntax diagnosis was attempted (result key exists)
    assert "syntax_diagnosis" in result
