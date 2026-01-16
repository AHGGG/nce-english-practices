"""
TTS API Router - Text-to-Speech endpoints
"""

from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
import io

from app.services.tts import tts_service

router = APIRouter(prefix="/api/tts", tags=["TTS"])


@router.get("")
async def text_to_speech(
    text: str = Query(..., description="Text to convert to speech"),
    voice: str = Query(None, description="Optional voice name"),
):
    """
    Convert text to speech and return audio stream.

    Args:
        text: Text to speak
        voice: Optional voice name (defaults to en-US-AndrewMultilingualNeural)

    Returns:
        Audio stream (MP3)
    """
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    if len(text) > 2000:
        raise HTTPException(status_code=400, detail="Text too long (max 2000 chars)")

    try:
        audio_data = await tts_service.generate_audio(text, voice)

        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline",
                "Content-Length": str(len(audio_data)),
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")
