from fastapi import APIRouter, WebSocket
from pydantic import BaseModel
from app.config import settings
from app.services.voice_session import VoiceSession

router = APIRouter()

# Voice Config - Use model from user's reference
VOICE_MODEL_NAME = settings.GEMINI_VOICE_MODEL_NAME


class VoiceTokenRequest(BaseModel):
    topic: str
    mission_context: str
    tense: str


from app.services.log_collector import log_collector, LogLevel, LogCategory


@router.websocket("/ws/voice")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    log_collector.log(
        "WS: Client Connected (Delegating to VoiceSession)",
        level=LogLevel.INFO,
        category=LogCategory.LIFECYCLE,
        source="backend",
    )

    session = VoiceSession(websocket)
    await session.run()


@router.post("/api/voice/token")
async def api_voice_token(payload: VoiceTokenRequest):
    return {"url": "/ws/voice", "token": "proxy"}
