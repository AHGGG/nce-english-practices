"""
Tests for Context Service and Context Router.
"""
import pytest
from unittest.mock import patch, MagicMock
from app.services.context_service import ContextService
from app.models.context_schemas import ContextType, LearningStatus


class TestContextService:
    """Unit tests for ContextService."""
    
    def test_extract_examples_from_html_with_example_class(self):
        """Test extraction from HTML with .example class."""
        service = ContextService()
        html = '''
        <div class="entry">
            <span class="example">The chef let the soup simmer for an hour.</span>
            <span class="example">Don't boil it, just let it simmer.</span>
        </div>
        '''
        examples = service._extract_examples_from_html(html, "TestDict")
        
        assert len(examples) == 2
        assert "simmer for an hour" in examples[0]
        assert "just let it simmer" in examples[1]
    
    def test_extract_examples_from_html_with_exa_class(self):
        """Test extraction from HTML with .exa class (LDOCE style)."""
        service = ContextService()
        html = '''
        <div>
            <span class="exa">She simmered the vegetables in butter.</span>
        </div>
        '''
        examples = service._extract_examples_from_html(html, "LDOCE")
        
        assert len(examples) == 1
        assert "simmered the vegetables" in examples[0]
    
    def test_extract_examples_filters_short_text(self):
        """Test that very short texts are filtered out."""
        service = ContextService()
        html = '''
        <div>
            <span class="example">Too short</span>
            <span class="example">This is a proper example sentence that should be included.</span>
        </div>
        '''
        examples = service._extract_examples_from_html(html, "TestDict")
        
        assert len(examples) == 1
        assert "proper example sentence" in examples[0]
    
    def test_extract_examples_deduplication(self):
        """Test that duplicate examples are not included."""
        service = ContextService()
        html = '''
        <div>
            <span class="example">The same example appears here.</span>
            <span class="example">The same example appears here.</span>
        </div>
        '''
        examples = service._extract_examples_from_html(html, "TestDict")
        
        assert len(examples) == 1


@pytest.mark.asyncio
class TestContextServiceAsync:
    """Async tests for ContextService."""
    
    async def test_extract_from_dictionary(self):
        """Test dictionary extraction integration."""
        service = ContextService()
        
        # Mock dict_manager.lookup
        with patch.object(service, '_extract_examples_from_html') as mock_extract:
            mock_extract.return_value = ["Example sentence one.", "Example sentence two."]
            
            with patch('app.services.context_service.dict_manager') as mock_dict:
                mock_dict.lookup.return_value = [
                    {'dictionary': 'Collins', 'definition': '<html>...</html>'}
                ]
                
                contexts = await service.extract_from_dictionary("simmer")
                
                assert len(contexts) == 2
                assert all(c.word == "simmer" for c in contexts)
                assert all(c.context_type == ContextType.DICTIONARY_EXAMPLE for c in contexts)
                assert all(c.source == "Collins" for c in contexts)

    async def test_generate_tts(self):
        """Test TTS generation integration."""
        service = ContextService()
        
        with patch('app.services.context_service.tts_service') as mock_tts:
            # Use AsyncMock for async function
            from unittest.mock import AsyncMock
            mock_tts.generate_audio = AsyncMock(return_value=b"fake_audio_bytes")
            
            audio = await service.generate_tts("Hello world")
            
            assert audio == b"fake_audio_bytes"
            mock_tts.generate_audio.assert_called_once_with("Hello world", None)


# Run with: uv run pytest tests/test_context_service.py -v
