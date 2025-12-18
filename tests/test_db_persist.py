import asyncio
import os
from dotenv import load_dotenv

# Load env before importing app modules
load_dotenv()

from app.database import log_session, AsyncSessionLocal
from app.db_models import SessionLog
from sqlalchemy import select, func, delete

async def test_persistence():
    print("Test 1: Writing to DB...")
    
    test_topic = "UNIT_TEST_TOPIC"
    test_vocab = {"test": ["word1", "word2"]}
    
    # 1. Write
    await log_session(test_topic, test_vocab)
    print("Write complete.")
    
    # 2. Read
    print("Test 2: Reading from DB...")
    async with AsyncSessionLocal() as session:
        stmt = select(SessionLog).where(SessionLog.topic == test_topic).order_by(SessionLog.id.desc())
        result = await session.execute(stmt)
        record = result.scalars().first()
        
        if record:
            print(f"SUCCESS: Read back record ID={record.id}, Topic={record.topic}")
            assert record.vocab_json == test_vocab
        else:
            print("FAILURE: Could not find record.")
            return

        # 3. Clean up
        print("Test 3: Cleaning up...")
        await session.delete(record)
        await session.commit()
        print("Cleanup complete.")

if __name__ == "__main__":
    asyncio.run(test_persistence())
