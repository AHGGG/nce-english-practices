
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app

# Create a test client
client = TestClient(app)

def test_get_config_error_handling():
    # Patch the service to raise an exception
    with patch("app.services.voice_lab.voice_lab_service.get_all_configs") as mock_get:
        mock_get.side_effect = Exception("Secret Database Info Leaked!")

        response = client.get("/api/voice-lab/config")

        assert response.status_code == 500
        assert response.json() == {"detail": "Internal server error"}
        # Ensure the secret info is NOT in the response
        assert "Secret Database Info Leaked!" not in response.text

def test_tts_error_handling():
    with patch("app.services.voice_lab.voice_lab_service.get_provider") as mock_get_provider:
        mock_get_provider.side_effect = Exception("TTS Internal Failure")

        response = client.post("/api/voice-lab/tts", data={
            "provider": "google",
            "text": "Hello",
            "voice_id": "Puck"
        })

        assert response.status_code == 500
        assert response.json() == {"detail": "TTS generation failed"}
        assert "TTS Internal Failure" not in response.text
