import pytest
import base64
import time
from fastapi.testclient import TestClient
from app.main import app
from tests.verification.utils import get_or_create_reference_audio


@pytest.mark.asyncio
async def test_realtime_session_flow():
    """
    Simulates a full Voice Session:
    1. Validate Token Endpoint.
    2. Connect WebSocket.
    3. Handshake.
    4. Send Audio.
    5. Receive Transcript/Audio.
    """
    client = TestClient(app)

    # 1. Get Token (Optional, but good verification)
    response = client.post(
        "/api/voice/token",
        json={
            "topic": "Verification",
            "mission_context": "Testing connection",
            "tense": "Present",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["url"] == "/ws/voice"

    # 2. Connect WebSocket
    # Note: TestClient.websocket_connect is a context manager
    with client.websocket_connect("/ws/voice") as websocket:
        # 3. Handshake: Client sends Config
        config_payload = {
            "voiceName": "Puck",
            "systemInstruction": "You are a helpful verification assistant. If you hear 'verification test', say 'Verification Confirmed'.",
        }
        websocket.send_json(config_payload)

        # Expect 'server_ready'
        # Provide a timeout mechanism
        start_time = time.time()
        server_ready = False
        while time.time() - start_time < 10:  # 10s timeout for connection
            try:
                msg = websocket.receive_json()
                print(f"Received: {msg.get('type')}")
                if msg.get("type") == "server_ready":
                    server_ready = True
                    break
            except Exception:
                time.sleep(0.1)

        assert server_ready, "Did not receive 'server_ready' from VoiceSession"

        # 4. Send Audio
        # Load reference audio
        audio_data = await get_or_create_reference_audio()
        b64_audio = base64.b64encode(audio_data).decode("utf-8")

        # Send in chunks ideally, but one big chunk is fine for verification
        websocket.send_json({"type": "audio", "data": b64_audio})

        # 5. Wait for Response (Transcript or Audio)
        # We expect detailed transcript "Verification test" or response "Confirmed"
        received_response = False
        start_time = time.time()

        while time.time() - start_time < 15:  # 15s timeout for processing
            try:
                msg = websocket.receive_json()
                msg_type = msg.get("type")

                if msg_type == "transcript":
                    text = msg.get("text", "")
                    print(f"Transcript: {text}")
                    # If we see anything relevant, we pass
                    if text:
                        received_response = True
                        break

                elif msg_type == "audio":
                    # Receiving audio is also a success indicator
                    print("Received Audio Chunk")
                    received_response = True
                    break

            except Exception:
                # Socket might be empty for a bit
                time.sleep(0.1)

        assert received_response, (
            "Did not receive any transcript or audio response from Gemini"
        )

        # Close cleanly
        websocket.close()
