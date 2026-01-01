from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

from app.database import log_attempt

router = APIRouter()


class GenericLogRequest(BaseModel):
    activity_type: str  # quiz, mission
    topic: str
    tense: str
    is_pass: bool
    details: Optional[Dict[str, Any]] = None
    duration_seconds: int = 0


@router.post("/api/log_attempt")
async def api_log_generic(payload: GenericLogRequest):
    try:
        await log_attempt(
            activity_type=payload.activity_type,
            topic=payload.topic,
            tense=payload.tense,
            input_data={},
            user_response=payload.details or {},
            is_pass=payload.is_pass,
            duration_seconds=payload.duration_seconds
        )
        return {"status": "ok"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": "Internal Server Error"}

