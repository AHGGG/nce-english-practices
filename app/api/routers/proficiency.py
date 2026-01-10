from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.services.proficiency_service import proficiency_service

router = APIRouter(tags=["Proficiency"])


class WordUpdatePayload(BaseModel):
    word: str
    status: str = "mastered"  # mastered, learning


class SweepPayload(BaseModel):
    swept_words: List[str]
    inspected_words: List[str]
    book_code: Optional[str] = None  # Context for analysis


@router.put("/api/proficiency/word")
async def update_word_proficiency(payload: WordUpdatePayload):
    """
    Explicitly update a word's status (e.g., Mark as Known).
    """
    try:
        record = await proficiency_service.master_word(
            word=payload.word,
            user_id="default_user",  # TODO: Auth
            source="manual",
        )
        return {"status": "success", "word": record.word, "new_status": record.status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/proficiency/sweep")
async def sweep_words(payload: SweepPayload):
    """
    Batch mark words as known (Sweep) and analyze frequency bands.
    """
    try:
        result = await proficiency_service.process_sweep(
            user_id="default_user",
            swept_words=payload.swept_words,
            inspected_words=payload.inspected_words,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CalibrationItem(BaseModel):
    sentence_text: str
    status: str  # clear, confused
    confused_words: List[str] = []


class CalibrationPayload(BaseModel):
    session_data: List[CalibrationItem]


@router.post("/api/proficiency/calibrate")
async def calibrate_proficiency(payload: CalibrationPayload):
    """
    Process a calibration session to update proficiency and diagnose syntax gaps.
    """
    try:
        # Convert Pydantic models to dicts for service
        session_data = [item.model_dump() for item in payload.session_data]

        result = await proficiency_service.analyze_calibration(
            user_id="default_user", session_data=session_data
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/proficiency/calibration/session")
async def get_calibration_session(level: int = 0, count: int = 5):
    """
    Get a new batch of sentences for the calibration session.
    """
    try:
        sentences = await proficiency_service.generate_calibration_session(
            level=level, count=count
        )
        return {"sentences": sentences, "level": level}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Calibration Level Persistence ---


class CalibrationLevelPayload(BaseModel):
    level: int  # 0-11


@router.put("/api/proficiency/calibration/level")
async def save_calibration_level(payload: CalibrationLevelPayload):
    """
    Save user's calibration level.
    Called after calibration is complete.
    """
    try:
        result = await proficiency_service.save_calibration_level(
            level=payload.level, user_id="default_user"
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/proficiency/calibration/level")
async def get_calibration_level():
    """
    Get user's saved calibration level.
    Used by Reading Mode to auto-select highlight band.
    """
    try:
        result = await proficiency_service.get_calibration_level(user_id="default_user")
        if result is None:
            return {"level": None, "message": "No calibration found"}
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
