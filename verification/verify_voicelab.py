
import os
import time
from playwright.sync_api import sync_playwright, expect

def verify_voicelab_accessibility():
    with sync_playwright() as p:
        # Launch browser with ignore_https_errors=True because the dev server might use self-signed certs
        browser = p.chromium.launch(headless=True, args=['--ignore-certificate-errors'])
        context = browser.new_context(ignore_https_errors=True)
        page = context.new_page()

        # Navigate to VoiceLab
        # pnpm dev is running on 5173 with HTTPS
        base_url = "https://localhost:5173"

        try:
            page.goto(f"{base_url}/voice-lab", timeout=30000)
        except Exception as e:
            print(f"Failed to load {base_url}/voice-lab: {e}")
            return

        print(f"Navigated to {base_url}/voice-lab")

        # Wait for the tabs to appear
        tab_list = page.get_by_role("tablist", name="Voice Vendors")
        expect(tab_list).to_be_visible()
        print("Tablist found")

        # Verify Google Gemini Tab
        google_tab = page.get_by_role("tab", name="Google Gemini")
        expect(google_tab).to_be_visible()

        # Check attributes
        # aria-selected should be false initially (default is 'loop')
        expect(google_tab).to_have_attribute("aria-selected", "false")
        expect(google_tab).to_have_attribute("aria-controls", "panel-google")
        print("Google tab attributes verified (inactive)")

        # Verify Active Tab (Conversation Loop)
        loop_tab = page.get_by_role("tab", name="Conversation Loop")
        expect(loop_tab).to_have_attribute("aria-selected", "true")
        print("Loop tab attributes verified (active)")

        # Click Google Tab
        google_tab.click()

        # Verify state change
        expect(google_tab).to_have_attribute("aria-selected", "true")
        expect(loop_tab).to_have_attribute("aria-selected", "false")
        print("Tab switching verified")

        # Verify Panel
        panel = page.get_by_role("tabpanel", name="Google Gemini") # aria-labelledby points to the tab with this name
        expect(panel).to_be_visible()
        print("Tab panel verified")

        # Take screenshot
        page.screenshot(path="verification/voicelab_tabs.png")
        print("Screenshot saved to verification/voicelab_tabs.png")

        browser.close()

if __name__ == "__main__":
    verify_voicelab_accessibility()
