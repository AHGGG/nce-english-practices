
import pytest
from app.services.voice_lab import voice_lab_service
from tests.verification.utils import get_or_create_reference_audio

@pytest.fixture
async def reference_audio():
    # This might make a network call to generate audio if missing
    return await get_or_create_reference_audio()

@pytest.mark.asyncio
async def test_google_stt(reference_audio):
    provider = voice_lab_service.get_provider("google")
    transcript = await provider.stt(reference_audio)
    
    assert transcript, "Google STT returned empty transcription"
    # Basic containment check - "verification" or "test"
    # Case insensitive
    text_lower = transcript.lower()
    assert "verification" in text_lower or "test" in text_lower, f"Unexpected transcription: {transcript}"

@pytest.mark.asyncio
async def test_azure_stt(reference_audio):
    provider = voice_lab_service.get_provider("azure")
    transcript = await provider.stt(reference_audio)
    
    assert transcript, "Azure STT returned empty transcription"
    text_lower = transcript.lower()
    assert "verification" in text_lower or "test" in text_lower, f"Unexpected transcription: {transcript}"

@pytest.mark.asyncio
async def test_deepgram_stt(reference_audio):
    provider = voice_lab_service.get_provider("deepgram")
    transcript = await provider.stt(reference_audio)
    
    assert transcript, "Deepgram STT returned empty transcription"
    text_lower = transcript.lower()
    assert "verification" in text_lower or "test" in text_lower, f"Unexpected transcription: {transcript}"

# ElevenLabs doesn't support STT yet (as per code), checking if we should test it
# The voice_lab.py says raise NotImplementedError. So we might skip or test expected fail.
@pytest.mark.asyncio
async def test_elevenlabs_stt_not_implemented(reference_audio):
    provider = voice_lab_service.get_provider("elevenlabs")
    with pytest.raises(NotImplementedError):
        await provider.stt(reference_audio)
