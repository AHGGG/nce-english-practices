from fastapi import WebSocket, WebSocketDisconnect, Query
from app.config import settings
import logging
import json
import asyncio
import websockets

logger = logging.getLogger(__name__)


async def deepgram_streaming_tts_websocket(
    websocket: WebSocket,
    voice: str = Query(default="aura-2-asteria-en", description="Voice model"),
):
    """
    Streaming TTS using Deepgram WebSocket API (Raw Proxy).
    Docs: https://developers.deepgram.com/docs/text-to-speech
    """
    await websocket.accept()

    if not settings.DEEPGRAM_API_KEY:
        await websocket.send_json(
            {"type": "error", "message": "Deepgram API Key not configured"}
        )
        await websocket.close()
        return

    base_url = "wss://api.deepgram.com/v1/speak"
    params = f"model={voice}&encoding=linear16&sample_rate=24000&container=none"
    dg_url = f"{base_url}?{params}"

    headers = {"Authorization": f"Token {settings.DEEPGRAM_API_KEY}"}

    try:
        async with websockets.connect(
            dg_url, additional_headers=headers, open_timeout=10, close_timeout=5
        ) as dg_ws:
            logger.info(f"Connected to Deepgram TTS: {voice}")
            await websocket.send_json({"type": "ready", "voice": voice})

            audio_header_sent = False

            async def receive_from_deepgram():
                nonlocal audio_header_sent
                try:
                    async for msg in dg_ws:
                        if isinstance(msg, bytes):
                            if not audio_header_sent:
                                from app.services.voice_lab import create_wav_header

                                header = create_wav_header(
                                    sample_rate=24000, channels=1, bits_per_sample=16
                                )
                                await websocket.send_bytes(header)
                                audio_header_sent = True

                            await websocket.send_bytes(msg)
                        else:
                            meta = json.loads(msg)
                            if meta.get("type") == "Flushed":
                                await websocket.send_json({"type": "flushed"})
                            elif meta.get("type") == "error":
                                logger.error(f"Deepgram TTS Error: {meta}")

                except Exception as e:
                    logger.error(f"Error receiving audio from Deepgram: {e}")

            async def send_to_deepgram():
                try:
                    while True:
                        msg = await websocket.receive_json()
                        msg_type = msg.get("type")

                        if msg_type == "text":
                            await dg_ws.send(
                                json.dumps(
                                    {"type": "Speak", "text": msg.get("content", "")}
                                )
                            )

                        elif msg_type == "flush":
                            await dg_ws.send(json.dumps({"type": "Flush"}))

                        elif msg_type == "close":
                            await dg_ws.send(json.dumps({"type": "Close"}))
                            break

                except WebSocketDisconnect:
                    await dg_ws.send(json.dumps({"type": "Close"}))
                except Exception as e:
                    logger.error(f"Error sending text to Deepgram: {e}")

            receiver = asyncio.create_task(receive_from_deepgram())
            sender = asyncio.create_task(send_to_deepgram())

            await sender
            try:
                await asyncio.wait_for(receiver, timeout=2.0)
            except asyncio.TimeoutError:
                pass

    except Exception as e:
        logger.error(f"Deepgram TTS WebSocket Error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
