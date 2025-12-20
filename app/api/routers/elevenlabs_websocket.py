"""
WebSocket endpoints for ElevenLabs Realtime STT.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json
import logging
import websockets
import base64

from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice-lab/elevenlabs", tags=["elevenlabs-websocket"])

@router.websocket("/live-stt")
async def elevenlabs_live_stt_websocket(websocket: WebSocket):
    """
    Real-time STT using ElevenLabs WebSocket API.
    Docs: https://elevenlabs.io/docs/api-reference/speech-to-text/v-1-speech-to-text-realtime
    
    Flow:
    1. Frontend sends raw audio bytes.
    2. Backend wraps in JSON `input_audio_chunk` and sends to ElevenLabs.
    3. ElevenLabs sends JSON transcripts.
    4. Backend forwards JSON to Frontend.
    """
    await websocket.accept()
    
    if not settings.ELEVENLABS_API_KEY:
        await websocket.send_json({"type": "error", "message": "ElevenLabs API Key not configured"})
        await websocket.close()
        return

    # ElevenLabs WebSocket URL
    # Explicitly set audio_format to match our PCM 16kHz stream
    # Doc uses scribe_v2_realtime
    url = "wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime&audio_format=pcm_16000"
    
    headers = {
        "xi-api-key": settings.ELEVENLABS_API_KEY
    }

    try:
        logger.info(f"Connecting to ElevenLabs STT: {url}")
        async with websockets.connect(url, additional_headers=headers) as el_ws:
            logger.info("Connected to ElevenLabs Realtime")
            await websocket.send_json({"type": "ready"})
            
            # Task: Receive from ElevenLabs -> Send to Client
            async def receive_from_upstream():
                try:
                    async for msg in el_ws:
                        data = json.loads(msg)
                        msg_type = data.get("message_type", "")
                        
                        if msg_type == "partial_transcript":
                            await websocket.send_json({
                                "type": "transcript",
                                "text": data.get("text", ""),
                                "is_final": False
                            })
                        elif msg_type == "committed_transcript":
                            await websocket.send_json({
                                "type": "transcript",
                                "text": data.get("text", ""),
                                "is_final": True
                            })
                        elif msg_type == "error":
                            logger.error(f"ElevenLabs Error: {data.get('message') or data.get('error')}")
                        
                except Exception as e:
                    logger.error(f"Error receiving from ElevenLabs: {e}")

            # Task: Receive from Client -> Send to ElevenLabs
            async def send_to_upstream():
                try:
                    # Initial config if needed, but we rely on query params and raw chunks
                    while True:
                        # Expecting raw bytes from frontend (MediaRecorder)
                        data = await websocket.receive_bytes()
                        
                        if not data:
                            continue

                        # Convert to Base64
                        b64_data = base64.b64encode(data).decode("utf-8")
                        
                        # Wrap in JSON
                        payload = {
                            "message_type": "input_audio_chunk",
                            "audio_base_64": b64_data,
                            "commit": False,
                            "sample_rate": 16000
                        }
                        
                        # Debug: Log first few chars of b64 to ensure it's not empty
                        # logger.info(f"Sending Chunk: {len(data)} bytes -> {len(b64_data)} b64 chars")
                        
                        await el_ws.send(json.dumps(payload))
                        
                except WebSocketDisconnect:
                    # Send Flush/Commit if protocol allows, otherwise just close
                    pass
                except Exception as e:
                    logger.error(f"Error sending to ElevenLabs: {e}")

            # Run tasks
            receiver = asyncio.create_task(receive_from_upstream())
            sender = asyncio.create_task(send_to_upstream())
            
            # Wait for sender (client input) to finish
            await sender
            # Allow brief drain
            try:
                await asyncio.wait_for(receiver, timeout=0.5)
            except:
                pass

    except Exception as e:
        logger.error(f"ElevenLabs WS Error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass
