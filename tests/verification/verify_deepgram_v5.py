
import pytest
import os
import asyncio
from app.services.voice_lab import voice_lab_service

# Only run if Deepgram key is present
DEEPGRAM_KEY = os.getenv("DEEPGRAM_API_KEY")

@pytest.mark.skipif(not DEEPGRAM_KEY, reason="Deepgram API Key not set")
@pytest.mark.asyncio
async def test_deepgram_tts_robustness():
    """Test updated Deepgram TTS with explicit options."""
    provider = voice_lab_service.get_provider("deepgram")
    
    # Test 1: Simple generation
    text = "This is a robustness test for Deepgram v5."
    chunks = []
    async for chunk in provider.tts(text, "aura-asteria-en", "default"):
        chunks.append(chunk)
    
    full_audio = b"".join(chunks)
    assert len(full_audio) > 100, "Deepgram TTS output too short"
    assert full_audio[:3] == b"ID3" or full_audio[:2] == b"\xff\xf3" or full_audio[:2] == b"\xff\xf2", "Output should be MP3 (ID3 or frame sync)"

@pytest.mark.skipif(not DEEPGRAM_KEY, reason="Deepgram API Key not set")
@pytest.mark.asyncio
async def test_deepgram_stt_robustness():
    """Test updated Deepgram STT with explicit payload structure."""
    provider = voice_lab_service.get_provider("deepgram")
    
    # Use the reference audio from existing tests if possible, or a mock
    # Importing utility from sibling test file if needed, or just reading file
    ref_path = "tests/verification/reference.wav"
    
    if not os.path.exists(ref_path):
        pytest.skip(f"Reference audio not found at {ref_path}")
        
    with open(ref_path, "rb") as f:
        audio_data = f.read()
        
    transcript = await provider.stt(audio_data, "nova-3")
    print(f"Transcript: {transcript}")
    
    assert transcript, "Transcript should not be empty"
    assert isinstance(transcript, str)
