"""
Voice Lab Integration Tests

Tests TTS/STT round-trip functionality and ElevenLabs Speech-to-Speech.
These tests make real API calls and require valid API keys.
"""

import pytest
from app.services.voice_lab import get_voice_lab_service
from app.config import settings
from tests.verification.utils import (
    validate_audio_format,
    contains_any_keyword,
    LogCapture,
)

# --- Fixtures ---


@pytest.fixture
def has_deepgram_key():
    if not settings.DEEPGRAM_API_KEY:
        pytest.skip("DEEPGRAM_API_KEY not configured")
    return True


@pytest.fixture
def has_elevenlabs_key():
    if not settings.TEST_ELEVENLABS_ENABLED:
        pytest.skip("ElevenLabs tests disabled (TEST_ELEVENLABS_ENABLED=False)")
    if not settings.ELEVENLABS_API_KEY:
        pytest.skip("ELEVENLABS_API_KEY not configured")
    return True


@pytest.fixture
def has_google_key():
    if not settings.GEMINI_API_KEY:
        pytest.skip("GEMINI_API_KEY not configured")
    return True


# --- TTS Round-Trip Tests (TTS -> STT should produce similar text) ---


@pytest.mark.asyncio
async def test_deepgram_tts_stt_roundtrip(has_deepgram_key):
    """
    Generate audio with Deepgram TTS, then transcribe with Deepgram STT.
    Verify semantic consistency.
    """
    test_text = "Hello this is a test."
    provider = get_voice_lab_service().get_provider("deepgram")
    config = provider.get_config()
    voice_id = config["voices"][0]

    # 1. Generate TTS
    with LogCapture("app.services.voice_lab") as logs:
        chunks = []
        async for chunk in provider.tts(test_text, voice_id, "default"):
            chunks.append(chunk)

        full_audio = b"".join(chunks)

    assert validate_audio_format(full_audio, min_length=1000), (
        "TTS produced invalid audio"
    )
    assert not logs.has_errors(), f"TTS had errors: {logs.get_output()}"

    # 2. Transcribe with STT
    with LogCapture("app.services.voice_lab") as logs:
        transcript = await provider.stt(full_audio)

    assert transcript, "STT returned empty transcription"
    assert not logs.has_errors(), f"STT had errors: {logs.get_output()}"

    # 3. Verify semantic similarity
    assert contains_any_keyword(transcript, ["hello", "test"]), (
        f"Transcript '{transcript}' does not match input '{test_text}'"
    )


@pytest.mark.asyncio
async def test_elevenlabs_tts_stt_roundtrip(has_elevenlabs_key):
    """
    Generate audio with ElevenLabs TTS, then transcribe with ElevenLabs STT (Scribe).
    Verify semantic consistency.
    """
    test_text = "Hello this is a test."
    provider = get_voice_lab_service().get_provider("elevenlabs")
    config = provider.get_config()
    voice_id = config["voices"][0]

    # 1. Generate TTS
    chunks = []
    async for chunk in provider.tts(test_text, voice_id, "eleven_turbo_v2_5"):
        chunks.append(chunk)

    full_audio = b"".join(chunks)
    assert validate_audio_format(full_audio, min_length=1000), (
        "TTS produced invalid audio"
    )

    # 2. Transcribe with STT
    transcript = await provider.stt(full_audio)

    assert transcript, "STT returned empty transcription"

    # 3. Verify semantic similarity
    assert contains_any_keyword(transcript, ["hello", "test"]), (
        f"Transcript '{transcript}' does not match input '{test_text}'"
    )


