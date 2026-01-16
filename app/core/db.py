from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from typing import AsyncGenerator

from app.config import settings

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
    async with AsyncSessionLocal() as session:
        try:
            yield session
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
