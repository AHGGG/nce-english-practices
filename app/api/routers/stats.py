from fastapi import APIRouter, Query
from app.database import (
    get_user_stats, 
    get_performance_data,
    get_due_reviews_count,
    get_milestones,
    get_reading_stats
)

router = APIRouter()

@router.get("/api/stats")
async def api_get_stats():
    return await get_user_stats()


@router.get("/api/performance")
async def api_get_performance(days: int = Query(30, ge=7, le=365)):
    """
    Get performance dashboard data (V2).
    Returns vocab stats, activity heatmap, source distribution,
    plus due reviews, milestones, and reading stats.
    """
    # Get base performance data
    data = await get_performance_data(days=days)
    
    # Add V2 fields
    data["due_reviews_count"] = await get_due_reviews_count()
    data["milestones"] = await get_milestones()
    data["reading_stats"] = await get_reading_stats()
    
    return data
