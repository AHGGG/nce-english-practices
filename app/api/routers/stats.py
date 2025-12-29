from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Dict
from app.database import (
    get_user_stats, 
    get_performance_data,
    get_due_reviews_count,
    get_milestones,
    get_reading_stats,
    get_user_goals,
    update_user_goals,
    get_goals_progress,
    get_memory_curve_data
)

router = APIRouter()


class GoalsUpdate(BaseModel):
    goals: Dict[str, int]


@router.get("/api/stats")
async def api_get_stats():
    return await get_user_stats()


@router.get("/api/performance")
async def api_get_performance(days: int = Query(30, ge=7, le=365)):
    """
    Get performance dashboard data (V3).
    Returns all metrics: vocab, activity, milestones, goals, memory curve.
    """
    # Get base performance data
    data = await get_performance_data(days=days)
    
    # Add V2 fields
    data["due_reviews_count"] = await get_due_reviews_count()
    data["milestones"] = await get_milestones()
    data["reading_stats"] = await get_reading_stats()
    
    # Add V3 fields (Phase 3-4)
    data["goals_progress"] = await get_goals_progress()
    data["memory_curve"] = await get_memory_curve_data()
    
    return data


@router.get("/api/goals")
async def api_get_goals():
    """Get user's daily learning goals."""
    return await get_user_goals()


@router.put("/api/goals")
async def api_update_goals(body: GoalsUpdate):
    """Update user's daily learning goals."""
    success = await update_user_goals("default_user", body.goals)
    return {"success": success}


@router.get("/api/goals/progress")
async def api_get_goals_progress():
    """Get today's progress toward goals."""
    return await get_goals_progress()
