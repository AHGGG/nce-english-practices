"""
Authentication API endpoints: register, login, refresh, logout, profile.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime, timezone

from app.core.db import get_db
from app.models.auth_schemas import (
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
    RefreshTokenRequest,
    PasswordChange,
    UserProfileUpdate,
)
from app.models.orm import User
from app.services.auth import (
    authenticate_user,
    create_user,
    get_user_by_id,
    verify_token,
    create_token_pair,
    get_password_hash,
    verify_password,
)
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])

# OAuth2 scheme for token extraction from Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Get the current authenticated user from JWT token.
    Returns None if not authenticated (for optional auth).
    """
    if not token:
        return None

    token_data = verify_token(token, expected_type="access")
    if not token_data:
        return None

    user = await get_user_by_id(db, token_data.user_id)
    if not user or not user.is_active:
        return None

    return user


async def require_current_user(
    user: Optional[User] = Depends(get_current_user),
) -> User:
    """
    Require authentication. Raises 401 if not logged in.
    """
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def get_current_user_id(
    user: User = Depends(require_current_user),
) -> str:
    """
    Get the current user's ID as a string.
    Requires authentication. Raises 401 if not logged in.
    """
    return str(user.id)


# --- Registration ---


@router.get("/registration-status")
async def get_registration_status() -> dict:
    """
    Check if public registration is allowed.
    Useful for frontend to show/hide registration link.
    """
    return {
        "registration_allowed": settings.ALLOW_REGISTRATION,
        "message": "Registration is open" if settings.ALLOW_REGISTRATION else "Registration is closed"
    }


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserRegister, db: AsyncSession = Depends(get_db)
) -> User:
    """
    Register a new user account.
    Registration can be disabled via ALLOW_REGISTRATION setting.
    Data migration is handled separately via admin CLI.
    """
    # Check if registration is allowed
    if not settings.ALLOW_REGISTRATION:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is currently closed. Please contact the administrator.",
        )

    try:
        user = await create_user(
            db=db,
            email=user_data.email,
            password=user_data.password,
            username=user_data.username,
        )
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


# --- Login ---


@router.post("/login", response_model=TokenResponse)
async def login(
    user_data: UserLogin,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Login with email and password.
    Returns access token and refresh token.
    """
    user = await authenticate_user(db, user_data.email, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    # Check if account is locked
    if user.locked_until and user.locked_until > datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is temporarily locked due to too many failed login attempts",
        )

    tokens = create_token_pair(user)

    # Set refresh token as HttpOnly cookie for security
    response.set_cookie(
        key="refresh_token",
        value=tokens["refresh_token"],
        httponly=True,
        secure=settings.USE_HTTPS,  # Only send over HTTPS if enabled
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    return tokens


@router.post("/token", response_model=TokenResponse)
async def login_for_access_token(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    OAuth2 compatible token endpoint (uses username field for email).
    """
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    tokens = create_token_pair(user)

    response.set_cookie(
        key="refresh_token",
        value=tokens["refresh_token"],
        httponly=True,
        secure=settings.USE_HTTPS,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    return tokens


# --- Token Refresh ---


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    response: Response,
    refresh_request: Optional[RefreshTokenRequest] = None,
    refresh_token_cookie: Optional[str] = Cookie(None, alias="refresh_token"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Get a new access token using refresh token.
    Accepts token from either request body or HttpOnly cookie.
    """
    # Try to get refresh token from body first, then cookie
    token = None
    if refresh_request and refresh_request.refresh_token:
        token = refresh_request.refresh_token
    elif refresh_token_cookie:
        token = refresh_token_cookie

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required",
        )

    token_data = verify_token(token, expected_type="refresh")
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user = await get_user_by_id(db, token_data.user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    tokens = create_token_pair(user)

    response.set_cookie(
        key="refresh_token",
        value=tokens["refresh_token"],
        httponly=True,
        secure=settings.USE_HTTPS,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    return tokens


# --- Logout ---


@router.post("/logout")
async def logout(response: Response) -> dict:
    """
    Logout: clear refresh token cookie.
    Client should also discard the access token.
    """
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}


# --- User Profile ---


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(require_current_user),
) -> User:
    """Get the current user's profile."""
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Update the current user's profile."""
    if profile_data.username is not None:
        current_user.username = profile_data.username

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Change the current user's password."""
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.hashed_password = get_password_hash(password_data.new_password)
    await db.commit()

    return {"message": "Password changed successfully"}


# Export dependencies for use in other routers
__all__ = [
    "router",
    "get_current_user",
    "require_current_user",
    "get_current_user_id",
]
