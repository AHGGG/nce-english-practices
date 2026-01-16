import pytest
from unittest.mock import AsyncMock
from app.services.negotiation_service import NegotiationService
from app.models.negotiation_schemas import (
    NegotiationRequest,
    UserIntention,
    NegotiationContext,
    NegotiationStep,
)
from app.services.llm import llm_service


@pytest.mark.asyncio
async def test_negotiation_flow():
    # Mock LLM
    llm_service.chat_complete = AsyncMock(
        side_effect=[
            "Simple explanation",  # EN
            "Chinese explanation",  # CN
            "New example sentence",  # Verify
        ]
    )

    service = NegotiationService()
    session_id = "test_session_1"
    context = NegotiationContext(
        target_content="The ubiquity of smartphones.", source_type="test"
    )

    # 1. Start -> Huh (Request Explain EN)
    req1 = NegotiationRequest(
        session_id=session_id, user_intention=UserIntention.HUH, context=context
    )
    res1 = await service.handle_request(req1)
    assert res1.next_step == NegotiationStep.EXPLAIN_EN
    assert res1.audio_text == "Simple explanation"

    # 2. Huh again (Request Explain CN)
    req2 = NegotiationRequest(session_id=session_id, user_intention=UserIntention.HUH)
    res2 = await service.handle_request(req2)
    assert res2.next_step == NegotiationStep.EXPLAIN_CN
    assert "Chinese explanation" in res2.audio_text

    # 3. Huh again (Transition to Verify)
    req3 = NegotiationRequest(session_id=session_id, user_intention=UserIntention.HUH)
    res3 = await service.handle_request(req3)
    assert res3.next_step == NegotiationStep.VERIFY
    assert "New example sentence" in res3.audio_text

    # 4. Continue (Success)
    req4 = NegotiationRequest(
        session_id=session_id, user_intention=UserIntention.CONTINUE
    )
    res4 = await service.handle_request(req4)
    assert res4.next_step == NegotiationStep.ORIGINAL  # Reset
    assert not res4.should_listen


@pytest.mark.asyncio
async def test_continue_early():
    # Mock LLM
    llm_service.chat_complete = AsyncMock(return_value="Simple explanation")

    service = NegotiationService()
    session_id = "test_session_2"
    context = NegotiationContext(target_content="He went home.", source_type="test")

    # 1. Start -> Huh (Explain EN)
    req1 = NegotiationRequest(
        session_id=session_id, user_intention=UserIntention.HUH, context=context
    )
    res1 = await service.handle_request(req1)
    assert res1.next_step == NegotiationStep.EXPLAIN_EN

    # 2. Continue (Got it, move on)
    req2 = NegotiationRequest(
        session_id=session_id, user_intention=UserIntention.CONTINUE
    )
    res2 = await service.handle_request(req2)
    assert res2.next_step == NegotiationStep.ORIGINAL  # Reset
