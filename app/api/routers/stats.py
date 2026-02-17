"""
Simplified Stats API Router.
Removed: /api/stats (legacy Attempt-based stats), goals endpoints.
Kept: /api/performance (simplified)
"""

import asyncio
from fastapi import APIRouter, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps.auth import get_current_user_id
from app.database import (
    get_performance_data,
    get_memory_curve_data,
    get_daily_study_time,
)
from app.core.db import get_db, AsyncSessionLocal

router = APIRouter()


@router.get("/api/performance")
async def api_get_performance(
    days: int = Query(30, ge=7, le=365), user_id: str = Depends(get_current_user_id)
):
    """
    Get simplified performance dashboard data.
    Returns: study_time (Sentence Study + Reading), reading_stats, memory_curve.
    """

    # ⚡ OPTIMIZATION: Fetch performance data and memory curve in parallel
    # This reduces total latency by running independent DB queries concurrently
    async def load_performance():
        async with AsyncSessionLocal() as perf_db:
            return await get_performance_data(days=days, user_id=user_id, db=perf_db)

    async def load_curve():
        async with AsyncSessionLocal() as curve_db:
            return await get_memory_curve_data(user_id=user_id, db=curve_db)

    data, curve_data = await asyncio.gather(load_performance(), load_curve())

    data["memory_curve"] = curve_data
    return data


@router.get("/api/performance/study-time")
async def api_get_study_time_detail(
    days: int = Query(30, ge=7, le=365),
    tz: str = Query(
        "UTC",
        description="User's IANA timezone (e.g., Asia/Shanghai, America/New_York)",
    ),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed daily study time breakdown.

    The 'tz' parameter specifies the user's local timezone for correct daily grouping.
    Without this, early morning sessions (e.g., 7AM Beijing time) would be incorrectly
    attributed to the previous day (since 7AM Beijing = 23:00 UTC previous day).
    """
    return await get_daily_study_time(days=days, user_id=user_id, timezone=tz, db=db)
