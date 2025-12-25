from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.services.aui_input import AUIUserInput, input_service

router = APIRouter()


@router.post("/input", summary="Submit User Input to Agent")
@router.post("/input", summary="Submit User Input to Agent")
async def handle_aui_input(
    input_data: AUIUserInput,
    db: AsyncSession = Depends(get_db)
):
    """
    Receives user interactions (clicks, form submits) and signals the waiting Agent.
    Used for Human-in-the-Loop (HITL) flows where the agent pauses for user input.
    """
    success = await input_service.submit_input(db, input_data)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to process input")
        
    return {"status": "accepted", "action": input_data.action}

