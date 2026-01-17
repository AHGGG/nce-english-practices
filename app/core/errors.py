import logging
from fastapi import HTTPException
from typing import Optional, Any

logger = logging.getLogger(__name__)

def handle_error(
    e: Exception,
    detail: str = "Internal processing error",
    status_code: int = 500,
    log_message: Optional[str] = None
) -> None:
    """
    Securely handle exceptions by logging the full error and raising an HTTPException
    with a generic message to prevent leaking internal details to the client.

    Args:
        e: The exception that occurred.
        detail: The safe message to return to the client.
        status_code: HTTP status code (default 500).
        log_message: Optional custom log message prefix.
    """
    msg = log_message or "Internal Error"
    logger.error(f"{msg}: {e}", exc_info=True)

    # If the exception is already an HTTPException, re-raise it
    # This allows 400/404/etc to pass through if they were raised intentionally
    if isinstance(e, HTTPException):
        raise e

    raise HTTPException(status_code=status_code, detail=detail)