@pytest.mark.asyncio
async def test_google_tts_with_deepgram_stt(has_google_key, has_deepgram_key):
    """
    Cross-provider test: Google TTS -> Deepgram STT.
    Verifies audio format compatibility.
    """
    test_text = "This is a cross provider test."

    google_provider = get_voice_lab_service().get_provider("google")
    deepgram_provider = get_voice_lab_service().get_provider("deepgram")

    google_config = google_provider.get_config()
    voice_id = google_config["voices"][0]

    # 1. Generate TTS with Google
    chunks = []
    async for chunk in google_provider.tts(test_text, voice_id, "default"):
        chunks.append(chunk)

    full_audio = b"".join(chunks)
    assert validate_audio_format(full_audio, min_length=500), (
        "Google TTS produced invalid audio"
    )

    # 2. Transcribe with Deepgram
    transcript = await deepgram_provider.stt(full_audio)

    assert transcript, "Deepgram STT returned empty transcription"
    assert contains_any_keyword(transcript, ["cross", "provider", "test"]), (
        f"Transcript '{transcript}' does not match input"
    )


# --- ElevenLabs Speech-to-Speech Tests ---


@pytest.mark.asyncio
async def test_elevenlabs_speech_to_speech(has_elevenlabs_key):
    """
    Test ElevenLabs Voice Changer (Speech-to-Speech).
    1. Generate input audio with TTS
    2. Transform with STS
    3. Verify output audio is valid
    """
    provider = get_voice_lab_service().get_provider("elevenlabs")
    config = provider.get_config()

    source_voice = config["voices"][0]
    # Target a different voice if available
    target_voice = (
        config["voices"][1] if len(config["voices"]) > 1 else config["voices"][0]
    )

    # 1. Generate source audio
    test_text = "This is the original voice."
    chunks = []
    async for chunk in provider.tts(test_text, source_voice, "eleven_turbo_v2_5"):
        chunks.append(chunk)

    source_audio = b"".join(chunks)
    assert validate_audio_format(source_audio, min_length=1000), "Source TTS failed"

    # 2. Transform with Speech-to-Speech
    sts_chunks = []
    async for chunk in provider.speech_to_speech(source_audio, target_voice):
        sts_chunks.append(chunk)

    sts_audio = b"".join(sts_chunks)

    # 3. Verify output
    assert validate_audio_format(sts_audio, min_length=500), (
        "STS produced invalid audio"
    )

    # Audio length should be roughly comparable (within 5x factor for different speaking rates)
    assert len(sts_audio) > len(source_audio) * 0.2, "STS audio suspiciously short"


@pytest.mark.asyncio
async def test_elevenlabs_text_to_sfx(has_elevenlabs_key):
    """
    Test ElevenLabs Sound Effects generation.
    """
    provider = get_voice_lab_service().get_provider("elevenlabs")

    sfx_prompt = "Short beep sound"

    chunks = []
    async for chunk in provider.text_to_sfx(sfx_prompt, duration_seconds=1.0):
        chunks.append(chunk)

    full_audio = b"".join(chunks)

    assert validate_audio_format(full_audio, min_length=500), (
        "Text-to-SFX produced invalid audio"
    )


# --- API Router Tests ---

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_voice_lab_config_endpoint():
    """Test /api/voice-lab/config returns valid config."""
    response = client.get("/api/voice-lab/config")
    assert response.status_code == 200

    data = response.json()
    assert "google" in data
    assert "deepgram" in data
    assert "elevenlabs" in data

    for provider_name, config in data.items():
        assert "voices" in config, f"{provider_name} missing 'voices' key"


def test_voice_lab_tts_endpoint(has_deepgram_key):
    """Test /api/voice-lab/tts streaming endpoint."""
    response = client.post(
        "/api/voice-lab/tts",
        data={
            "provider": "deepgram",
            "text": "Hi",
            "voice_id": "aura-asteria-en",
            "model": "default",
        },
    )

    assert response.status_code == 200
    assert len(response.content) > 100, "TTS response too short"


def test_voice_lab_stt_endpoint_requires_file():
    """Test /api/voice-lab/stt requires file upload."""
    response = client.post("/api/voice-lab/stt", data={"provider": "deepgram"})

    # Should return 422 for missing file
    assert response.status_code == 422
