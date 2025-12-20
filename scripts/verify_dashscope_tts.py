
import asyncio
import os
import sys
import logging
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from app.services.voice_lab import DashscopeProvider
from app.config import settings

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def verify_dashscope_tts():
    print("--- Verifying Dashscope TTS Integration ---")
    
    # Check API Key
    api_key = settings.DASHSCOPE_API_KEY or os.getenv("DASHSCOPE_API_KEY")
    if not api_key:
        print("❌ DASHSCOPE_API_KEY not found in settings or env.")
        print("Please set it in .env file.")
        return

    print(f"✅ API Key found: {api_key[:4]}...{api_key[-4:]}")
    
    provider = DashscopeProvider()
    
    # Test TTS
    print("Testing TTS with qwen3-tts-flash...")
    text = "Hello, this is a test of Qwen TTS."
    voice = "Cherry"
    
    try:
        audio_stream = provider.tts(text, voice, "qwen3-tts-flash")
        
        output_file = "qwen_test.wav"
        total_bytes = 0
        
        with open(output_file, "wb") as f:
            async for chunk in audio_stream:
                f.write(chunk)
                total_bytes += len(chunk)
                
        print(f"✅ TTS Successful! Wrote {total_bytes} bytes to {output_file}")
        
    except Exception as e:
        print(f"❌ Verification Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(verify_dashscope_tts())
