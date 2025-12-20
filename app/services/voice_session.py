import asyncio
import base64
from fastapi import WebSocket, WebSocketDisconnect
from app.config import settings
from app.services.llm import llm_service

VOICE_MODEL_NAME = settings.GEMINI_VOICE_MODEL_NAME

class VoiceSession:
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.client_connected = True
        self.voice_name = "Puck"
        self.sys_instruction = "You are a helpful AI assistant."

    async def run(self):
        """
        Main entry point: Handle handshake, connect to Gemini, and manage bidirectional streaming.
        """
        try:
            # 1. Handshake (Wait for config)
            config_data = await self.websocket.receive_json()
            print(f"WS: Received Config: {config_data}")

            self.voice_name = config_data.get("voiceName", "Puck")
            self.sys_instruction = config_data.get("systemInstruction", "You are a helpful AI assistant.")

            print(f"WS: Config - Voice: {self.voice_name}, Instruction length: {len(self.sys_instruction)}")

            if not llm_service.voice_client:
                print("WS: Voice Client Unavailable")
                await self.websocket.close()
                return

            # 2. Connect to Gemini & Start Loops
            async with llm_service.voice_client.aio.live.connect(
                model=VOICE_MODEL_NAME,
                config={
                    "response_modalities": ["AUDIO"],
                    "speech_config": {
                        "voice_config": {"prebuilt_voice_config": {"voice_name": self.voice_name}}
                    },
                    "input_audio_transcription": {},
                    "output_audio_transcription": {},
                    "system_instruction": {"parts": [{"text": self.sys_instruction}]}
                }
            ) as session:
                print("WS: Connected to Gemini Live")
                
                # Notify frontend
                await self.websocket.send_json({"type": "server_ready"})

                # 3. Task Group for Bidirectional Streams
                # Use TaskGroup to ensure if one fails, both are cancelled
                try:
                    async with asyncio.TaskGroup() as tg:
                        tg.create_task(self._send_loop(session))
                        tg.create_task(self._receive_loop(session))
                except* Exception as eg:
                    for exc in eg.exceptions:
                        print(f"WS: Task error: {exc}")

        except WebSocketDisconnect:
            print("WS: Connection Closed (Handshake/Loop)")
        except Exception as e:
            # Check for Google API errors
            print(f"WS: Connection Error: {e}")
            if hasattr(e, 'status_code'):
                 print(f"WS: API Status Code: {e.status_code}")
            if hasattr(e, 'message'):
                 print(f"WS: API Message: {e.message}")
        finally:
            self.client_connected = False
            try:
                await self.websocket.close()
            except:
                pass
            print("WS: Cleanup Complete")

    async def _send_loop(self, session):
        """
        Frontend -> Gemini (Audio Data)
        """
        try:
            while self.client_connected:
                msg = await self.websocket.receive_json()
                if msg.get("type") == "audio":
                    audio_data = base64.b64decode(msg["data"])
                    await session.send_realtime_input(
                        audio={"data": audio_data, "mime_type": "audio/pcm"}
                    )
        except WebSocketDisconnect:
            print("WS: Browser Disconnected")
            self.client_connected = False
            raise # Propagate to cancel other task
        except Exception as e:
            print(f"Error in _send_loop: {e}")
            self.client_connected = False
            raise

    async def _receive_loop(self, session):
        """
        Gemini -> Frontend (Audio, Transcript, Control Signals)
        """
        try:
            while self.client_connected:
                turn = session.receive()
                async for response in turn:
                    if not self.client_connected:
                        break

                    if response.server_content:
                        # 1. User Transcription
                        if getattr(response.server_content, 'input_transcription', None):
                            trx = response.server_content.input_transcription
                            user_text = getattr(trx, 'text', None)
                            if user_text:
                                await self.websocket.send_json({
                                    "type": "transcript",
                                    "text": user_text,
                                    "isUser": True
                                })

                        # 2. AI Speech Transcription
                        if getattr(response.server_content, 'output_transcription', None):
                            trx = response.server_content.output_transcription
                            ai_text = getattr(trx, 'text', None)
                            if ai_text:
                                await self.websocket.send_json({
                                    "type": "transcript",
                                    "text": ai_text,
                                    "isUser": False
                                })

                        # 3. Model Turn (Audio & Text)
                        if response.server_content.model_turn:
                            for part in response.server_content.model_turn.parts:
                                if part.inline_data and isinstance(part.inline_data.data, bytes):
                                    b64_data = base64.b64encode(part.inline_data.data).decode('utf-8')
                                    await self.websocket.send_json({
                                        "type": "audio",
                                        "data": b64_data
                                    })

                                is_thought = getattr(part, 'thought', False)
                                if part.text and not is_thought:
                                    await self.websocket.send_json({
                                        "type": "transcript",
                                        "text": part.text,
                                        "isUser": False
                                    })

                        if response.server_content.turn_complete:
                            await self.websocket.send_json({"type": "turnComplete"})

                        if response.server_content.interrupted:
                            await self.websocket.send_json({"type": "interrupted"})

        except Exception as e:
            print(f"Error in _receive_loop: {e}")
            self.client_connected = False
            raise
