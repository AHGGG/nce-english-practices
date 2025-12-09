import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool

# Default to local sqlite async
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///practice.db")

# Fix for Heroku/Render/Supabase postgres URLs which often start with postgres://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Engine configuration
# For SQLite, we need check_same_thread=False (handled by aiosqlite usually, but good to be safe if passed in args)
# For Postgres, we might want connection pooling.
connect_args = {}
if "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False}

engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Set to True for SQL logging
    connect_args=connect_args,
    poolclass=NullPool if "sqlite" in DATABASE_URL else None # Use NullPool for SQLite to avoid locks in some cases, or standard for PG
)

# Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

async def get_db():
    """Dependency for FastAPI"""
    async with AsyncSessionLocal() as session:
        yield session
