
import asyncio
from playwright.sync_api import sync_playwright, expect
import time

def verify_accessibility(page):
    # Listen for console logs
    page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))
    page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

    print("Navigating to Lab Calibration page...")
    # Set up route BEFORE navigation to ensure we catch the initial fetch
    print("Setting up route interception for session data...")
    page.route("**/api/proficiency/calibration/session**", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"sentences": ["This is a test sentence for verification."], "level": 0}'
    ))

    page.goto("http://localhost:3000/lab/calibration")

    # Wait for the page to load
    page.wait_for_load_state("networkidle")

    print("Verifying Back Button ARIA label...")
    # Verify the back button has the correct ARIA label
    back_button = page.get_by_label("Go back")
    expect(back_button).to_be_visible()
    print("✅ Back button with aria-label='Go back' found.")

    # Check button state
    start_button = page.get_by_role("button", name="START SEQUENCE")

    # Wait for button to be enabled (it might be disabled initially while loading)
    print("Waiting for Start button to be enabled...")
    try:
        expect(start_button).to_be_enabled(timeout=10000)
        print("✅ Start button is enabled.")
    except Exception as e:
        print(f"❌ Start button did not become enabled: {e}")
        page.screenshot(path="scripts/verification/debug_start_disabled.png")
        raise

    print("Clicking Start Sequence...")
    start_button.click()

    # Wait for reading step
    print("Waiting for 'Sentence 1 / 1'...")
    try:
        page.wait_for_selector("text=Sentence 1 / 1", timeout=10000)
        print("✅ Reading step loaded.")
    except Exception as e:
        print(f"❌ Reading step did not load: {e}")
        page.screenshot(path="scripts/verification/debug_reading_fail.png")
        raise

    print("Clicking a word to open inspector...")
    # Click on the word "test"
    # The word is in a span with data-word="test"
    # Wait for the word to be visible first
    page.wait_for_selector("span[data-word='test']")
    page.locator("span[data-word='test']").click()

    # Wait for inspector to open
    print("Waiting for inspector...")
    page.wait_for_selector("text=Consulting Dictionary")

    print("Verifying Inspector Buttons ARIA labels...")

    # Verify Play button
    # The label depends on the selected word, which is "test"
    play_button = page.get_by_label("Play pronunciation for test")
    expect(play_button).to_be_visible()
    print("✅ Play button with aria-label='Play pronunciation for test' found.")

    # Verify Close button
    close_button = page.get_by_label("Close dictionary")
    expect(close_button).to_be_visible()
    print("✅ Close button with aria-label='Close dictionary' found.")

    # Take screenshot of the inspector
    page.screenshot(path="scripts/verification/a11y_verification.png")
    print("📸 Screenshot taken.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_accessibility(page)
        except Exception as e:
            print(f"❌ Verification failed: {e}")
            raise
        finally:
            browser.close()
