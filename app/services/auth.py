"""
Authentication service: password hashing, JWT token creation/verification.
Designed for production use with proper security practices.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.orm import User
from app.models.auth_schemas import TokenData

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password for storage."""
    return pwd_context.hash(password)


def create_access_token(
    data: dict, expires_delta: Optional[timedelta] = None
) -> Tuple[str, datetime]:
    """
    Create a short-lived access token.
    Returns (token, expiration_datetime).
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt, expire


def create_refresh_token(
    data: dict, expires_delta: Optional[timedelta] = None
) -> Tuple[str, datetime]:
    """
    Create a longer-lived refresh token.
    Returns (token, expiration_datetime).
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )

    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt, expire


def verify_token(token: str, expected_type: str = "access") -> Optional[TokenData]:
    """
    Verify and decode a JWT token.
    Returns TokenData if valid, None otherwise.
    """
    if not token:
        return None
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id = payload.get("sub")
        email = payload.get("email")
        role = payload.get("role", "user")
        token_type = payload.get("type", "access")

        if user_id is None or token_type != expected_type:
            return None

        return TokenData(
            user_id=int(user_id), email=email, role=role, token_type=token_type
        )
    except (JWTError, ValueError, KeyError) as e:
        # Log for debugging in tests
        import logging

        logging.debug(f"Token verification failed: {e}")
        return None


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """Get user by email address."""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
    """Get user by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def authenticate_user(
    db: AsyncSession, email: str, password: str
) -> Optional[User]:
    """
    Authenticate user with email and password.
    Returns User if successful, None otherwise.
    """
    user = await get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        # Increment failed login attempts
        await db.execute(
            update(User)
            .where(User.id == user.id)
            .values(failed_login_attempts=User.failed_login_attempts + 1)
        )
        await db.commit()
        return None

    # Reset failed attempts on successful login
    if user.failed_login_attempts > 0:
        await db.execute(
            update(User)
            .where(User.id == user.id)
            .values(failed_login_attempts=0, last_login_at=datetime.utcnow())
        )
    else:
        await db.execute(
            update(User)
            .where(User.id == user.id)
            .values(last_login_at=datetime.utcnow())
        )
    await db.commit()

    return user


async def create_user(
    db: AsyncSession,
    email: str,
    password: str,
    username: Optional[str] = None,
    role: str = "user",
) -> User:
    """
    Create a new user.
    Raises ValueError if email already exists.
    """
    # Check if email exists
    existing = await get_user_by_email(db, email)
    if existing:
        raise ValueError("Email already registered")

    # Create user
    user = User(
        email=email,
        hashed_password=get_password_hash(password),
        username=username,
        role=role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def migrate_default_user_data(db: AsyncSession, new_user_id: int) -> int:
    """
    Migrate all data from 'default_user' to the new user.
    Returns count of tables updated.
    """
    from app.models.orm import (
        ContextLearningRecord,
        WordProficiency,
        VocabLearningLog,
        UserComprehensionProfile,
        ReadingSession,
        UserCalibration,
        SentenceLearningRecord,
        VoiceSession,
        ReviewItem,
    )

    tables_updated = 0
    new_user_id_str = str(new_user_id)

    # List of models with user_id field to migrate
    models_to_migrate = [
        ContextLearningRecord,
        WordProficiency,
        VocabLearningLog,
        UserComprehensionProfile,
        ReadingSession,
        UserCalibration,
        SentenceLearningRecord,
        VoiceSession,
        ReviewItem,
    ]

    for model in models_to_migrate:
        result = await db.execute(
            update(model)
            .where(model.user_id == "default_user")
            .values(user_id=new_user_id_str)
        )
        if result.rowcount > 0:
            tables_updated += 1

    await db.commit()
    return tables_updated


def create_token_pair(user: User) -> dict:
    """
    Create both access and refresh tokens for a user.
    Returns dict with tokens and metadata.
    """
    token_data = {
        "sub": str(user.id),  # JWT sub claim must be a string
        "email": user.email,
        "role": user.role,
    }

    access_token, access_exp = create_access_token(token_data)
    refresh_token, _ = create_refresh_token(token_data)

    # Calculate seconds until expiration
    expires_in = int((access_exp - datetime.now(timezone.utc)).total_seconds())

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": expires_in,
    }
