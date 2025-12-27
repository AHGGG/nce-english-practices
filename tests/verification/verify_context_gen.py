import httpx
import asyncio

async def test_endpoint(base_url):
    print(f"Checking {base_url}/docs...")
    try:
        async with httpx.AsyncClient(verify=False) as client:
            resp = await client.get(f"{base_url}/docs", timeout=5.0)
            print(f"Health Check ({base_url}): {resp.status_code}")
            return resp.status_code == 200
    except Exception as e:
         print(f"Health Check ({base_url}) FAILED: {repr(e)}")
         return False

async def test_context():
    base_url = "http://localhost:8000"
    if not await test_endpoint(base_url):
        base_url = "https://localhost:8000"
        if not await test_endpoint(base_url):
            print("Both HTTP and HTTPS failed.")
            return

    url = f"{base_url}/api/negotiation/context"
    payload = {
        "word": "decline",
        "definition": "to become smaller, fewer, or less; decrease.",
        "target_sentence": "The number of staff has declined from 217,000 to 114,000."
    }
    
    print(f"Testing {url}...")
    async with httpx.AsyncClient(verify=False) as client:
        try:
            resp = await client.post(url, json=payload, timeout=30.0)
            if resp.status_code == 200:
                print("SUCCESS!")
                print(f"Scenario: {resp.json()['scenario']}")
            else:
                print(f"FAILED: {resp.status_code}")
                print(resp.text)
        except Exception as e:
            print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(test_context())
