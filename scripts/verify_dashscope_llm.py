import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from app.services.llm import llm_service
from app.config import settings


async def verify_dashscope_llm():
    print("--- Verifying Dashscope LLM Integration (Thinking) ---")

    # Check Settings
    print(f"Base URL: {settings.DASHSCOPE_COMPATIBLE_BASE_URL}")
    print(f"Model: {settings.DASHSCOPE_MODEL_NAME}")

    if not llm_service.get_dashscope_client():
        print("❌ Dashscope Client not initialized. Check API Key.")
        return

    print("\nSending request: 'Why is the sky blue?'\n")

    messages = [{"role": "user", "content": "Why is the sky blue?"}]

    try:
        print("--- Stream Start ---")
        async for event in llm_service.stream_chat_with_reasoning(messages):
            if event["type"] == "reasoning":
                # Print reasoning in yellow or special format
                print(f"[THINKING] {event['content']}", end="", flush=True)
            elif event["type"] == "content":
                # Print content normally
                print(f"[ANSWER] {event['content']}", end="", flush=True)

        print("\n\n--- Stream End ---")
        print("✅ LLM Verification Successful!")

    except Exception as e:
        print(f"\n❌ Verification Failed: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(verify_dashscope_llm())
