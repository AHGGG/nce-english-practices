import asyncio
import sys
import os
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.getcwd())

from app.database.performance import get_daily_study_time

async def verify_calls():
    print("Verifying get_daily_study_time database calls...")

    # Mock row class to simulate sqlalchemy result row
    class MockRow:
        def __init__(self, day, duration, type_val=None):
            self.day = day
            self.duration = duration
            self.type_val = type_val

        def __getitem__(self, index):
            if index == 0: return self.day
            if index == 1: return self.duration
            if index == 2: return self.type_val
            raise IndexError

    # Mock data for UNION ALL result
    mock_rows = [
        MockRow(datetime(2023, 1, 1), 10000, "sentence"), # 10s (ms)
        MockRow(datetime(2023, 1, 1), 20, "reading"),     # 20s
        MockRow(datetime(2023, 1, 2), 5000, "review"),    # 5s (ms)
        MockRow(datetime(2023, 1, 2), 30, "podcast"),     # 30s
    ]

    mock_result = MagicMock()
    mock_result.all.return_value = mock_rows
    mock_result.__iter__.return_value = iter(mock_rows)

    mock_session = AsyncMock()
    mock_session.execute.return_value = mock_result

    mock_session_cls = MagicMock()
    mock_session_cls.__aenter__.return_value = mock_session
    mock_session_cls.__aexit__.return_value = None

    with patch("app.database.performance.AsyncSessionLocal", return_value=mock_session_cls):
        result = await get_daily_study_time(days=30, user_id="test_user")

    print(f"Number of session.execute calls: {mock_session.execute.call_count}")

    if mock_session.execute.call_count == 1:
        print("⚡ Optimized: Making 1 combined query.")
    elif mock_session.execute.call_count == 5:
        print("⚠️ Still making 5 separate queries.")
    else:
        print(f"⚠️ Unexpected number of calls: {mock_session.execute.call_count}")

    # Verify Data Aggregation
    print("Result data:", result)

    daily = result.get("daily", [])
    if len(daily) == 2:
        print("✅ Correct number of days.")
        day1 = next(d for d in daily if d["date"] == "2023-01-01")
        day2 = next(d for d in daily if d["date"] == "2023-01-02")

        # Day 1: 10s sentence + 20s reading = 30s total
        if day1["sentence_study"] == 10 and day1["reading"] == 20 and day1["total"] == 30:
             print("✅ Day 1 aggregations correct.")
        else:
             print(f"❌ Day 1 aggregations incorrect: {day1}")

        # Day 2: 5s review + 30s podcast = 35s total
        if day2["review"] == 5 and day2["podcast"] == 30 and day2["total"] == 35:
             print("✅ Day 2 aggregations correct.")
        else:
             print(f"❌ Day 2 aggregations incorrect: {day2}")

    else:
        print(f"❌ Incorrect number of days: {len(daily)}")

if __name__ == "__main__":
    asyncio.run(verify_calls())
