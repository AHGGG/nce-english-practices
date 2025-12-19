
import pytest
import os
import asyncio
from app.services.voice_lab import voice_lab_service

# Check for API Key
DEEPGRAM_KEY = os.getenv("DEEPGRAM_API_KEY")

@pytest.mark.skipif(not DEEPGRAM_KEY, reason="Deepgram API Key not set")
@pytest.mark.asyncio
async def test_deepgram_raw_tts():
    """Test raw HTTP TTS generation."""
    provider = voice_lab_service.get_provider("deepgram")
    
    text = "Hello, this is a raw HTTP test."
    chunks = []
    
    # "aura-asteria-en" is default, or pass explicitly
    async for chunk in provider.tts(text, "aura-asteria-en", "default"):
        chunks.append(chunk)
    
    full_audio = b"".join(chunks)
    assert len(full_audio) > 100, "Audio too short"
    # Check for MP3 header (ID3 or frame sync)
    # ID3 = 49 44 33 (ASCII 'ID3')
    # Frame Sync (MPEG 1/2/2.5) standard: 11 bits set to 1.
    # First byte: 0xFF. Second byte: 0xE0 (top 3 bits set).
    
    is_id3 = full_audio.startswith(b"ID3")
    is_frame_sync = False
    if len(full_audio) > 1:
        # Check first byte 0xFF and second byte masked 0xE0 == 0xE0
        if full_audio[0] == 0xFF and (full_audio[1] & 0xE0) == 0xE0:
            is_frame_sync = True

    assert is_id3 or is_frame_sync, f"Expected MP3 header, got start: {full_audio[:4].hex()}"

@pytest.mark.skipif(not DEEPGRAM_KEY, reason="Deepgram API Key not set")
@pytest.mark.asyncio
async def test_deepgram_raw_stt():
    """Test raw HTTP STT transcription."""
    provider = voice_lab_service.get_provider("deepgram")
    
    ref_path = "tests/verification/reference.wav"
    if not os.path.exists(ref_path):
        # Create a dummy wav if missing (or skip)
        pytest.skip("Reference audio not found")
        
    with open(ref_path, "rb") as f:
        audio_data = f.read()
        
    transcript = await provider.stt(audio_data, "nova-3")
    print(f"Transcript: {transcript}")
    
    assert transcript, "Transcript empty"
    assert isinstance(transcript, str)
    # The reference audio usually says "This is a test..." or similar
    # We just check it's not empty and resembles English text if possible, 
    # but existence is key for connectivity test.
