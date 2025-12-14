import pytest
import os
import time
import subprocess
import sys
import requests
import json
from playwright.sync_api import Page, BrowserContext

# Define ports for E2E tests
BACKEND_PORT = 8001
FRONTEND_PORT = 5174
BACKEND_URL = f"http://localhost:{BACKEND_PORT}"
FRONTEND_URL = f"https://localhost:{FRONTEND_PORT}"

@pytest.fixture(scope="session")
def backend_server():
    """
    Launches the FastAPI application in a separate process for E2E tests.
    """
    # Verify we are in the root directory
    if not os.path.exists("app/main.py"):
        raise RuntimeError("E2E tests must be run from the project root.")

    print(f"Starting Backend on {BACKEND_PORT}...")
    # Start Uvicorn process
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--port", str(BACKEND_PORT), "--host", "127.0.0.1"],
        cwd=os.getcwd(),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    # Wait for server to start with polling
    max_retries = 30 # 30 * 0.5s = 15s max wait
    for i in range(max_retries):
        if proc.poll() is not None:
             raise RuntimeError("Backend process exited prematurely.")
        
        try:
            response = requests.get(f"{BACKEND_URL}/docs")
            if response.status_code == 200:
                print(f"Backend started on try {i+1}")
                break
        except requests.ConnectionError:
            time.sleep(0.5)
    else:
        proc.terminate()
        raise RuntimeError("Backend failed to start.")

    yield BACKEND_URL

    # Cleanup
    proc.terminate()
    proc.wait()

@pytest.fixture(scope="session")
def frontend_server(backend_server):
    """
    Launches the Vite frontend in a separate process.
    """
    if not os.path.exists("frontend/package.json"):
        raise RuntimeError("Frontend directory not found.")

    print(f"Starting Frontend on {FRONTEND_PORT} targeting {backend_server}...")

    env = os.environ.copy()
    env["VITE_API_TARGET"] = backend_server

    # Determine pnpm command based on OS
    pnpm_cmd = "pnpm.cmd" if os.name == "nt" else "pnpm"

    # Start Vite process
    # Note: We use --port to specify port
    proc = subprocess.Popen(
        [pnpm_cmd, "run", "dev", "--", "--port", str(FRONTEND_PORT)],
        cwd=os.path.join(os.getcwd(), "frontend"),
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    # Wait for frontend to be ready
    max_retries = 120
    for i in range(max_retries):
        if proc.poll() is not None:
            raise RuntimeError("Frontend process exited prematurely.")

        try:
            # We use verify=False because of self-signed certs in dev
            requests.get(FRONTEND_URL, verify=False)
            print(f"Frontend started on try {i+1}")
            break
        except requests.ConnectionError:
            time.sleep(0.5)
    else:
        proc.terminate()
        raise RuntimeError("Frontend failed to start.")

    yield FRONTEND_URL

    proc.terminate()
    proc.wait()

@pytest.fixture(scope="session")
def base_url(frontend_server):
    return frontend_server

@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    return {
        **browser_context_args,
        "ignore_https_errors": True
    }

@pytest.fixture
def mock_llm_response(page: Page):
    """
    Helper fixture to mock LLM API endpoints.
    Also mocks /api/logs to silence errors.
    """
    # Mock logs globally for this page
    def handle_logs(route):
        try:
            data = route.request.post_data_json
            print(f"[FRONTEND LOG] {data.get('level', 'unknown').upper()}: {data.get('message', '')}")
            if data.get('data'):
                print(f"Data: {data.get('data')}")
        except:
            pass
        route.fulfill(status=200, body='{"status":"ok"}')
        
    page.route("**/api/logs", handle_logs)

    def _mock(endpoint: str, response_data: dict, delay_ms: int = 100, is_stream: bool = False, stream_chunks: list = None):
        def handle_route(route):
            print(f"MOCK HIT: {endpoint} -> {route.request.url}")
            try:
                if is_stream:
                    # Construct newline delimited JSON
                    body = ""
                    if stream_chunks:
                        for chunk in stream_chunks:
                            body += json.dumps(chunk) + "\n"

                    route.fulfill(
                        status=200,
                        content_type="text/event-stream",
                        body=body
                    )
                else:
                    route.fulfill(
                        status=200,
                        content_type="application/json",
                        body=json.dumps(response_data)
                    )
            except Exception as e:
                print(f"MOCK ERROR: {e}")
                route.abort()
        
        # Intercept POST requests to the endpoint
        page.route(f"**/api/{endpoint}*", handle_route)
    
    return _mock
