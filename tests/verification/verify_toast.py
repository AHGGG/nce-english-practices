import time
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()

    # Navigate to the local dev server
    # We assume the server is running on port 3000 (standard for Vite)
    try:
        page.goto("http://localhost:3000")

        # We need a way to trigger a toast.
        # Since I can't easily modify the app to add a "trigger toast" button without modifying the source code further,
        # I will check if there's an existing way to trigger a toast or if I can inject one via console.

        # Inject code to trigger a toast using the context if possible,
        # but accessing React context from outside is hard.

        # Alternatively, I can look for a button that triggers a toast.
        # Register/Login usually trigger toasts on success/failure.
        # But that requires backend interaction.

        # Let's try to find a button on the landing page or dashboard.
        # If not, I might have to modify App.jsx temporarily to add a test button, but that's invasive.

        # Wait, the ToastProvider exposes `addToast` via context.
        # If I can't access it, I can't verify easily.

        # Let's see if I can find a button.
        # On localhost:3000, usually it redirects to login if not authenticated.

        print("Page title:", page.title())

        # Take a screenshot of the initial state
        page.screenshot(path="tests/verification/initial_state.png")

    except Exception as e:
        print(f"Error accessing page: {e}")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
