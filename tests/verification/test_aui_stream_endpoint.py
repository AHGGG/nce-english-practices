"""
Simple test to check if /aui/stream/story endpoint is working
"""
import requests
import sys

def test_stream_endpoint():
    """Test SSE streaming"""
    url = "http://localhost:8000/aui/stream/story"
    params = {
        "content": "Test story content for debugging.",
        "title": "Test",
        "user_level": 1,
        "chunk_size": 2
    }
    
    print(f"Testing: {url}")
    print(f"Params: {params}\n")
    
    try:
        # Stream the response
        with requests.get(url, params=params, stream=True, timeout=5) as response:
            print(f"Status Code: {response.status_code}")
            print(f"Headers: {dict(response.headers)}\n")
            
            print("Streaming events:")
            print("-" * 50)
            
            for i, line in enumerate(response.iter_lines(decode_unicode=True)):
                if line:
                    print(f"[{i}] {line}")
                    
                if i > 10:  # Limit output
                    print("... (stopping after 10 events)")
                    break
                    
    except requests.exceptions.ConnectionError as e:
        print(f"❌ Connection Error: {e}")
        print("Backend might not be running or endpoint doesn't exist")
        return False
    except requests.exceptions.Timeout:
        print("❌ Request timed out")
        return False
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = test_stream_endpoint()
    sys.exit(0 if success else 1)
