"""
Quick verification test for AUI streaming API
"""
import asyncio
import httpx


async def test_story_stream():
    """Test the story streaming endpoint."""
    print("Testing /aui/stream/story endpoint...")
    
    story = "The quick brown fox jumps over the lazy dog. This is a test story for streaming."
    # Use HTTPS and disable SSL verification for self-signed cert
    url = f"https://localhost:8000/aui/stream/story?content={story}&title=Test&user_level=1&chunk_size=2"
    
    async with httpx.AsyncClient(verify=False) as client:
        async with client.stream("GET", url) as response:
            print(f"Status: {response.status_code}")
            print(f"Headers: {response.headers.get('content-type')}")
            print("\nReceiving events:\n")
            
            event_count = 0
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    event_data = line[6:]  # Remove "data: " prefix
                    print(f"Event {event_count}: {event_data[:100]}...")
                    event_count += 1
            
            print(f"\n✅ Received {event_count} events")


async def test_vocab_stream():
    """Test the vocabulary streaming endpoint."""
    print("\nTesting /aui/stream/vocabulary endpoint...")
    
    url = "https://localhost:8000/aui/stream/vocabulary?words=hello,world,test&user_level=2"
    
    async with httpx.AsyncClient(verify=False) as client:
        async with client.stream("GET", url) as response:
            print(f"Status: {response.status_code}")
            print("\nReceiving events:\n")
            
            event_count = 0
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    event_data = line[6:]
                    print(f"Event {event_count}: {event_data[:100]}...")
                    event_count += 1
            
            print(f"\n✅ Received {event_count} events")


if __name__ == "__main__":
    print("=== AUI Streaming API Verification ===\n")
    print("Make sure the server is running on https://localhost:8000\n")
    
    asyncio.run(test_story_stream())
    asyncio.run(test_vocab_stream())
    
    print("\n=== All tests completed ===")
    print("\n📝 Next step: Open http://localhost:5173/aui-stream-demo in your browser")
