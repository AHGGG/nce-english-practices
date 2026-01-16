from fastapi import WebSocket, WebSocketDisconnect, Query
from app.config import settings
import logging
import json
import asyncio
import websockets

logger = logging.getLogger(__name__)


async def deepgram_live_stt_websocket(
    websocket: WebSocket,
    model: str = Query(default="nova-3", description="Model: nova-3 or flux"),
):
    """
    Real-time STT using Deepgram WebSocket API (Raw Proxy).
    Docs: https://developers.deepgram.com/docs/listen-live
    """
    await websocket.accept()

    if not settings.DEEPGRAM_API_KEY:
        await websocket.send_json(
            {"type": "error", "message": "Deepgram API Key not configured"}
        )
        await websocket.close()
        return

    # Construct Deepgram WebSocket URL
    is_flux = model == "flux" or model.startswith("flux-")

    if is_flux:
        actual_model = "flux-general-en" if model == "flux" else model
        base_url = "wss://api.deepgram.com/v2/listen"
        params = f"model={actual_model}&encoding=linear16&sample_rate=16000"
    else:
        base_url = "wss://api.deepgram.com/v1/listen"
        params = f"model={model}&smart_format=true&interim_results=true&channels=1"
    dg_url = f"{base_url}?{params}"

    headers = {"Authorization": f"Token {settings.DEEPGRAM_API_KEY}"}

    try:
        logger.info(f"Connecting to Deepgram URL: {dg_url}")
        async with websockets.connect(dg_url, additional_headers=headers) as dg_ws:
            logger.info(f"Connected to Deepgram Live: {model}")
            await websocket.send_json({"type": "ready", "model": model})

            async def receive_from_deepgram():
                try:
                    async for msg in dg_ws:
                        data = json.loads(msg)

                        logger.info(f"[Deepgram RAW] {json.dumps(data)[:500]}")

                        if is_flux:
                            msg_type = data.get("type", "")
                            if msg_type == "Connected":
                                logger.info(f"FLUX Connected: {data.get('request_id')}")
                            elif msg_type == "TurnInfo":
                                transcript = data.get("transcript", "")
                                event = data.get("event", "")
                                if transcript:
                                    await websocket.send_json(
                                        {
                                            "type": "transcript",
                                            "text": transcript,
                                            "is_final": event
                                            in ["EndOfTurn", "EagerEndOfTurn"],
                                            "event": event,
                                            "turn_index": data.get("turn_index"),
                                        }
                                    )
                            elif msg_type == "Error":
                                logger.error(f"FLUX Error: {data.get('description')}")
                        else:
                            if "channel" in data and "alternatives" in data["channel"]:
                                alt = data["channel"]["alternatives"][0]
                                transcript = alt.get("transcript", "")
                                if transcript:
                                    await websocket.send_json(
                                        {
                                            "type": "transcript",
                                            "text": transcript,
                                            "is_final": data.get("is_final", False),
                                            "confidence": alt.get("confidence"),
                                        }
                                    )
                            elif "type" in data and data["type"] == "Metadata":
                                pass
                            elif "error" in data:
                                logger.error(f"Deepgram Error: {data['error']}")

                except Exception as e:
                    logger.error(f"Error receiving from Deepgram: {e}")

            async def send_to_deepgram():
                try:
                    while True:
                        data = await websocket.receive_bytes()
                        await dg_ws.send(data)
                except WebSocketDisconnect:
                    await dg_ws.send(json.dumps({"type": "CloseStream"}))
                except Exception as e:
                    logger.error(f"Error sending to Deepgram: {e}")

            listener_task = asyncio.create_task(receive_from_deepgram())
            sender_task = asyncio.create_task(send_to_deepgram())

            await sender_task
            await asyncio.wait_for(listener_task, timeout=1.0)

    except Exception as e:
        logger.error(f"Deepgram WebSocket Error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
