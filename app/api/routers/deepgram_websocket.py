"""
WebSocket endpoints for Deepgram advanced features:
- Flux STT (real-time conversational transcription)
- Streaming TTS (WebSocket-based text-to-speech)
- Voice Agent API (end-to-end STT + LLM + TTS)
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Optional
import asyncio
import json
import logging
import websockets  # Standard websockets client

from app.config import settings
from app.services.llm import llm_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice-lab/deepgram", tags=["deepgram-websocket"])

@router.websocket("/live-stt")
async def deepgram_live_stt_websocket(
    websocket: WebSocket,
    model: str = Query(default="nova-3", description="Model: nova-3 or flux")
):
    """
    Real-time STT using Deepgram WebSocket API (Raw Proxy).
    Docs: https://developers.deepgram.com/docs/listen-live
    """
    await websocket.accept()
    
    if not settings.DEEPGRAM_API_KEY:
        await websocket.send_json({"type": "error", "message": "Deepgram API Key not configured"})
        await websocket.close()
        return
    
    # Construct Deepgram WebSocket URL
    # Nova models: wss://api.deepgram.com/v1/listen
    # FLUX models: wss://api.deepgram.com/v2/listen
    is_flux = model == "flux" or model.startswith("flux-")
    
    if is_flux:
        # FLUX uses v2 API with specific model name
        actual_model = "flux-general-en" if model == "flux" else model
        base_url = "wss://api.deepgram.com/v2/listen"
        # Frontend sends raw PCM (linear16) at 16kHz
        params = f"model={actual_model}&encoding=linear16&sample_rate=16000"
    else:
        # Nova and other models use v1 API
        base_url = "wss://api.deepgram.com/v1/listen"
        params = f"model={model}&smart_format=true&interim_results=true&channels=1"
    dg_url = f"{base_url}?{params}"
    
    headers = {
        "Authorization": f"Token {settings.DEEPGRAM_API_KEY}"
    }

    try:
        # Connect to Deepgram (Upstream)
        logger.info(f"Connecting to Deepgram URL: {dg_url}")
        async with websockets.connect(dg_url, additional_headers=headers) as dg_ws:
            logger.info(f"Connected to Deepgram Live: {model}")
            await websocket.send_json({"type": "ready", "model": model})
            
            # Task: Receive from Deepgram -> Send to Client
            async def receive_from_deepgram():
                try:
                    async for msg in dg_ws:
                        data = json.loads(msg)
                        
                        # DEBUG: Log all messages from Deepgram
                        logger.info(f"[Deepgram RAW] {json.dumps(data)[:500]}")
                        
                        # Parse Deepgram response based on API version
                        if is_flux:
                            # FLUX v2 API: TurnInfo messages
                            msg_type = data.get("type", "")
                            if msg_type == "Connected":
                                logger.info(f"FLUX Connected: {data.get('request_id')}")
                            elif msg_type == "TurnInfo":
                                transcript = data.get("transcript", "")
                                event = data.get("event", "")
                                if transcript:
                                    await websocket.send_json({
                                        "type": "transcript",
                                        "text": transcript,
                                        "is_final": event in ["EndOfTurn", "EagerEndOfTurn"],
                                        "event": event,
                                        "turn_index": data.get("turn_index")
                                    })
                            elif msg_type == "Error":
                                logger.error(f"FLUX Error: {data.get('description')}")
                        else:
                            # Nova v1 API: channel.alternatives format
                            if "channel" in data and "alternatives" in data["channel"]:
                                alt = data["channel"]["alternatives"][0]
                                transcript = alt.get("transcript", "")
                                if transcript:
                                    await websocket.send_json({
                                        "type": "transcript",
                                        "text": transcript,
                                        "is_final": data.get("is_final", False),
                                        "confidence": alt.get("confidence")
                                    })
                            elif "type" in data and data["type"] == "Metadata":
                                 pass # Connection Established info
                            elif "error" in data:
                                 logger.error(f"Deepgram Error: {data['error']}")
                                 
                except Exception as e:
                    logger.error(f"Error receiving from Deepgram: {e}")

            # Task: Receive from Client -> Send to Deepgram
            async def send_to_deepgram():
                try:
                    while True:
                        data = await websocket.receive_bytes()
                        await dg_ws.send(data)
                except WebSocketDisconnect:
                    # Send CloseStream specific message if needed, or just close
                    # Deepgram expects a collection of bytes of JSON 0 byte to ensure flush, usually closing socket is enough
                    await dg_ws.send(json.dumps({"type": "CloseStream"}))
                except Exception as e:
                    logger.error(f"Error sending to Deepgram: {e}")

            # Run both tasks
            listener_task = asyncio.create_task(receive_from_deepgram())
            sender_task = asyncio.create_task(send_to_deepgram())
            
            # Wait for sender (client input) to finish (disconnect)
            await sender_task
            
            # Give a brief moment for final results
            await asyncio.wait_for(listener_task, timeout=1.0)
            
    except Exception as e:
        logger.error(f"Deepgram WebSocket Error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except:
             pass
    finally:
        try:
            await websocket.close()
        except:
            pass


@router.websocket("/streaming-tts")
async def deepgram_streaming_tts_websocket(
    websocket: WebSocket,
    voice: str = Query(default="aura-2-asteria-en", description="Voice model")
):
    """
    Streaming TTS using Deepgram WebSocket API (Raw Proxy).
    Docs: https://developers.deepgram.com/docs/text-to-speech
    """
    await websocket.accept()
    
    if not settings.DEEPGRAM_API_KEY:
        await websocket.send_json({"type": "error", "message": "Deepgram API Key not configured"})
        await websocket.close()
        return

    # Construct Deepgram WebSocket URL
    # wss://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=linear16&sample_rate=24000
    base_url = "wss://api.deepgram.com/v1/speak"
    # Using linear16 at 24000 as requested by previous implementation logic, or typical Aura defaults
    params = f"model={voice}&encoding=linear16&sample_rate=24000&container=none"
    dg_url = f"{base_url}?{params}"
    
    headers = {
        "Authorization": f"Token {settings.DEEPGRAM_API_KEY}"
    }

    try:
        # Add timeout for connection - Deepgram can be slow sometimes
        async with websockets.connect(
            dg_url, 
            additional_headers=headers,
            open_timeout=10,  # 10 seconds for handshake
            close_timeout=5
        ) as dg_ws:
            logger.info(f"Connected to Deepgram TTS: {voice}")
            await websocket.send_json({"type": "ready", "voice": voice})
            
            audio_header_sent = False
            
            # Task: Receive from Deepgram (Audio) -> Send to Client
            async def receive_from_deepgram():
                nonlocal audio_header_sent
                try:
                    async for msg in dg_ws:
                        # Deepgram sends text messages (metadata) or binary messages (audio)
                        if isinstance(msg, bytes):
                             # Inject Header if first chunk
                             if not audio_header_sent:
                                 from app.services.voice_lab import create_wav_header
                                 header = create_wav_header(sample_rate=24000, channels=1, bits_per_sample=16)
                                 await websocket.send_bytes(header)
                                 audio_header_sent = True
                             
                             await websocket.send_bytes(msg)
                        else:
                             # JSON Metadata
                             meta = json.loads(msg)
                             if meta.get("type") == "Flushed":
                                 await websocket.send_json({"type": "flushed"})
                             elif meta.get("type") == "error":
                                 logger.error(f"Deepgram TTS Error: {meta}")
                                 
                except Exception as e:
                    logger.error(f"Error receiving audio from Deepgram: {e}")

            # Task: Receive from Client (Text) -> Send to Deepgram
            async def send_to_deepgram():
                try:
                    while True:
                        msg = await websocket.receive_json()
                        msg_type = msg.get("type")
                        
                        if msg_type == "text":
                            # Send Speak command
                            # Format: { "type": "Speak", "text": "..." }
                            await dg_ws.send(json.dumps({"type": "Speak", "text": msg.get("content", "")}))
                        
                        elif msg_type == "flush":
                            # Send Flush command
                            await dg_ws.send(json.dumps({"type": "Flush"}))
                            
                        elif msg_type == "close":
                            # Send Close command
                            await dg_ws.send(json.dumps({"type": "Close"}))
                            break
                            
                except WebSocketDisconnect:
                    await dg_ws.send(json.dumps({"type": "Close"}))
                except Exception as e:
                    logger.error(f"Error sending text to Deepgram: {e}")

            # Run tasks
            receiver = asyncio.create_task(receive_from_deepgram())
            sender = asyncio.create_task(send_to_deepgram())
            
            await sender
            # Wait a bit for remaining audio
            try:
                await asyncio.wait_for(receiver, timeout=2.0)
            except asyncio.TimeoutError:
                pass
                
    except Exception as e:
        logger.error(f"Deepgram TTS WebSocket Error: {e}")
        try:
             await websocket.send_json({"type": "error", "message": str(e)})
        except:
             pass
    finally:
        try:
             await websocket.close()
        except:
             pass


@router.websocket("/voice-agent")
async def deepgram_voice_agent_websocket(
    websocket: WebSocket,
    stt_model: str = Query(default="nova-3"),
    tts_voice: str = Query(default="aura-2-asteria-en"),
    llm_provider: str = Query(default="deepseek", description="deepseek or gemini"),
    system_prompt: str = Query(default="You are a helpful AI assistant.")
):
    """
    Full Voice Agent: STT (Deepgram WSS) -> LLM (Rest) -> TTS (Deepgram WSS)
    """
    await websocket.accept()
    
    if not settings.DEEPGRAM_API_KEY:
        await websocket.close()
        return

    # Setup STT connection
    # Flux requires v2 API with explicit encoding, Nova uses v1 with auto-detection
    is_flux_stt = stt_model == "flux" or stt_model.startswith("flux-")
    if is_flux_stt:
        actual_stt_model = "flux-general-en" if stt_model == "flux" else stt_model
        stt_url = f"wss://api.deepgram.com/v2/listen?model={actual_stt_model}&encoding=linear16&sample_rate=16000"
    else:
        stt_url = f"wss://api.deepgram.com/v1/listen?model={stt_model}&smart_format=true&channels=1&endpointing=300"
    
    # Setup TTS connection
    tts_url = f"wss://api.deepgram.com/v1/speak?model={tts_voice}&encoding=linear16&sample_rate=24000&container=none"
    
    headers = {"Authorization": f"Token {settings.DEEPGRAM_API_KEY}"}
    
    try:
        async with websockets.connect(stt_url, additional_headers=headers) as stt_ws, \
                   websockets.connect(tts_url, additional_headers=headers) as tts_ws:
            
            await websocket.send_json({
                "type": "ready",
                "stt_model": stt_model,
                "tts_voice": tts_voice
            })
            
            conversation_history = [{"role": "system", "content": system_prompt}]
            tts_header_sent = False
            
            # --- Handlers ---
            
            async def handle_llm_and_tts(user_text):
                """Process text with LLM and stream to TTS"""
                try:
                    nonlocal tts_header_sent, conversation_history
                    
                    
                    # 1. LLM
                    conversation_history.append({"role": "user", "content": user_text})
                    
                    response_text = ""
                    if llm_provider == "gemini":
                        response_text = "Gemini provider not implemented in raw mode yet."
                    else:
                        llm_client = llm_service.sync_client
                        loop = asyncio.get_event_loop()
                        response = await loop.run_in_executor(
                            None, 
                            lambda: llm_client.chat.completions.create(
                                model=settings.MODEL_NAME,
                                messages=conversation_history, # Sending full history
                                max_tokens=150
                            )
                        )
                        response_text = response.choices[0].message.content
                    
                    conversation_history.append({"role": "assistant", "content": response_text})
                    
                    # Notify Client
                    await websocket.send_json({"type": "llm_response", "text": response_text})
                    
                    # 2. Send to TTS (format: {"type": "Speak", "text": "..."})
                    await tts_ws.send(json.dumps({"type": "Speak", "text": response_text}))
                    await tts_ws.send(json.dumps({"type": "Flush"}))
                    
                except Exception as e:
                    logger.error(f"LLM/TTS Processing Error: {e}")

            async def stt_receiver():
                """Listen to STT, detect sentence, trigger LLM"""
                async for msg in stt_ws:
                    data = json.loads(msg)
                    
                    # Handle Flux v2 API (TurnInfo format)
                    if is_flux_stt:
                        msg_type = data.get("type", "")
                        if msg_type == "TurnInfo":
                            transcript = data.get("transcript", "")
                            event = data.get("event", "")
                            is_final = event in ["EndOfTurn", "EagerEndOfTurn"]
                            
                            
                            if transcript:
                                await websocket.send_json({"type": "transcript", "text": transcript, "is_final": is_final})
                                
                                if is_final:
                                    asyncio.create_task(handle_llm_and_tts(transcript))
                    else:
                        # Handle Nova v1 API (channel.alternatives format)
                        if "channel" in data and "alternatives" in data["channel"]:
                            alt = data["channel"]["alternatives"][0]
                            transcript = alt.get("transcript", "")
                            is_final = data.get("is_final")
                            
                            if transcript:
                                await websocket.send_json({"type": "transcript", "text": transcript, "is_final": is_final})
                                
                                if is_final:
                                    asyncio.create_task(handle_llm_and_tts(transcript))

            async def tts_receiver():
                """Listen to TTS audio, forward to client"""
                nonlocal tts_header_sent
                async for msg in tts_ws:
                    if isinstance(msg, bytes):
                        if not tts_header_sent:
                            from app.services.voice_lab import create_wav_header
                            header = create_wav_header(sample_rate=24000) # Match TTS sample rate
                            await websocket.send_bytes(header)
                            tts_header_sent = True
                        await websocket.send_bytes(msg)

            async def client_listener():
                """Receive audio from client, send to STT"""
                try:
                    while True:
                        data = await websocket.receive_bytes()
                        await stt_ws.send(data)
                except WebSocketDisconnect:
                    await stt_ws.send(json.dumps({"type": "CloseStream"}))

            # Run all loops
            await asyncio.gather(
                client_listener(),
                stt_receiver(),
                tts_receiver(),
                return_exceptions=True
            )

    except Exception as e:
        logger.error(f"Voice Agent Error: {e}")
        try:
             await websocket.send_json({"type": "error", "message": f"Critical Error: {str(e)}"})
        except:
             pass
    finally:
        try:
            await websocket.close()
        except:
            pass
