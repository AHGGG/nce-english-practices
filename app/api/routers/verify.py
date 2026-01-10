"""
Verification API Router

Provides health check endpoint for autonomous verification.
"""

from datetime import datetime
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.log_collector import log_collector
from app.core.db import get_db_health


router = APIRouter(prefix="/api/verify", tags=["verification"])


class LogEntryResponse(BaseModel):
    """A log entry in the health check response"""

    timestamp: str
    source: str
    level: str
    category: str
    message: str
    data: str | None = None


class HealthCheckResponse(BaseModel):
    """Health check response"""

    status: Literal["healthy", "unhealthy"]
    timestamp: str

    # Error summary
    error_count: int
    warning_count: int

    # Recent errors (from unified.log)
    frontend_errors: list[LogEntryResponse]
    backend_errors: list[LogEntryResponse]

    # System status
    db_connected: bool

    # Summary message for AI to quickly understand
    summary: str


@router.get("/health", response_model=HealthCheckResponse)
async def get_health():
    """
    Get system health status for autonomous verification.

    Returns recent errors from both frontend and backend,
    plus system connectivity status.
    """
    # Get recent errors (last 60 seconds)
    recent_errors = log_collector.get_recent_errors(seconds=60)

    # Separate by source
    frontend_errors = [
        LogEntryResponse(**e) for e in recent_errors if e.get("source") == "frontend"
    ]
    backend_errors = [
        LogEntryResponse(**e) for e in recent_errors if e.get("source") == "backend"
    ]

    # Count by level
    error_count = sum(1 for e in recent_errors if e.get("level") == "error")
    warning_count = sum(1 for e in recent_errors if e.get("level") == "warn")

    # Check database connectivity
    db_connected = await get_db_health()

    # Determine overall status
    is_healthy = error_count == 0 and db_connected

    # Build summary message for AI
    if is_healthy:
        summary = "✅ System healthy. No errors in the last 60 seconds."
    else:
        issues = []
        if error_count > 0:
            issues.append(f"{error_count} error(s)")
        if warning_count > 0:
            issues.append(f"{warning_count} warning(s)")
        if not db_connected:
            issues.append("database disconnected")
        summary = f"❌ Issues detected: {', '.join(issues)}"

    return HealthCheckResponse(
        status="healthy" if is_healthy else "unhealthy",
        timestamp=datetime.now().isoformat(),
        error_count=error_count,
        warning_count=warning_count,
        frontend_errors=frontend_errors,
        backend_errors=backend_errors,
        db_connected=db_connected,
        summary=summary,
    )
