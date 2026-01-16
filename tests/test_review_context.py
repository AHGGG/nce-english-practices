import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.api.routers.review import get_review_context
from app.models.orm import ReviewItem
from app.models.content_schemas import (
    ContentBundle,
    ContentBlock,
    BlockType,
    SourceType,
)


@pytest.mark.asyncio
async def test_get_review_context_epub():
    # 1. Mock DB Session
    mock_db = AsyncMock()

    # Mock ReviewItem
    mock_item = ReviewItem(
        id=1,
        source_id="epub:test_book.epub:1",
        sentence_index=1,
        sentence_text="This is the target sentence.",
    )

    # Mock DB execute result
    # db.execute is awaited, so it returns the result object.
    # The result object is synchronous.
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_item
    mock_db.execute.return_value = mock_result

    # 2. Mock ContentService
    mock_bundle = ContentBundle(
        id="epub:test_book.epub:1",
        source_type=SourceType.EPUB,
        title="Chapter 1",
        blocks=[
            ContentBlock(
                type=BlockType.PARAGRAPH,
                text="Prev. Target. Next.",
                sentences=[
                    "This is the previous sentence.",
                    "This is the target sentence.",
                    "This is the next sentence.",
                ],
            )
        ],
        metadata={"filename": "test_book.epub"},
    )

    with patch(
        "app.services.content_service.content_service.get_content",
        new_callable=AsyncMock,
    ) as mock_get_content:
        mock_get_content.return_value = mock_bundle

        # 3. Call the function
        response = await get_review_context(item_id=1, db=mock_db)

        # 4. Assertions
        assert response.target_sentence == "This is the target sentence."
        assert response.previous_sentence == "This is the previous sentence."
        assert response.next_sentence == "This is the next sentence."
        assert response.source_title == "test_book.epub"
        assert response.chapter_title == "Chapter 1"


@pytest.mark.asyncio
async def test_get_review_context_not_found():
    mock_db = AsyncMock()

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc:
        await get_review_context(item_id=999, db=mock_db)
    assert exc.value.status_code == 404
