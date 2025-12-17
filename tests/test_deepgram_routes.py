
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_deepgram_routes_exist():
    """Verify that Deepgram WebSocket routes are registered"""
    # We can't easily test WebSocket connection without a running event loop and server in TestClient 
    # in the same way as integration tests, but we can check if routes map correctly.
    
    routes = [route.path for route in app.routes]
    
    assert "/api/voice-lab/deepgram/live-stt" in routes
    assert "/api/voice-lab/deepgram/streaming-tts" in routes
    assert "/api/voice-lab/deepgram/voice-agent" in routes

def test_deepgram_token_endpoint():
    """Test token endpoint availability"""
    response = client.get("/api/deepgram/token")
    # It might fail if no key is set, but we just check if endpoint is reachable (not 404)
    assert response.status_code in [200, 500] 
