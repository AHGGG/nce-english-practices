import pytest
from unittest.mock import patch, MagicMock
from pathlib import Path


@pytest.mark.asyncio
async def test_list_epub_books(client):
    """Test the /api/content/catalog/epub endpoint with mocked file system."""

    # Mock Path object and glob
    mock_epub_path = MagicMock(spec=Path)
    mock_epub_path.name = "test_book.epub"
    mock_epub_path.stem = "test_book"
    mock_epub_path.stat.return_value.st_size = 1024 * 1024  # 1MB

    with (
        patch(
            "app.services.content_providers.epub_provider.EpubProvider.EPUB_DIR"
        ) as mock_dir,
        patch(
            "app.services.content_providers.epub_provider._compute_book_id",
            return_value="book_test_id",
        ),
    ):
        mock_dir.exists.return_value = True
        mock_dir.glob.return_value = [mock_epub_path]

        response = await client.get("/api/content/catalog/epub")

        assert response.status_code == 200
        data = response.json()

        assert "items" in data
        assert len(data["items"]) == 1
        book = data["items"][0]
        assert "id" in book
        assert book["filename"] == "test_book.epub"
        assert book["title"] == "Test Book"
        assert book["size_bytes"] == 1048576


@pytest.mark.asyncio
async def test_list_epub_books_empty(client):
    """Test the endpoint when no books exist."""
    with patch(
        "app.services.content_providers.epub_provider.EpubProvider.EPUB_DIR"
    ) as mock_dir:
        mock_dir.exists.return_value = True
        mock_dir.glob.return_value = []

        response = await client.get("/api/content/catalog/epub")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
