
import asyncio
import httpx
import json
import sys

async def verify_context_grouping(word="run"):
    url = f"https://localhost:8000/api/aui/stream/contexts?word={word}"
    print(f"Testing endpoint: {url}")
    
    contexts = []
    
    try:
        # trust_env=False prevents checking HTTP_PROXY/HTTPS_PROXY env vars which might cause issues with localhost
        async with httpx.AsyncClient(timeout=30.0, verify=False, trust_env=False) as client:
            async with client.stream("GET", url) as response:
                if response.status_code != 200:
                    print(f"❌ FAILED: HTTP {response.status_code}")
                    return False
                
                print("✅ Connected. Listening for events...")
                
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        event_json = line[6:]
                        try:
                            event = json.loads(event_json)
                            event_type = event.get("type")
                            
                            if event_type == "aui_state_delta":
                                # Extract context items from delta
                                delta = event.get("delta", [])
                                for patch in delta:
                                    if patch["op"] == "add" and "contexts" in patch["path"]:
                                        val = patch["value"]
                                        contexts.append(val)
                                        # Print brief info
                                        sense_idx = val.get("sense_index", "N/A")
                                        defn = val.get("definition", "N/A")[:30] + "..."
                                        print(f"  Received context: Sense #{sense_idx} - {defn}")
                                        
                            if event_type == "aui_stream_end":
                                print("✅ Stream completed.")
                                break
                                
                        except json.JSONDecodeError:
                            pass
                            
    except Exception as e:
        import traceback
        print(f"❌ Error type: {type(e)}")
        print(f"❌ Error repr: {repr(e)}")
        traceback.print_exc()
        return False

    # Validation
    if not contexts:
        print("❌ No contexts received.")
        return False
        
    print(f"\nReceived {len(contexts)} contexts total.")
    
    # Check for grouping metadata
    senses = set()
    missing_meta = 0
    for ctx in contexts:
        if "sense_index" in ctx:
            senses.add(ctx["sense_index"])
        else:
            missing_meta += 1
            print(f"❌ Missing sense_index in: {ctx.get('text_content')[:20]}...")
            
    if missing_meta > 0:
        print(f"❌ {missing_meta} contexts are missing sense metadata!")
        return False
        
    print(f"✅ Found {len(senses)} distinct senses: {sorted(list(senses))}")
    if len(senses) > 1:
        print("✅ Data supports grouping!")
        return True
    else:
        print("⚠️  Only 1 sense found. Try a more polysemous word?")
        return True

if __name__ == "__main__":
    success = asyncio.run(verify_context_grouping("run"))
    sys.exit(0 if success else 1)
