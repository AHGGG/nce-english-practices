from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
import base64
import asyncio
from app.config import settings
from app.services.llm import llm_service

router = APIRouter()

# Voice Config - Use model from user's reference
VOICE_MODEL_NAME = settings.GEMINI_VOICE_MODEL_NAME

class VoiceTokenRequest(BaseModel):
    topic: str
    mission_context: str
    tense: str

@router.websocket("/ws/voice")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("WS: Client Connected")

    client_connected = True  # Track browser connection state

    async def send_to_gemini(session):
        nonlocal client_connected
        try:
            while client_connected:
                msg = await websocket.receive_json()
                if msg.get("type") == "audio":
                    audio_data = base64.b64decode(msg["data"])
                    await session.send_realtime_input(
                        audio={"data": audio_data, "mime_type": "audio/pcm"}
                    )
        except WebSocketDisconnect:
            print("WS: Browser Disconnected")
            client_connected = False
        except Exception as e:
            print(f"Error in send_to_gemini: {e}")
            client_connected = False

    async def receive_from_gemini(session):
        nonlocal client_connected
        try:
            while client_connected:
                turn = session.receive()
                async for response in turn:
                    if response.server_content:
                        # print(f"DEBUG: ServerContent:T={type(response.server_content)} V={response.server_content}")
                        pass

                    # 1. Handle User Transcription (New)
                    if response.server_content and getattr(response.server_content, 'input_transcription', None):
                        trx = response.server_content.input_transcription
                        user_text = getattr(trx, 'text', None)

                        if user_text and client_connected:
                             await websocket.send_json({
                                "type": "transcript",
                                "text": user_text,
                                "isUser": True
                            })

                    # 2. Handle AI Speech Transcription (Output)
                    if response.server_content and getattr(response.server_content, 'output_transcription', None):
                        trx = response.server_content.output_transcription
                        ai_text = getattr(trx, 'text', None)

                        if ai_text and client_connected:
                             await websocket.send_json({
                                "type": "transcript",
                                "text": ai_text,
                                "isUser": False
                            })

                    # 3. Handle Model Turn (Audio & Text)
                    if response.server_content and response.server_content.model_turn:
                        for part in response.server_content.model_turn.parts:
                            if part.inline_data and isinstance(part.inline_data.data, bytes):
                                b64_data = base64.b64encode(part.inline_data.data).decode('utf-8')
                                if client_connected:
                                    await websocket.send_json({
                                        "type": "audio",
                                        "data": b64_data
                                    })

                            # Only send text if it's NOT a thought (avoid internal monologue)
                            is_thought = getattr(part, 'thought', False)
                            if part.text and not is_thought and client_connected:
                                await websocket.send_json({
                                    "type": "transcript",
                                    "text": part.text,
                                    "isUser": False
                                })

                    if response.server_content and response.server_content.turn_complete:
                        if client_connected:
                            await websocket.send_json({"type": "turnComplete"})

                    if response.server_content and response.server_content.interrupted:
                        if client_connected:
                            await websocket.send_json({"type": "interrupted"})
        except Exception as e:
            print(f"Error in receive_from_gemini: {e}")
            client_connected = False

    try:
        # 1. Wait for frontend config (Handshake)
        config_data = await websocket.receive_json()
        print(f"WS: Received Config: {config_data}")

        voice_name = config_data.get("voiceName", "Puck")
        sys_instruction = config_data.get("systemInstruction", "You are a helpful AI assistant.")

        print(f"WS: Config - Voice: {voice_name}, Instruction length: {len(sys_instruction)}")

        if not llm_service.voice_client:
            print("WS: Voice Client Unavailable")
            await websocket.close()
            return

        # 2. Connect to Gemini Live API
        async with llm_service.voice_client.aio.live.connect(
            model=VOICE_MODEL_NAME,
            config={
                "response_modalities": ["AUDIO"],
                "speech_config": {
                    "voice_config": {"prebuilt_voice_config": {"voice_name": voice_name}}
                },
                "input_audio_transcription": {},
                "output_audio_transcription": {},
                "system_instruction": {"parts": [{"text": sys_instruction}]}
            }
        ) as session:
            print("WS: Connected to Gemini Live")

            # Notify client that we are ready
            if client_connected:
                await websocket.send_json({"type": "server_ready"})

            # 3. Run tasks with TaskGroup for proper calculation
            try:
                async with asyncio.TaskGroup() as tg:
                    tg.create_task(send_to_gemini(session))
                    tg.create_task(receive_from_gemini(session))
            except* Exception as eg:
                for exc in eg.exceptions:
                    print(f"Task error: {exc}")

    except WebSocketDisconnect:
        print("WS: Connection Closed (Handshake)")
    except Exception as e:
        print(f"WS: Error: {e}")
    finally:
        client_connected = False
        try:
            await websocket.close()
        except:
            pass
        print("WS: Cleanup Complete")


@router.post("/api/voice/token")
async def api_voice_token(payload: VoiceTokenRequest):
    return {
        "url": "/ws/voice",
        "token": "proxy"
    }
