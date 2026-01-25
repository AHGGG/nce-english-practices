import asyncio
import sys
import os
from unittest.mock import MagicMock, AsyncMock, patch

# Add project root to path
sys.path.insert(0, os.getcwd())

from app.database.performance import get_daily_study_time

async def verify_queries():
    print("Verifying get_daily_study_time query count...")

    # Mock result for session.execute
    # We need to mock return values because the code iterates over them
    mock_result = MagicMock()
    mock_result.all.return_value = []
    mock_result.__iter__.return_value = []

    # Create a mock session
    mock_session = AsyncMock()
    mock_session.execute.return_value = mock_result

    # Mock AsyncSessionLocal to return our mock session
    mock_session_ctx = AsyncMock()
    mock_session_ctx.__aenter__.return_value = mock_session
    mock_session_ctx.__aexit__.return_value = None

    with patch("app.database.performance.AsyncSessionLocal", return_value=mock_session_ctx):
        await get_daily_study_time(days=7, user_id="test_user")

    print(f"session.execute called {mock_session.execute.call_count} times")

    if mock_session.execute.call_count == 1:
        print("OPTIMIZATION CONFIRMED: 1 query executed.")
    else:
        print(f"WARNING: Expected 1 query, got {mock_session.execute.call_count}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(verify_queries())
