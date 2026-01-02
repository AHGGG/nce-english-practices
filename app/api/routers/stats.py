"""
Simplified Stats API Router.
Removed: /api/stats (legacy Attempt-based stats), goals endpoints.
Kept: /api/performance (simplified)
"""
from fastapi import APIRouter, Query
from app.database import get_performance_data, get_memory_curve_data

router = APIRouter()


@router.get("/api/performance")
async def api_get_performance(days: int = Query(30, ge=7, le=365)):
    """
    Get simplified performance dashboard data.
    Returns: study_time (Sentence Study + Reading), reading_stats, memory_curve.
    """
    data = await get_performance_data(days=days)
    data["memory_curve"] = await get_memory_curve_data()
    return data
