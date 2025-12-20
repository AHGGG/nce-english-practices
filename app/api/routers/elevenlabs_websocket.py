"""
WebSocket endpoints for ElevenLabs Realtime STT.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import asyncio
import json
import logging
import websockets
import base64

from app.config import settings
from app.services.llm import llm_service

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
        logger.info("Connection closed")
        try:
            await websocket.close()
        except:
            pass


@router.websocket("/voice-agent")
async def elevenlabs_voice_agent_endpoint(
    websocket: WebSocket,
    voice_id: str = Query(default="JBFqnCBsd6RMkjVDRZzb", description="ElevenLabs Voice ID"),
    model_id: str = Query(default="eleven_turbo_v2_5", description="TTS Model ID"),
    llm_provider: str = Query(default="deepseek", description="deepseek or gemini"),
    system_prompt: str = Query(default="You are a helpful AI assistant.")
):
    """
    Full Voice Agent: STT (ElevenLabs) -> LLM (Rest) -> TTS (ElevenLabs)
    """
    await websocket.accept()
    
    if not settings.ELEVENLABS_API_KEY:
        await websocket.close()
        return

    # 1. STT Configuration
    # Use 'vad' strategy to auto-commit on silence (default is manual)
    # Tune silence threshold for conversational flow (e.g. 800ms)
    stt_url = (
        "wss://api.elevenlabs.io/v1/speech-to-text/realtime"
        "?model_id=scribe_v2_realtime"
        "&audio_format=pcm_16000"
        "&commit_strategy=vad"
        "&vad_silence_threshold_secs=0.8"
    )
    
    # 2. TTS Configuration
    # https://elevenlabs.io/docs/api-reference/text-to-speech-websockets
    try:
        # Increase inactivity_timeout to avoid 1008/policy violation during silence
        tts_url = f"wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input?model_id={model_id}&output_format=pcm_24000&inactivity_timeout=120"
    except Exception as e:
        logger.error(f"Error constructing TTS URL: {e}")
        await websocket.close()
        return
    
    headers = {
        "xi-api-key": settings.ELEVENLABS_API_KEY
    }

    try:
        logger.info(f"Starting Voice Agent [Voice: {voice_id}, Model: {model_id}]")
        
        async with websockets.connect(stt_url, additional_headers=headers) as stt_ws, \
                   websockets.connect(tts_url, additional_headers=headers) as tts_ws:
            
            # Initial Setup
            await websocket.send_json({"type": "ready"})
            
            # Init TTS (First message requirement)
            await tts_ws.send(json.dumps({
                "text": " ",
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.8},
                "xi-api-key": settings.ELEVENLABS_API_KEY # Redundant if header works, but safe
            }))
            
            conversation_history = [{"role": "system", "content": system_prompt}]
            tts_header_sent = False
            
            # --- Tasks ---
            
            async def handle_llm_and_tts(user_text):
                """Process text with LLM and stream to TTS"""
                try:
                    nonlocal tts_header_sent, conversation_history
                    
                    # 1. LLM Processing
                    conversation_history.append({"role": "user", "content": user_text})
                    
                    response_text = ""
                    # Simple sync wrapper for now, assuming llm_service is available
                    llm_client = llm_service.sync_client
                    loop = asyncio.get_event_loop()
                    
                    # Use LLM Service
                    response = await loop.run_in_executor(
                        None, 
                        lambda: llm_client.chat.completions.create(
                            model=settings.MODEL_NAME,
                            messages=conversation_history,
                            max_tokens=500
                        )
                    )
                    response_text = response.choices[0].message.content
                    
                    conversation_history.append({"role": "assistant", "content": response_text})
                    
                    # Notify Client of Text Response
                    await websocket.send_json({"type": "llm_response", "text": response_text})
                    
                    # 2. Send to TTS
                    # ElevenLabs expects text chunks. We send the whole response + flush.
                    # Ensure space at end if needed, though flush handles it.
                    await tts_ws.send(json.dumps({
                        "text": response_text + " ",
                        "try_trigger_generation": True
                    }))
                    await tts_ws.send(json.dumps({"text": "", "flush": True}))
                    
                except Exception as e:
                    logger.error(f"LLM/TTS Logic Error: {e}")
                    await websocket.send_json({"type": "error", "message": "Brain freeze!"})

            async def stt_receiver():
                """Receive Transcripts from ElevenLabs STT"""
                try:
                    async for msg in stt_ws:
                        data = json.loads(msg)
                        msg_type = data.get("message_type", "")
                        
                        # DEBUG: Trace STT activity
                        if msg_type != "input_audio_chunk": # don't log our own sending if echoed
                             logger.info(f"[STT Raw] Type: {msg_type} | Text: {data.get('text', '')[:50]}")

                        if msg_type == "partial_transcript":
                            await websocket.send_json({
                                "type": "transcript", 
                                "text": data.get("text", ""),
                                "is_final": False
                            })
                        elif msg_type == "committed_transcript":
                            text = data.get("text", "")
                            # FILTER: Ignore empty final transcripts to avoid empty bubbles
                            if text and text.strip():
                                await websocket.send_json({
                                    "type": "transcript", 
                                    "text": text,
                                    "is_final": True
                                })
                                # Trigger Agent Response on final transcript
                                asyncio.create_task(handle_llm_and_tts(text))
                                
                        elif msg_type == "error":
                            logger.error(f"STT Error: {data}")
                except Exception as e:
                    logger.error(f"STT Receiver Error: {e}")

            async def tts_receiver():
                """Receive Audio from ElevenLabs TTS"""
                nonlocal tts_header_sent
                try:
                    async for msg in tts_ws:
                        data = json.loads(msg)
                        
                        audio_b64 = data.get("audio")
                        is_final = data.get("isFinal", False)
                        
                        if audio_b64:
                            audio_bytes = base64.b64decode(audio_b64)
                            await websocket.send_bytes(audio_bytes)
                            
                except Exception as e:
                    logger.error(f"TTS Receiver Error: {e}")

            async def client_listener():
                """Receive Audio from Client -> Send to STT"""
                try:
                    while True:
                        # Expecting raw bytes from frontend (MediaRecorder)
                        data = await websocket.receive_bytes()
                        
                        # Convert to Base64 for ElevenLabs STT
                        b64_data = base64.b64encode(data).decode("utf-8")
                        
                        payload = {
                            "message_type": "input_audio_chunk",
                            "audio_base_64": b64_data,
                            "sample_rate": 16000 # Assuming frontend sends 16k
                        }
                        
                        await stt_ws.send(json.dumps(payload))
                except WebSocketDisconnect:
                    logger.info("Client disconnected (Voice Agent)")
                    # Return to trigger cleanup
                    return

            # Run tasks and ensure cleanup on any exit (e.g. client disconnect)
            # Use FIRST_COMPLETED so if client disconnects, we cancel STT/TTS loops
            tasks = [
                asyncio.create_task(client_listener()),
                asyncio.create_task(stt_receiver()),
                asyncio.create_task(tts_receiver())
            ]
            
            done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            
            # Cancel remaining tasks to close upstream connections via context managers
            for task in pending:
                task.cancel()

    except Exception as e:
        logger.error(f"Voice Agent Critical Error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass
