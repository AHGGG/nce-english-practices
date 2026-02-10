from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app

client = TestClient(app)


def test_voice_lab_error_leak_prevention():
    """
    Security Test: Verify that internal error details are NOT leaked (after fix).
    """
    # We mock the voice_lab_service.get_all_configs method to raise an exception
    # with a sensitive secret message.
    # Note: voice_lab_service is now a lazy loaded singleton accessed via get_voice_lab_service()
    # But for mocking, we can mock the return value of get_voice_lab_service,
    # OR we can mock the class method if we know the class.
    # Easiest is to mock where it is used.
    # app.api.routers.voice_lab calls get_voice_lab_service().get_all_configs()

    with patch("app.services.voice_lab.VoiceLabService.get_all_configs") as mock_get:
        secret_message = "DB_PASSWORD_IS_12345"
        mock_get.side_effect = Exception(secret_message)

        response = client.get("/api/voice-lab/config")

        assert response.status_code == 500

        # Verify the vulnerability is FIXED:
        # The secret message should NOT be in the response body
        assert secret_message not in response.text

        # Verify the generic error message is present
        assert "Internal processing error" in response.text
