import asyncio
import os
import sys
import logging
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from app.services.voice_lab import DashscopeProvider
from app.config import settings
import httpx

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def verify_dashscope():
    print("--- Verifying Dashscope Integration ---")

    # Check API Key
    api_key = settings.DASHSCOPE_API_KEY or os.getenv("DASHSCOPE_API_KEY")
    if not api_key:
        print("❌ DASHSCOPE_API_KEY not found in settings or env.")
        print("Please set it in .env file.")
        return

    print(f"✅ API Key found: {api_key[:4]}...{api_key[-4:]}")

    provider = DashscopeProvider()

    # Download sample audio
    sample_url = "https://dashscope.oss-cn-beijing.aliyuncs.com/audios/welcome.mp3"
    print(f"Downloading sample audio from {sample_url}...")

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(sample_url)
            if resp.status_code != 200:
                print(f"❌ Failed to download sample: {resp.status_code}")
                return
            audio_data = resp.content
            print(f"✅ Downloaded {len(audio_data)} bytes.")

            # Test STT
            print("Testing STT with qwen3-asr-flash...")
            text = await provider.stt(audio_data)

            print("\n--- Transcription Result ---")
            print(text)
            print("----------------------------")

            if text:
                print("✅ STT Successful!")
            else:
                print(
                    "⚠️ STT returned empty string (might be silence or error not raised)."
                )

    except Exception as e:
        print(f"❌ Verification Failed: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(verify_dashscope())
