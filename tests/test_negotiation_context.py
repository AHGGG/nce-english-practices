
import pytest
from unittest.mock import MagicMock, AsyncMock
from app.models.negotiation_schemas import NegotiationContext
from app.services.negotiation_service import NegotiationService

@pytest.mark.asyncio
async def test_negotiation_context_injection():
    """Verify that rich context (definition, POS) is injected into the LLM prompt."""
    
    # 1. Setup Mock LLM
    mock_llm = AsyncMock()
    mock_llm.chat_complete.return_value = "Mock explanation."
    
    # 2. Setup Service with mocked LLM
    service = NegotiationService()
    # We need to patch the global llm_service it uses, or inject it if possible.
    # checking source, it imports llm_service globally. 
    # Let's patch it via monkeypatch.
    
    from app.services import negotiation_service as ns_module
    
    # 3. Create Rich Context
    context = NegotiationContext(
        target_content="bank",
        source_type="dictionary",
        definition="a financial institution",
        part_of_speech="noun",
        translation_hint="yinhang"
    )
    
    # 4. Patch LLM Service
    with pytest.MonkeyPatch.context() as m:
        m.setattr(ns_module.llm_service, "chat_complete", mock_llm.chat_complete)
        
        # 5. Call generation
        # We test the internal method _generate_explanation directly since it's what we changed
        await service._generate_explanation("bank", "en", context_data=context)
        
        # 6. Verify Prompt Construction
        calls = mock_llm.chat_complete.call_args_list
        assert len(calls) == 1
        messages = calls[0][0][0] # first arg, first element
        prompt = messages[0]["content"]
        
        print(f"Generated Prompt: {prompt}")
        
        assert "a financial institution" in prompt
        assert "noun" in prompt

@pytest.mark.asyncio
async def test_negotiation_context_fallback():
    """Verify behavior when context is basic (no extra fields)."""
    
    mock_llm = AsyncMock()
    mock_llm.chat_complete.return_value = "Mock explanation."
    
    service = NegotiationService()
    from app.services import negotiation_service as ns_module
    
    context = NegotiationContext(
        target_content="run",
        source_type="dictionary"
    )
    
    with pytest.MonkeyPatch.context() as m:
        m.setattr(ns_module.llm_service, "chat_complete", mock_llm.chat_complete)
        
        await service._generate_explanation("run", "en", context_data=context)
        
        calls = mock_llm.chat_complete.call_args_list
        prompt = calls[0][0][0][0]["content"]
        
        # Should NOT contain "Context:" block if no extra fields
        assert "Context:" not in prompt
