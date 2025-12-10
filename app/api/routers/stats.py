from fastapi import APIRouter
from app.database import get_user_stats

router = APIRouter()

@router.get("/api/stats")
async def api_get_stats():
    return await get_user_stats()
