from fastapi import WebSocket, WebSocketDisconnect, Query
from app.config import settings
from app.services.llm import llm_service
import logging
import json
import asyncio
import websockets

logger = logging.getLogger(__name__)

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

    is_flux_stt = stt_model == "flux" or stt_model.startswith("flux-")
    if is_flux_stt:
        actual_stt_model = "flux-general-en" if stt_model == "flux" else stt_model
        stt_url = f"wss://api.deepgram.com/v2/listen?model={actual_stt_model}&encoding=linear16&sample_rate=16000"
    else:
        stt_url = f"wss://api.deepgram.com/v1/listen?model={stt_model}&smart_format=true&channels=1&endpointing=300"
    
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
            
            async def handle_llm_and_tts(user_text):
                """Process text with LLM and stream to TTS"""
                try:
                    nonlocal tts_header_sent, conversation_history
                    
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
                                messages=conversation_history, 
                                max_tokens=150
                            )
                        )
                        response_text = response.choices[0].message.content
                    
                    conversation_history.append({"role": "assistant", "content": response_text})
                    
                    await websocket.send_json({"type": "llm_response", "text": response_text})
                    
                    await tts_ws.send(json.dumps({"type": "Speak", "text": response_text}))
                    await tts_ws.send(json.dumps({"type": "Flush"}))
                    
                except Exception as e:
                    logger.error(f"LLM/TTS Processing Error: {e}")

            async def stt_receiver():
                """Listen to STT, detect sentence, trigger LLM"""
                async for msg in stt_ws:
                    data = json.loads(msg)
                    
                    if is_flux_stt:
                        msg_type = data.get("type", "")
                        if msg_type == "TurnInfo":
                            transcript = data.get("transcript", "")
                            event = data.get("event", "")
                            is_final = event in ["EndOfTurn", "EagerEndOfTurn"] # Simple endpointing for Flux
                            
                            if transcript:
                                await websocket.send_json({"type": "transcript", "text": transcript, "is_final": is_final})
                                
                                if is_final:
                                    asyncio.create_task(handle_llm_and_tts(transcript))
                    else:
                        if "channel" in data and "alternatives" in data["channel"]:
                            alt = data["channel"]["alternatives"][0]
                            transcript = alt.get("transcript", "")
                            is_final = data.get("is_final")
                            
                            if transcript:
                                await websocket.send_json({"type": "transcript", "text": transcript, "is_final": is_final})
                                
                                if is_final:
                                    asyncio.create_task(handle_llm_and_tts(transcript))

            async def tts_receiver():
                nonlocal tts_header_sent
                async for msg in tts_ws:
                    if isinstance(msg, bytes):
                        if not tts_header_sent:
                            from app.services.voice_lab import create_wav_header
                            header = create_wav_header(sample_rate=24000) 
                            await websocket.send_bytes(header)
                            tts_header_sent = True
                        await websocket.send_bytes(msg)

            async def client_listener():
                try:
                    while True:
                        data = await websocket.receive_bytes()
                        await stt_ws.send(data)
                except WebSocketDisconnect:
                    await stt_ws.send(json.dumps({"type": "CloseStream"}))

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
        except Exception:
             pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
