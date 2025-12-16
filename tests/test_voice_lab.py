
import pytest
from app.services.voice_lab import voice_lab_service, MockProvider
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.mark.asyncio
async def test_service_initialization():
    config = voice_lab_service.get_all_configs()
    assert "google" in config
    assert "deepgram" in config
    assert "elevenlabs" in config
    assert "azure" in config

@pytest.mark.asyncio
async def test_mock_provider():
    provider = MockProvider()
    config = provider.get_config()
    assert config["voices"] == ["mock-male", "mock-female"]
    
    # Test TTS Generator
    chunks = []
    async for chunk in provider.tts("test", "v1", "m1"):
        chunks.append(chunk)
    assert chunks == [b"mock_audio_data"]
    
    # Test STT
    transcription = await provider.stt(b"data")
    assert transcription == "This is a mock transcription."

def test_api_config():
    response = client.get("/api/voice-lab/config")
    assert response.status_code == 200
    data = response.json()
    assert "google" in data
    assert "voices" in data["google"]

def test_api_tts_missing_params():
    response = client.post("/api/voice-lab/tts", data={
        "provider": "google",
        "text": "test"
        # Missing voice_id
    })
    assert response.status_code == 422 # Validation Error

