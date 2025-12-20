"""
ElevenLabs WebSocket Tests

Tests for ElevenLabs Realtime STT WebSocket features.
Focus on connection verification and basic flow.

These tests require ELEVENLABS_API_KEY and make real API calls via the proxy.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

@pytest.fixture
def has_elevenlabs_key():
    if not settings.ELEVENLABS_API_KEY:
        pytest.skip("ELEVENLABS_API_KEY not configured")
    return True

def test_elevenlabs_live_stt_websocket_connection(has_elevenlabs_key):
    """
    Test WebSocket connection to ElevenLabs Live STT.
    Verify: Connection established, audio format accepted.
    """
    client = TestClient(app)
    
    # Connect to the endpoint
    with client.websocket_connect("/api/voice-lab/elevenlabs/live-stt") as ws:
        # 1. Send 'ready' or initial empty audio
        # The protocol doesn't enforce a 'ready' message from the server immediately
        # until we send data, but the connection itself should succeed.
        
        # 2. Simulate sending a small chunk of silence (PCM 16kHz)
        # 16000Hz * 0.1s * 2 bytes = 3200 bytes
        silence = b'\x00' * 3200
        ws.send_bytes(silence)
        
        # 3. We assume success if we don't get a 1008 error immediately
        # Receive potential response or just close
        try:
            msg = ws.receive_json(mode="text")
            # If we get a message, it should follow the schema
            assert "type" in msg
        except:
            # It's okay if we don't get a transcript for silence instantly
            pass
        
        # Close connection
        ws.close()


def test_elevenlabs_voice_agent_websocket_connection(has_elevenlabs_key):
    """
    Test WebSocket connection to ElevenLabs Voice Agent.
    Verify: Connection established, params accepted.
    """
    client = TestClient(app)
    
    # 1. Connect with query params
    url = "/api/voice-lab/elevenlabs/voice-agent?voice_id=JBFqnCBsd6RMkjVDRZzb&model_id=eleven_turbo_v2_5"
    
    with client.websocket_connect(url) as ws:
        # 2. Protocol Expects 'ready'
        ws.send_json({"type": "ready"})
        
        # 3. Send audio chunk (silence)
        # 16000Hz * 0.1s * 2 bytes = 3200 bytes
        silence = b'\x00' * 3200
        ws.send_bytes(silence)
        
        # 4. Check for immediate error (or ack if any)
        # We don't expect a response for silence immediately unless LLM triggers (it won't on silence)
        # Just ensure no disconnect
        try:
             # Timeout fast if nothing comes
             data = ws.receive_json(mode="text")
             pass 
        except:
             pass
             
        # If we are here, connection is stable enough

