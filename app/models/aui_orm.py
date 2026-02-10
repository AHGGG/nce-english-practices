from datetime import datetime
from typing import Any, Dict, Optional
from sqlalchemy import String, Integer, Boolean, TIMESTAMP, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.core.db import Base


class AUIInputRecord(Base):
    """
    Persisted user inputs for AUI Human-in-the-Loop workflows.
    Uses Postgres LISTEN/NOTIFY for real-time signaling.
    """

    __tablename__ = "aui_inputs"
    __table_args__ = (
        Index("idx_aui_input_session", "session_id"),
        Index("idx_aui_input_processed", "processed"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String, index=True)
    action: Mapped[str] = mapped_column(String)
    payload: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)

    processed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    processed_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)
