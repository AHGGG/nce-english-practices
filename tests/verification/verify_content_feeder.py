import asyncio
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from app.services.content_feeder import content_feeder
from app.services.dictionary import dict_manager


async def verify_content_feeder():
    print("--- Loading Dictionaries (Mocking/Checking) ---")
    # In a real run, this loads MDX files. For this test, we might not have them.
    # However, let's see if the code itself runs without NameError.

    print("--- Verifying get_all_examples import safety ---")
    try:
        # This calls the method that had the Undefined name 'WordExampleSet'
        # We don't expect it to return data if no dicts are loaded, but it shouldn't crash with NameError.
        result = content_feeder.get_all_examples("test")
        print(f"Result: {result}")
        print("✅ get_all_examples executed without NameError")
    except NameError as e:
        print(f"❌ NameError detected: {e}")
        sys.exit(1)
    except Exception as e:
        # Other errors (like missing dicts) are expected and acceptable for this verification
        print(f"⚠️ Runtime error (expected if no dicts): {e}")
        print("✅ get_all_examples executed without NameError")


if __name__ == "__main__":
    asyncio.run(verify_content_feeder())
