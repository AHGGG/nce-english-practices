"""Test HTTPS SSE endpoint"""
import requests
import urllib3

# Disable SSL warnings for self-signed cert
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

url = "https://127.0.0.1:8000/aui/stream/story"
params = {
    "content": "Test",
    "title": "Test",
    "user_level": 1,
    "chunk_size": 2
}

print(f"Testing: {url}")
print(f"Params: {params}\n")

try:
    with requests.get(url, params=params, stream=True, verify=False, timeout=5) as response:
        print(f"✅ Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}\n")
        
        print("First 5 events:")
        for i, line in enumerate(response.iter_lines(decode_unicode=True)):
            if line:
                print(f"  [{i}] {line}")
            if i >= 10:
                break
        print("\n✅ Streaming works!")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
