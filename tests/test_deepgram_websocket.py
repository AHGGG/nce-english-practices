"""
Deepgram WebSocket Tests

Tests for Deepgram's realtime WebSocket features.
Focus on connection verification and basic flow - full integration tests
require more complex async handling that isn't well-suited to TestClient.

These tests require DEEPGRAM_API_KEY and make real API calls.
"""

import pytest
import json
import os
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from tests.verification.utils import (
    REFERENCE_AUDIO_PATH,
    load_wav_as_pcm,
    chunk_pcm_audio,
    validate_audio_format,
    contains_any_keyword,
)


# --- Fixtures ---

@pytest.fixture
def has_deepgram_key():
    if not settings.DEEPGRAM_API_KEY:
        pytest.skip("DEEPGRAM_API_KEY not configured")
    return True


@pytest.fixture
def reference_pcm():
    """Load reference audio as 16kHz PCM for WebSocket streaming."""
    if not os.path.exists(REFERENCE_AUDIO_PATH):
        pytest.skip("reference.wav not found - run verification tests first")
    return load_wav_as_pcm(REFERENCE_AUDIO_PATH, target_sample_rate=16000)


# --- Live STT WebSocket Tests ---

def test_deepgram_live_stt_websocket_connection(has_deepgram_key):
    """
    Test WebSocket connection to Deepgram Live STT.
    Verify: Connection established, ready message received.
    """
    client = TestClient(app)
    
    with client.websocket_connect("/api/voice-lab/deepgram/live-stt?model=nova-3") as ws:
        # Should receive ready message
        msg = ws.receive_json()
        
        assert msg["type"] == "ready", f"Expected 'ready' message, got: {msg}"
        assert msg.get("model") == "nova-3"
        
        # Close immediately to avoid hanging
        ws.close()


# --- Streaming TTS WebSocket Tests ---

def test_deepgram_streaming_tts_websocket_connection(has_deepgram_key):
    """
    Test WebSocket connection to Deepgram Streaming TTS.
    Verify: Connection established, ready message received.
    """
    client = TestClient(app)
    
    with client.websocket_connect("/api/voice-lab/deepgram/streaming-tts?voice=aura-asteria-en") as ws:
        msg = ws.receive_json()
        
        assert msg["type"] == "ready", f"Expected 'ready' message, got: {msg}"
        
        # Close immediately
        ws.close()


# --- Voice Agent WebSocket Tests ---

def test_deepgram_voice_agent_websocket_connection(has_deepgram_key):
    """
    Test WebSocket connection to Deepgram Voice Agent.
    Verify: Connection established, ready message received.
    """
    client = TestClient(app)
    
    url = "/api/voice-lab/deepgram/voice-agent?stt_model=nova-3&tts_voice=aura-asteria-en"
    
    with client.websocket_connect(url) as ws:
        msg = ws.receive_json()
        
        assert msg["type"] == "ready", f"Expected 'ready' message, got: {msg}"
        assert "stt_model" in msg
        assert "tts_voice" in msg
        
        # Close immediately
        ws.close()


# --- Utility Tests ---

def test_pcm_utilities():
    """Test PCM utility functions work correctly."""
    from tests.verification.utils import load_wav_as_pcm, chunk_pcm_audio
    
    if not os.path.exists(REFERENCE_AUDIO_PATH):
        pytest.skip("reference.wav not found")
    
    # Load and convert
    pcm_data = load_wav_as_pcm(REFERENCE_AUDIO_PATH, target_sample_rate=16000)
    
    assert len(pcm_data) > 0, "PCM conversion failed"
    assert len(pcm_data) % 2 == 0, "PCM data should be 16-bit aligned"
    
    # Chunk
    chunks = list(chunk_pcm_audio(pcm_data, chunk_size=3200))
    assert len(chunks) > 0, "Chunking failed"
    
    # Verify reconstruction
    reconstructed = b"".join(chunks)
    assert reconstructed == pcm_data, "Chunking lost data"


def test_semantic_similarity():
    """Test semantic similarity utility."""
    from tests.verification.utils import semantic_similarity, contains_any_keyword
    
    # Similar texts
    assert semantic_similarity("Hello world test", "hello test world") == True
    
    # Different texts
    assert semantic_similarity("Hello world", "goodbye moon") == False
    
    # Keyword check
    assert contains_any_keyword("This is a test message", ["test", "hello"]) == True
    assert contains_any_keyword("This is a message", ["test", "hello"]) == False


# --- Full Flow Tests (Async, requires httpx websocket client) ---
# These are skipped by default because they require a running server
# and more complex async handling. Run manually with:
# uv run python tests/verification/verify_deepgram_websocket.py

@pytest.mark.skip(reason="Full WebSocket tests require running server and async handling")
async def test_deepgram_live_stt_full_flow():
    """
    Full Live STT test - skipped in automated runs.
    For manual testing, use the verification script.
    """
    pass


@pytest.mark.skip(reason="Full WebSocket tests require running server and async handling")  
async def test_deepgram_voice_agent_full_flow():
    """
    Full Voice Agent test - skipped in automated runs.
    For manual testing, use the verification script.
    """
    pass
