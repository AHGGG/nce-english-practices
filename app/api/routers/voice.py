from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
import base64
import asyncio
from app.config import settings
from app.services.llm import llm_service
from app.services.voice_session import VoiceSession
from app.core.utils import SAFE_INPUT_PATTERN

router = APIRouter()

# Voice Config - Use model from user's reference
VOICE_MODEL_NAME = settings.GEMINI_VOICE_MODEL_NAME

class VoiceTokenRequest(BaseModel):
    topic: str = Field(..., max_length=100, pattern=SAFE_INPUT_PATTERN)
    mission_context: str = Field(..., max_length=1000, pattern=SAFE_INPUT_PATTERN)
    tense: str = Field(..., max_length=50, pattern=SAFE_INPUT_PATTERN)

@router.websocket("/ws/voice")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("WS: Client Connected (Delegating to VoiceSession)")
    
    session = VoiceSession(websocket)
    await session.run()


@router.post("/api/voice/token")
async def api_voice_token(payload: VoiceTokenRequest):
    return {
        "url": "/ws/voice",
        "token": "proxy"
    }
