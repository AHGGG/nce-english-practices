from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from typing import AsyncGenerator, Optional
from contextlib import asynccontextmanager
import logging

from app.config import settings

logger = logging.getLogger(__name__)

# Create Async Engine
# echo=False in production, can be set to True for debugging

engine = create_async_engine(settings.DATABASE_URL, echo=False, future=True)

# Create Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
)


# Base Model
class Base(DeclarativeBase):
    pass


# Dependency Injection for API Routes
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Standard dependency injection for API routes.
    Usage: async def endpoint(db: AsyncSession = Depends(get_db)):
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


@asynccontextmanager
async def get_db_context() -> AsyncGenerator[AsyncSession, None]:
    """
    Context manager for database sessions (alternative to dependency injection).
    Use this when you need explicit session control.

    Usage:
        async with get_db_context() as db:
            await db.execute(...)
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_db_health() -> bool:
    """
    Check database connectivity.

    Returns:
        True if database is connected, False otherwise.
    """
    from sqlalchemy import text

    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
            return True
    except Exception:
        return False
