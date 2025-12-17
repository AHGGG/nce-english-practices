
import pytest
from app.services.voice_lab import voice_lab_service
from tests.verification.utils import validate_audio_format

# Use a short text to minimize cost/time
TEST_TEXT = "Test."

@pytest.mark.asyncio
async def test_google_tts():
    provider = voice_lab_service.get_provider("google")
    config = provider.get_config()
    voice_id = config["voices"][0]
    
    chunks = []
    async for chunk in provider.tts(TEST_TEXT, voice_id, "default"):
        chunks.append(chunk)
    
    full_audio = b"".join(chunks)
    assert validate_audio_format(full_audio), "Google TTS returned invalid empty data"

@pytest.mark.asyncio
async def test_azure_tts():
    provider = voice_lab_service.get_provider("azure")
    config = provider.get_config()
    voice_id = config["voices"][0]
    
    chunks = []
    async for chunk in provider.tts(TEST_TEXT, voice_id, "default"):
        chunks.append(chunk)

    full_audio = b"".join(chunks)
    assert validate_audio_format(full_audio), "Azure TTS returned invalid empty data"

@pytest.mark.asyncio
async def test_deepgram_tts():
    provider = voice_lab_service.get_provider("deepgram")
    config = provider.get_config()
    voice_id = config["voices"][0] # aura voices
    
    chunks = []
    # Use generic "default" model (Deepgram provider might handle it internally)
    async for chunk in provider.tts(TEST_TEXT, voice_id, "default"):
        chunks.append(chunk)

    full_audio = b"".join(chunks)
    assert validate_audio_format(full_audio), "Deepgram TTS returned invalid empty data"

@pytest.mark.asyncio
async def test_elevenlabs_tts():
    provider = voice_lab_service.get_provider("elevenlabs")
    config = provider.get_config()
    voice_id = config["voices"][0]
    
    chunks = []
    async for chunk in provider.tts(TEST_TEXT, voice_id, "eleven_monolingual_v1"):
        chunks.append(chunk)

    full_audio = b"".join(chunks)
    assert validate_audio_format(full_audio), "ElevenLabs TTS returned invalid empty data"
