import pytest
import os
import time
import subprocess
import sys
from playwright.sync_api import Page

# Define port for E2E tests
PORT = 8001
BASE_URL = f"http://localhost:{PORT}"

@pytest.fixture(scope="session")
def api_server():
    """
    Launches the FastAPI application in a separate process for E2E tests.
    """
    # Verify we are in the root directory
    if not os.path.exists("app/main.py"):
        raise RuntimeError("E2E tests must be run from the project root.")

    # Start Uvicorn process
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--port", str(PORT), "--host", "127.0.0.1"],
        cwd=os.getcwd(),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    # Wait for server to start with polling
    import requests
    max_retries = 30 # 30 * 0.5s = 15s max wait
    for i in range(max_retries):
        if proc.poll() is not None:
             raise RuntimeError("Server process exited prematurely. Check manual run for details.")
        
        try:
            response = requests.get(f"{BASE_URL}/docs")
            if response.status_code == 200:
                print(f"Server started on try {i+1}")
                break
        except requests.ConnectionError:
            time.sleep(0.5)
    else:
        proc.terminate()
        raise RuntimeError("Server failed to allow connections within timeout.")

    yield BASE_URL

    # Cleanup
    proc.terminate()
    proc.wait()

@pytest.fixture(scope="session")
def base_url(api_server):
    return api_server

@pytest.fixture
def mock_llm_response(page: Page):
    """
    Helper fixture to mock LLM API endpoints.
    """
    def _mock(endpoint: str, response_data: dict, delay_ms: int = 500):
        def handle_route(route):
            time.sleep(delay_ms / 1000) # Simulate latency
            import json
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(response_data)
            )
        
        # Intercept POST requests to the endpoint
        page.route(f"**/api/{endpoint}", handle_route)
    
    return _mock
