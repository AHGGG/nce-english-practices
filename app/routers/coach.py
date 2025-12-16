from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from app.services.coach import coach_service
from app.services.tts import tts_service
from fastapi.responses import Response
import base64

router = APIRouter(prefix="/api/coach", tags=["coach"])

class StartSessionRequest(BaseModel):
    user_id: str = "default_user"

class ChatRequest(BaseModel):
    session_id: str
    message: str

class ChatResponse(BaseModel):
    message: str
    tool_calls: List[Dict[str, Any]] = []

@router.post("/start")
async def start_coach_session(request: StartSessionRequest):
    """
    Initialize a new coaching session.
    """
    try:
        result = await coach_service.start_session(request.user_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat", response_model=ChatResponse)
async def chat_with_coach(request: ChatRequest):
    """
    Send a message to the coach and get a response (with tool calls).
    """
    try:
        result = await coach_service.handle_turn(request.session_id, request.message)
        if "error" in result:
             raise HTTPException(status_code=400, detail=result["error"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Coach Error: {str(e)}")

class TTSRequest(BaseModel):
    text: str

@router.post("/tts")
async def text_to_speech(request: TTSRequest):
    """
    Generate audio for the given text.
    Returns: audio/mpeg binary
    """
    try:
        audio = await tts_service.generate_audio(request.text)
        return Response(content=audio, media_type="audio/mpeg")
    except Exception as e:
        print(f"TTS Error: {e}")
        raise HTTPException(status_code=500, detail="TTS generation failed")

