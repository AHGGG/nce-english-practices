import requests
from dotenv import load_dotenv

load_dotenv()


def test_token_endpoint():
    url = "http://localhost:8000/api/deepgram/token"
    # We might need HTTPS if running with SSL, but localhost http is usually fine if main.py supports it.
    # User said they are running "uv run python -m app.main" and "npm run dev".
    # And main.py prints "Starting with HTTP (no SSL)" if key.pem missing.
    # Previous steps showed key.pem exists! So HTTPS.

    url = "https://localhost:8000/api/deepgram/token"

    try:
        print(f"Testing {url}...")
        response = requests.get(url, verify=False)
        if response.status_code == 200:
            print(f"SUCCESS: {response.json()}")
        else:
            print(f"FAILED: {response.status_code} {response.text}")
    except Exception as e:
        print(f"ERROR: {e}")


if __name__ == "__main__":
    test_token_endpoint()
