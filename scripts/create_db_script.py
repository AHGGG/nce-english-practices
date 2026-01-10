import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

# Load env vars
load_dotenv()

# Get the URL from env, usually points to 'postgres' or 'template1' initially if user followed instructions
# or points to 'nce_practice' which might not exist.
target_url = os.getenv("DATABASE_URL")


async def create_db():
    print("Checking database...")

    # We need to connect to 'postgres' system database to create a new database
    # Assuming the user provided URL might point to 'nce_practice', we strip it
    base_url = target_url.rsplit("/", 1)[0] + "/postgres"

    engine = create_async_engine(base_url, isolation_level="AUTOCOMMIT")

    async with engine.connect() as conn:
        # Check if nce_practice exists
        result = await conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = 'nce_practice'")
        )
        exists = result.scalar()

        if not exists:
            print("Creating database 'nce_practice'...")
            await conn.execute(text("CREATE DATABASE nce_practice"))
            print("Database created.")
        else:
            print("Database 'nce_practice' already exists.")

    await engine.dispose()


if __name__ == "__main__":
    if "nce_practice" not in target_url:
        print(
            "Warning: DATABASE_URL in .env does not end with /nce_practice. Please update it after this script."
        )
        # But we will still try to create it using the credentials provided

    try:
        asyncio.run(create_db())
    except Exception as e:
        print(f"Error: {e}")
