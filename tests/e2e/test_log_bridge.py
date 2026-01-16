import sys
import pytest
from playwright.sync_api import Page


@pytest.mark.skipif(
    sys.platform == "win32",
    reason="Playwright subprocess not supported with SelectorEventLoop on Windows",
)
def test_log_bridge_stack_trace_second_arg(page: Page):
    """
    Test that logBridge sends stack trace when error is the second argument.
    """
    # 1. Navigate to home (or any page that loads logBridge)
    page.goto("/")

    # 2. Setup request interception to verify the payload
    sent_payload = {}

    def handle_route(route):
        if "/api/logs" in route.request.url and route.request.method == "POST":
            nonlocal sent_payload
            sent_payload = route.request.post_data_json
            route.fulfill(status=200, body='{"status": "ok"}')
        else:
            route.continue_()

    # Intercept /api/logs
    page.route("**/api/logs", handle_route)

    # 3. Trigger the console error in the browser context
    page.evaluate("""
        () => {
            const err = new Error("Simulated Crash");
            console.error("Context Message", err);
        }
    """)

    # 4. Wait a bit for the fetch to happen (it's async)
    page.wait_for_timeout(1000)

    # 5. Assertions
    print(f"Captured Payload: {sent_payload}")

    # Check if stack is present at the top level of the payload (which is what we fixed)
    # The fix promotes data.stack to the top level JSON payload 'data' object or the 'data' field?
    # Let's check logBridge.js again:
    # body: JSON.stringify({ level, message, data, timestamp })
    # And we updated 'data' to have 'stack'.

    assert sent_payload is not None, "No log request sent"
    assert sent_payload.get("level") == "error"
    assert sent_payload.get("message") == "Context Message"

    data = sent_payload.get("data", {})
    assert "stack" in data, "Stack trace missing from data object"
    assert "Simulated Crash" in data["stack"], (
        "Stack trace does not contain error message"
    )
