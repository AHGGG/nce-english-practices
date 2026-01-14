
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.image_generation import ImageGenerationService
from app.models.orm import GeneratedImage

@pytest.fixture
def mock_image_service():
    return ImageGenerationService()

@pytest.fixture
def mock_db_session():
    return AsyncMock(spec=AsyncSession)

@pytest.mark.asyncio
async def test_compute_hash(mock_image_service):
    text = "Hello World"
    # Just verify it returns consistent hash
    hash1 = mock_image_service._compute_hash(text)
    hash2 = mock_image_service._compute_hash(text)
    assert hash1 == hash2
    assert len(hash1) == 64  # SHA256 hex digest length

@pytest.mark.asyncio
async def test_get_context_hash(mock_image_service):
    text = "Test Sentence"
    ctx_hash = mock_image_service.get_context_hash(text)
    assert len(ctx_hash) == 16
    assert ctx_hash == mock_image_service._compute_hash(text)[:16]

@pytest.mark.asyncio
async def test_get_cached_image(mock_image_service, mock_db_session):
    # Mock DB result
    mock_result = MagicMock()
    mock_image = GeneratedImage(
        word="test", 
        context_hash="abc", 
        sentence="s", 
        image_prompt="p", 
        image_data=b"fake_data"
    )
    mock_result.scalar_one_or_none.return_value = mock_image
    mock_db_session.execute.return_value = mock_result
    
    result = await mock_image_service.get_cached("test", "abc", mock_db_session)
    assert result == mock_image
    assert result.image_data == b"fake_data"

@pytest.mark.asyncio
async def test_get_or_generate_image_cached(mock_image_service, mock_db_session):
    # Setup cache hit
    mock_image = GeneratedImage(image_data=b"cached_data")
    
    with patch.object(mock_image_service, 'get_cached', return_value=mock_image):
        result = await mock_image_service.get_or_generate_image(
            "word", "sentence", "prompt", mock_db_session
        )
        assert result == b"cached_data"
        # Should NOT call API or DB add
        mock_db_session.add.assert_not_called()

@pytest.mark.asyncio
async def test_get_or_generate_image_new(mock_image_service, mock_db_session):
    # Setup cache miss
    with patch.object(mock_image_service, 'get_cached', return_value=None), \
         patch.object(mock_image_service, '_call_zhipu_api', return_value=b"new_data"):
        
        result = await mock_image_service.get_or_generate_image(
            "word", "sentence", "prompt", mock_db_session
        )
        
        assert result == b"new_data"
        mock_db_session.add.assert_called_once()
        mock_db_session.commit.assert_called_once()
