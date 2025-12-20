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
    llm_provider: str = Query(default="deepseek", description="deepseek, dashscope, or gemini"),
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
                    if llm_provider == "dashscope":
                        client = llm_service.get_dashscope_client()
                        if not client:
                             response_text = "Dashscope client not configured."
                        else:
                             response = await client.chat.completions.create(
                                 model=settings.DASHSCOPE_MODEL_NAME,
                                 messages=conversation_history,
                                 extra_body={"enable_thinking": False}
                             )
                             response_text = response.choices[0].message.content
                    elif llm_provider == "gemini":
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


# ============================================================================
# Unified Voice Agent API (Best Practice)
# Uses wss://agent.deepgram.com/v1/agent/converse for lowest latency
# ============================================================================

DEEPGRAM_AGENT_URL = "wss://agent.deepgram.com/v1/agent/converse"

# Audio settings matching best practices
USER_AUDIO_SAMPLE_RATE = 16000  # Browser sends 16kHz PCM
AGENT_AUDIO_SAMPLE_RATE = 16000  # Deepgram returns 16kHz PCM


@router.websocket("/unified-voice-agent")
async def deepgram_unified_voice_agent_websocket(
    websocket: WebSocket,
    voice: str = Query(default="aura-2-asteria-en", description="TTS voice model"),
    llm_provider: str = Query(default="default", description="LLM provider: default (gpt-4o-mini), dashscope, or deepseek"),
    system_prompt: str = Query(default="You are a helpful and concise AI assistant. Keep responses brief."),
    greeting: str = Query(default="Hello! How can I help you today?")
):
    """
    Unified Voice Agent using Deepgram's Agent API.
    
    This endpoint proxies to wss://agent.deepgram.com/v1/agent/converse
    which handles STT -> LLM -> TTS entirely server-side for minimal latency.
    
    Key features:
    - Single WebSocket connection
    - Built-in VAD and barge-in support
    - ~300ms response latency
    
    LLM Providers:
    - default: Use Deepgram's built-in OpenAI (gpt-4o-mini) - fastest, no extra API key
    - dashscope: Use Qwen via Dashscope (requires DASHSCOPE_API_KEY)
    - deepseek: Use DeepSeek (requires DEEPSEEK_API_KEY)
    """
    await websocket.accept()
    
    if not settings.DEEPGRAM_API_KEY:
        await websocket.send_json({"type": "error", "message": "Deepgram API Key not configured"})
        await websocket.close()
        return

    # Build LLM endpoint configuration based on provider
    if llm_provider == "default":
        # Use Deepgram's built-in OpenAI integration (gpt-4o-mini)
        # No custom endpoint needed - Deepgram handles the API call
        think_config = {
            "provider": {
                "type": "open_ai",
                "model": "gpt-4o-mini",
                "temperature": 0.7,
            },
            "prompt": system_prompt,
        }
    elif llm_provider == "dashscope":
        if not settings.DASHSCOPE_API_KEY:
            await websocket.send_json({"type": "error", "message": "Dashscope API Key not configured"})
            await websocket.close()
            return
        think_config = {
            "provider": {
                "type": "open_ai",
                "model": settings.DASHSCOPE_MODEL_NAME or "qwen3-30b-a3b",
                "temperature": 0.7,
            },
            "endpoint": {
                "url": "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
                "headers": {
                    "authorization": f"Bearer {settings.DASHSCOPE_API_KEY}"
                }
            },
            "prompt": system_prompt,
        }
    else:  # deepseek or fallback
        think_config = {
            "provider": {
                "type": "open_ai",
                "model": settings.MODEL_NAME or "deepseek-chat",
                "temperature": 0.7,
            },
            "endpoint": {
                "url": settings.DEEPSEEK_BASE_URL + "/chat/completions" if settings.DEEPSEEK_BASE_URL else "https://api.deepseek.com/v1/chat/completions",
                "headers": {
                    "authorization": f"Bearer {settings.DEEPSEEK_API_KEY}"
                }
            },
            "prompt": system_prompt,
        }

    # Build complete settings message (following best practices from examples)
    agent_settings = {
        "type": "Settings",
        "audio": {
            "input": {
                "encoding": "linear16",
                "sample_rate": USER_AUDIO_SAMPLE_RATE,
            },
            "output": {
                "encoding": "linear16",
                "sample_rate": AGENT_AUDIO_SAMPLE_RATE,
                "container": "none",
            },
        },
        "agent": {
            "language": "en",
            "listen": {
                "provider": {
                    "type": "deepgram",
                    "model": "nova-3",
                }
            },
            "think": think_config,
            "speak": {
                "provider": {
                    "type": "deepgram",
                    "model": voice,
                }
            },
            "greeting": greeting,
        }
    }

    headers = {"Authorization": f"Token {settings.DEEPGRAM_API_KEY}"}

    try:
        logger.info(f"Connecting to Deepgram Agent API: {DEEPGRAM_AGENT_URL}")
        async with websockets.connect(
            DEEPGRAM_AGENT_URL,
            additional_headers=headers,
            open_timeout=10,
            close_timeout=5,
            ping_interval=20,  # Keep connection alive
        ) as dg_ws:
            # Send settings first
            await dg_ws.send(json.dumps(agent_settings))
            logger.info(f"Sent agent settings: voice={voice}, llm={llm_provider}")
            
            # Notify client we're ready
            await websocket.send_json({
                "type": "ready",
                "voice": voice,
                "llm_provider": llm_provider,
                "sample_rate": AGENT_AUDIO_SAMPLE_RATE,
            })

            # Task: Receive from Deepgram -> Forward to Client
            async def receive_from_deepgram():
                try:
                    async for message in dg_ws:
                        if isinstance(message, bytes):
                            # Binary audio data - forward directly to client
                            await websocket.send_bytes(message)
                        else:
                            # JSON events from Deepgram Agent
                            try:
                                data = json.loads(message)
                                msg_type = data.get("type", "")
                                
                                logger.info(f"[Deepgram Agent] {msg_type}: {json.dumps(data)[:200]}")
                                
                                # Forward relevant events to client
                                if msg_type == "Welcome":
                                    await websocket.send_json({
                                        "type": "connected",
                                        "session_id": data.get("session_id"),
                                    })
                                
                                elif msg_type == "SettingsApplied":
                                    logger.info("Agent settings applied successfully")
                                
                                elif msg_type == "UserStartedSpeaking":
                                    # Critical for barge-in: tell client to stop playback
                                    await websocket.send_json({"type": "user_started_speaking"})
                                
                                elif msg_type == "UserStoppedSpeaking":
                                    await websocket.send_json({"type": "user_stopped_speaking"})
                                
                                elif msg_type == "AgentStartedSpeaking":
                                    await websocket.send_json({"type": "agent_started_speaking"})
                                
                                elif msg_type == "AgentAudioDone":
                                    await websocket.send_json({"type": "agent_audio_done"})
                                
                                elif msg_type == "ConversationText":
                                    # Forward transcripts and responses
                                    await websocket.send_json({
                                        "type": "conversation_text",
                                        "role": data.get("role"),
                                        "content": data.get("content"),
                                    })
                                
                                elif msg_type == "AgentThinking":
                                    # Agent's internal reasoning (optional display)
                                    content = data.get("content", "")
                                    if content:
                                        await websocket.send_json({
                                            "type": "agent_thinking",
                                            "content": content,
                                        })
                                
                                elif msg_type == "Error":
                                    logger.error(f"Deepgram Agent Error: {data}")
                                    await websocket.send_json({
                                        "type": "error",
                                        "message": data.get("description", "Unknown error"),
                                    })
                                
                                elif msg_type == "CloseConnection":
                                    logger.info("Deepgram requested close")
                                    break
                                    
                            except json.JSONDecodeError:
                                logger.warning(f"Non-JSON message from Deepgram: {message[:100]}")
                                
                except websockets.exceptions.ConnectionClosed as e:
                    logger.info(f"Deepgram connection closed: {e}")
                except Exception as e:
                    logger.error(f"Error receiving from Deepgram: {e}")

            # Task: Receive from Client -> Forward to Deepgram
            async def send_to_deepgram():
                try:
                    while True:
                        # Receive binary audio from client
                        message = await websocket.receive()
                        
                        if "bytes" in message:
                            # Forward audio to Deepgram
                            await dg_ws.send(message["bytes"])
                        elif "text" in message:
                            # Handle JSON commands from client
                            try:
                                data = json.loads(message["text"])
                                cmd_type = data.get("type", "")
                                
                                if cmd_type == "close":
                                    # Graceful close
                                    await dg_ws.send(json.dumps({"type": "CloseStream"}))
                                    break
                                elif cmd_type == "inject_message":
                                    # Allow client to inject agent message
                                    await dg_ws.send(json.dumps({
                                        "type": "InjectAgentMessage",
                                        "message": data.get("message", ""),
                                    }))
                            except json.JSONDecodeError:
                                pass
                                
                except WebSocketDisconnect:
                    logger.info("Client disconnected")
                    try:
                        await dg_ws.send(json.dumps({"type": "CloseStream"}))
                    except:
                        pass
                except Exception as e:
                    logger.error(f"Error sending to Deepgram: {e}")

            # Run both tasks concurrently
            receiver_task = asyncio.create_task(receive_from_deepgram())
            sender_task = asyncio.create_task(send_to_deepgram())
            
            # Wait for either to complete (usually sender when client disconnects)
            done, pending = await asyncio.wait(
                [receiver_task, sender_task],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            # Cancel remaining tasks
            for task in pending:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

    except websockets.exceptions.InvalidStatusCode as e:
        logger.error(f"Deepgram connection rejected: {e}")
        await websocket.send_json({"type": "error", "message": f"Connection rejected: {e.status_code}"})
    except Exception as e:
        logger.error(f"Unified Voice Agent Error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass

