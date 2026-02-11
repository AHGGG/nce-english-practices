"""
Authentication Pydantic schemas for user registration, login, and JWT tokens.
Designed for future public deployment with proper validation.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
import re


# --- Request Schemas ---


class UserRegister(BaseModel):
    """User registration request."""

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    username: Optional[str] = Field(None, min_length=3, max_length=50)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Validate password has sufficient complexity."""
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v

    @field_validator("username")
    @classmethod
    def username_format(cls, v: Optional[str]) -> Optional[str]:
        """Validate username format if provided."""
        if v is None:
            return v
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError(
                "Username can only contain letters, numbers, underscores, and hyphens"
            )
        return v


class UserLogin(BaseModel):
    """User login request. Supports login via email."""

    email: EmailStr
    password: str


class PasswordResetRequest(BaseModel):
    """Request password reset (sends email)."""

    email: EmailStr


class PasswordReset(BaseModel):
    """Perform password reset with token."""

    token: str
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v


class PasswordChange(BaseModel):
    """Change password while logged in."""

    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v


# --- Response Schemas ---


class UserResponse(BaseModel):
    """Public user information returned to client."""

    id: int
    email: str
    username: Optional[str] = None
    role: str = "user"
    is_active: bool = True
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """JWT token pair response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # Seconds until access_token expires


class RefreshTokenRequest(BaseModel):
    """Request new access token using refresh token."""

    refresh_token: str


class TokenData(BaseModel):
    """Decoded JWT token payload."""

    user_id: Optional[int] = None
    email: Optional[str] = None
    role: str = "user"
    token_type: str = "access"  # "access" or "refresh"


# --- Profile Update ---


class UserProfileUpdate(BaseModel):
    """Update user profile."""

    username: Optional[str] = Field(None, min_length=3, max_length=50)

    @field_validator("username")
    @classmethod
    def username_format(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError(
                "Username can only contain letters, numbers, underscores, and hyphens"
            )
        return v
