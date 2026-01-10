import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from app.services.voice_lab import voice_lab_service


async def print_config():
    config = voice_lab_service.get_all_configs()
    print("--- Dashscope Config ---")
    print(config.get("dashscope"))


if __name__ == "__main__":
    asyncio.run(print_config())
