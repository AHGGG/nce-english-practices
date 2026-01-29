import nest_asyncio
import sys
import pytest
import asyncio

# Apply nest_asyncio to allow nested event loops (required for TestClient/AsyncClient on Windows)
nest_asyncio.apply()

from typing import AsyncGenerator  # noqa: E402
from httpx import AsyncClient, ASGITransport  # noqa: E402
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession  # noqa: E402
from sqlalchemy import text  # noqa: E402

import os  # noqa: E402

# FORCE Test Database via Environment Variable (Must be done before app imports)
# Use SQLite for portable testing in CI/Sandbox
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

from app.core.db import Base, get_db  # noqa: E402
import app.models.orm  # noqa: E402

# Ensure frontend dist exists for SPA route registration during tests
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "apps", "web", "dist")
os.makedirs(frontend_dist, exist_ok=True)
assets_dir = os.path.join(frontend_dist, "assets")
os.makedirs(assets_dir, exist_ok=True)
index_path = os.path.join(frontend_dist, "index.html")
if not os.path.exists(index_path):
    with open(index_path, "w") as f:
        f.write("<html>SPA Mock</html>")

from app.main import app  # noqa: E402


# FORCE Test Database
# Use SQLite for portable testing in CI/Sandbox
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

# Handle Windows Event Loop Policy globally
if sys.platform == "win32":
    # Use SelectorEventLoop explicitly to avoid Proactor issues with some drivers/tests
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    pass

# Override global settings
# Override global settings
# settings.DATABASE_URL = TEST_DATABASE_URL (Already handled via env var)


@pytest.fixture(scope="session")
async def db_engine():
    """Create async engine and tables once per session."""
    # SQLite-specific args
    connect_args = {"check_same_thread": False} if "sqlite" in TEST_DATABASE_URL else {}

    engine = create_async_engine(
        TEST_DATABASE_URL, echo=False, connect_args=connect_args
    )

    async with engine.begin() as conn:
        # Enable WAL mode for SQLite (allows concurrent access)
        if "sqlite" in TEST_DATABASE_URL:
            await conn.execute(text("PRAGMA journal_mode=WAL"))
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
        bind=connection, class_=AsyncSession, expire_on_commit=False, autoflush=False
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

    async def override_get_current_user_id():
        return "default_user"

    app.dependency_overrides[get_db] = override_get_db

    # Needs to be imported inside/safely to avoid circular imports if any
    from app.api.routers.auth import get_current_user_id

    app.dependency_overrides[get_current_user_id] = override_get_current_user_id

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
