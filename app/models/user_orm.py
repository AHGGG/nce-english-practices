from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Boolean, TIMESTAMP, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.core.db import Base


class User(Base):
    """
    User account for authentication.
    Designed with future public deployment in mind.
    """

    __tablename__ = "users"
    __table_args__ = (
        Index("idx_users_email", "email", unique=True),
        Index("idx_users_username", "username"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    username: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Role and permissions
    role: Mapped[str] = mapped_column(String(20), default="user")  # user, admin

    # Account status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)  # Email verified

    # Security tracking
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now()
    )
    last_login_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)

    # Soft delete
    deleted_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)

    @property
    def user_id_str(self) -> str:
        """Return string user_id for compatibility with existing code."""
        return str(self.id)
