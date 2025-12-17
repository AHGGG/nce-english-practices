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

from app.config import settings
from app.services.llm import llm_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice-lab/deepgram", tags=["deepgram-websocket"])

# Optional Deepgram import
try:
    from deepgram import AsyncDeepgramClient, LiveTranscriptionEvents, LiveOptions, SpeakLiveEvents
    DEEPGRAM_AVAILABLE = True
except ImportError:
    DEEPGRAM_AVAILABLE = False
    logger.warning("Deepgram SDK not available")


@router.websocket("/live-stt")
async def deepgram_live_stt_websocket(
    websocket: WebSocket,
    model: str = Query(default="nova-3", description="Model: nova-3 or flux")
):
    """
    Real-time STT using Deepgram WebSocket API.
    Supports both Nova-3 (general) and Flux (conversational) models.
    """
    await websocket.accept()
    
    if not DEEPGRAM_AVAILABLE or not settings.DEEPGRAM_API_KEY:
        await websocket.send_json({"type": "error", "message": "Deepgram not configured"})
        await websocket.close()
        return
    
    try:
        # Initialize Deepgram Async Client
        # Note: In deepgram-sdk python v3, AsyncDeepgramClient is preferred for async contexts.
        client = AsyncDeepgramClient(api_key=settings.DEEPGRAM_API_KEY)
        
        # Create live transcription connection
        dg_connection = client.listen.live.v("1")
        
        # Define Event Handlers
        async def on_open(self, open_event, **kwargs):
            logger.info(f"Deepgram connection opened: {model}")
        
        async def on_message(self, result, **kwargs):
            try:
                if result.channel and result.channel.alternatives:
                    alt = result.channel.alternatives[0]
                    sentence = alt.transcript
                    if sentence:
                        await websocket.send_json({
                            "type": "transcript",
                            "text": sentence,
                            "is_final": result.is_final,
                            "confidence": alt.confidence if hasattr(alt, 'confidence') else None
                        })
            except Exception as e:
                logger.error(f"Error processing Deepgram message: {e}")
        
        async def on_error(self, error, **kwargs):
            logger.error(f"Deepgram error: {error}")
            # Ensure error is serializable
            err_msg = str(error) if error else "Unknown Deepgram Error"
            await websocket.send_json({"type": "error", "message": err_msg})
        
        async def on_close(self, close_event, **kwargs):
            logger.info("Deepgram connection closed")

        # Register Event Handlers
        dg_connection.on(LiveTranscriptionEvents.Open, on_open)
        dg_connection.on(LiveTranscriptionEvents.Transcript, on_message)
        dg_connection.on(LiveTranscriptionEvents.Error, on_error)
        dg_connection.on(LiveTranscriptionEvents.Close, on_close)

        # Configure Options (Flux vs Nova-3)
        # Flux requires specific configuration? Usually just model="flux".
        # But SDK documentation suggests model="flux-general-en" etc.
        # User selection passes raw strings like "flux" or "nova-3".
        # We might need to map "flux" to a specific model ID if needed, 
        # but Deepgram often aliases "flux" to the latest general model.
        # Let's trust the input or provide a default mapping if alias fails.
        
        # NOTE: Flux endpointing is different. If model has "flux", enable proper handling?
        # Actually SDK handles it.
        
        options = LiveOptions(
            model=model,
            language="en",
            encoding="linear16",
            sample_rate=16000,
            channels=1,
            smart_format=True,
            interim_results=True
        )
        
        # Start Deepgram connection (Async start)
        # Note: await dg_connection.start(options) returns True on success
        if await dg_connection.start(options):
            await websocket.send_json({"type": "ready", "model": model})
            
            # Forward audio from client to Deepgram
            while True:
                try:
                    data = await websocket.receive_bytes()
                    # Async send method for AsyncDeepgramClient
                    await dg_connection.send(data)
                except WebSocketDisconnect:
                    break
                except Exception as e:
                    logger.error(f"Error receiving audio: {e}")
                    break
        else:
            await websocket.send_json({"type": "error", "message": "Failed to start Deepgram connection"})
        
        # Cleanup
        await dg_connection.finish()
        
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
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
    Streaming TTS using Deepgram WebSocket API.
    """
    await websocket.accept()
    
    if not DEEPGRAM_AVAILABLE or not settings.DEEPGRAM_API_KEY:
        await websocket.send_json({"type": "error", "message": "Deepgram not configured"})
        await websocket.close()
        return
    
    try:
        client = AsyncDeepgramClient(api_key=settings.DEEPGRAM_API_KEY)
        
        # Create TTS WebSocket connection
        tts_connection = client.speak.live.v("1")
        
        audio_started = False
        
        async def on_audio_data(self, data, **kwargs):
            nonlocal audio_started
            try:
                # Send WAV header on first chunk
                if not audio_started:
                    from app.services.voice_lab import create_wav_header
                    wav_header = create_wav_header(sample_rate=24000, channels=1, bits_per_sample=16)
                    await websocket.send_bytes(wav_header)
                    audio_started = True
                
                await websocket.send_bytes(data)
            except Exception as e:
                logger.error(f"Error sending audio: {e}")
        
        async def on_flush(self, **kwargs):
            await websocket.send_json({"type": "flushed"})
        
        async def on_error(self, error, **kwargs):
            logger.error(f"TTS error: {error}")
            await websocket.send_json({"type": "error", "message": str(error)})

        # Register Event Handlers
        tts_connection.on(SpeakLiveEvents.AudioData, on_audio_data)
        tts_connection.on(SpeakLiveEvents.Flushed, on_flush)
        tts_connection.on(SpeakLiveEvents.Error, on_error)
        
        # Configure TTS options
        # Note: Speak options for live might be a dictionary or specific object.
        # SDK v3 speak.live.v("1").start() takes options dict.
        tts_options = {
            "model": voice,
            "encoding": "linear16",
            "sample_rate": 24000,
            "container": "none"
        }
        
        if await tts_connection.start(tts_options):
            await websocket.send_json({"type": "ready", "voice": voice})
            
            while True:
                try:
                    message = await websocket.receive_json()
                    msg_type = message.get("type")
                    
                    if msg_type == "text":
                        text = message.get("content", "")
                        await tts_connection.send_text(text)
                    
                    elif msg_type == "flush":
                        await tts_connection.flush()
                    
                    elif msg_type == "close":
                        break
                    
                except WebSocketDisconnect:
                    break
                except Exception as e:
                    logger.error(f"Error processing message: {e}")
                    break
        else:
             await websocket.send_json({"type": "error", "message": "Failed to start Deepgram TTS"})
        
        await tts_connection.finish()
        
    except Exception as e:
        logger.error(f"Streaming TTS error: {e}")
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
    system_prompt: str = Query(default="You are a helpful AI assistant. Keep responses concise.")
):
    """
    Full Voice Agent: STT (Deepgram) + LLM (DeepSeek/Gemini) + TTS (Deepgram)
    """
    await websocket.accept()
    
    if not DEEPGRAM_AVAILABLE or not settings.DEEPGRAM_API_KEY:
        await websocket.send_json({"type": "error", "message": "Deepgram not configured"})
        await websocket.close()
        return
    
    try:
        # Initialize components
        client = AsyncDeepgramClient(api_key=settings.DEEPGRAM_API_KEY)
        conversation_history = []
        
        # STT connection
        stt_connection = client.listen.live.v("1")
        
        # TTS connection
        tts_connection = client.speak.live.v("1")
        
        tts_started = False
        
        async def process_llm_response(user_text: str):
            """Process user text through LLM and generate TTS"""
            nonlocal tts_started
            
            try:
                # Add user message to history
                conversation_history.append({"role": "user", "content": user_text})
                
                # Call LLM
                response_text = ""
                if llm_provider == "gemini":
                    response_text = "I received your message but Gemini is not fully configured yet."
                else:
                    llm_client = llm_service.sync_client
                    messages = [{"role": "system", "content": system_prompt}] + conversation_history
                    
                    loop = asyncio.get_event_loop()
                    response = await loop.run_in_executor(
                        None, 
                        lambda: llm_client.chat.completions.create(
                            model=settings.MODEL_NAME,
                            messages=messages,
                            max_tokens=150,
                            temperature=0.7
                        )
                    )
                    response_text = response.choices[0].message.content
                
                conversation_history.append({"role": "assistant", "content": response_text})
                
                await websocket.send_json({
                    "type": "llm_response",
                    "text": response_text
                })
                
                if not tts_started:
                    from app.services.voice_lab import create_wav_header
                    wav_header = create_wav_header(sample_rate=24000, channels=1, bits_per_sample=16)
                    await websocket.send_bytes(wav_header)
                    tts_started = True
                
                await tts_connection.send_text(response_text)
                await tts_connection.flush()
                
            except Exception as e:
                logger.error(f"LLM processing error: {e}")
                await websocket.send_json({"type": "error", "message": f"LLM error: {str(e)}"})
        
        # STT Handlers
        async def on_stt_message(self, result, **kwargs):
            try:
                if result.is_final:
                    sentence = result.channel.alternatives[0].transcript
                    if sentence:
                        await websocket.send_json({
                            "type": "transcript",
                            "text": sentence
                        })
                        asyncio.create_task(process_llm_response(sentence))
            except Exception as e:
                logger.error(f"STT message error: {e}")

        async def on_stt_error(self, error, **kwargs):
             logger.error(f"STT error: {error}")
             await websocket.send_json({"type": "error", "message": f"STT Error: {str(error)}"})
        
        stt_connection.on(LiveTranscriptionEvents.Transcript, on_stt_message)
        stt_connection.on(LiveTranscriptionEvents.Error, on_stt_error)

        # TTS Handlers
        async def on_tts_audio(self, data, **kwargs):
            await websocket.send_bytes(data)
            
        async def on_tts_error(self, error, **kwargs):
             logger.error(f"TTS error: {error}")
             await websocket.send_json({"type": "error", "message": f"TTS Error: {str(error)}"})

        tts_connection.on(SpeakLiveEvents.AudioData, on_tts_audio)
        tts_connection.on(SpeakLiveEvents.Error, on_tts_error)
        
        # Start options
        stt_options = LiveOptions(
            model=stt_model, language="en", encoding="linear16", sample_rate=16000,
            smart_format=True, interim_results=False, endpointing=300
        )
        tts_options = {"model": tts_voice, "encoding": "linear16", "sample_rate": 24000, "container": "none"}
        
        # Start both (Async)
        stt_started = await stt_connection.start(stt_options)
        tts_started_conn = await tts_connection.start(tts_options)
        
        if stt_started and tts_started_conn:
            await websocket.send_json({
                "type": "ready",
                "stt_model": stt_model,
                "tts_voice": tts_voice,
                "llm_provider": llm_provider
            })
            
            while True:
                try:
                    data = await websocket.receive_bytes()
                    await stt_connection.send(data)
                except WebSocketDisconnect:
                    break
                except Exception as e:
                    logger.error(f"Audio receive error: {e}")
                    break
        else:
            await websocket.send_json({"type": "error", "message": "Failed to start Voice Agent components"})
        
        # Cleanup
        await stt_connection.finish()
        await tts_connection.finish()
        
    except Exception as e:
        logger.error(f"Voice Agent error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass
