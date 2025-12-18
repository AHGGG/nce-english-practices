import requests

def test_llm_endpoint():
    url = "https://localhost:8000/api/voice-lab/llm"
    try:
        response = requests.post(url, data={"text": "Hello, are you working?"}, verify=False)
        if response.status_code == 200:
            print(f"SUCCESS: {response.json()}")
        else:
            print(f"FAILED: {response.text}")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_llm_endpoint()
