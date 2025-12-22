import httpx
import asyncio
import json

async def verify_vocab_patch_stream():
    url = "http://127.0.0.1:8000/api/aui/stream/vocab-patch-demo?level=1"
    print(f"Connecting to {url}...")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream("GET", url) as response:
                print(f"Status: {response.status_code}")
                if response.status_code != 200:
                    print("Failed to connect")
                    return

                async for line in response.aiter_lines():
                    if not line: continue
                    if line.startswith("data: "):
                        data = line[6:]
                        try:
                            event = json.loads(data)
                            event_type = event.get("type", "unknown")
                            print(f"received event: {event_type}")
                            
                            if event_type == "aui_state_delta":
                                print("  -> JSON Patch Delta received!")
                                print(f"  -> Delta: {json.dumps(event['delta'])}")
                                
                            if event_type == "aui_stream_end":
                                print("Stream ended successfully.")
                                break
                        except json.JSONDecodeError:
                            print(f"Failed to parse: {data}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(verify_vocab_patch_stream())
