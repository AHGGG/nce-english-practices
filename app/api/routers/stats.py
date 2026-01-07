"""
Simplified Stats API Router.
Removed: /api/stats (legacy Attempt-based stats), goals endpoints.
Kept: /api/performance (simplified)
"""
import asyncio
from fastapi import APIRouter, Query
from app.database import get_performance_data, get_memory_curve_data

router = APIRouter()


@router.get("/api/performance")
async def api_get_performance(days: int = Query(30, ge=7, le=365)):
    """
    Get simplified performance dashboard data.
    Returns: study_time (Sentence Study + Reading), reading_stats, memory_curve.
    """
    # ⚡ OPTIMIZATION: Fetch performance data and memory curve in parallel
    # This reduces total latency by running independent DB queries concurrently
    perf_task = get_performance_data(days=days)
    curve_task = get_memory_curve_data()

    data, curve_data = await asyncio.gather(perf_task, curve_task)

    data["memory_curve"] = curve_data
    return data
