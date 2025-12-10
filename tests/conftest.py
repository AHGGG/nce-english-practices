import pytest
import asyncio
import sys
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.config import settings
from app.core.db import Base, get_db
from app.main import app

# FORCE Test Database
# Use SQLite for portable testing in CI/Sandbox
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

# Handle Windows Event Loop Policy globally
# if sys.platform == "win32":
#    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Override global settings
settings.DATABASE_URL = TEST_DATABASE_URL



@pytest.fixture(scope="function")
async def db_engine():
    """Create async engine and tables once per session."""
    # SQLite-specific args
    connect_args = {"check_same_thread": False} if "sqlite" in TEST_DATABASE_URL else {}

    engine = create_async_engine(TEST_DATABASE_URL, echo=False, connect_args=connect_args)
    
    async with engine.begin() as conn:
        # Reset DB state: Drop all and Create all
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        
    yield engine
    
    await engine.dispose()

@pytest.fixture
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    """
    Creates a new database session for a test.
    Rolls back the transaction at the end to ensure isolation.
    """
    connection = await db_engine.connect()
    transaction = await connection.begin()
    
    session_factory = async_sessionmaker(
        bind=connection,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False
    )
    session = session_factory()
    
    yield session
    
    # Cleanup
    await session.close()
    await transaction.rollback()
    await connection.close()

@pytest.fixture
async def client(db_session) -> AsyncGenerator[AsyncClient, None]:
    """
    FastAPI Test Client with overridden DB dependency.
    """
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
        
    app.dependency_overrides.clear()
