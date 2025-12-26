
import os
import sys
import time
from playwright.sync_api import sync_playwright, expect

def test_drill_functionality(page):
    # Use relative path for screenshots
    output_dir = "verification"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    print("Navigating to drill page...")
    page.goto("https://localhost:5174/drill")

    time.sleep(3)

    print("Checking page content...")
    try:
        expect(page.get_by_text("Tense Matrix Drill")).to_be_visible(timeout=5000)
        print("Header found!")
    except:
        print("Drill header not found, taking debug screenshot...")
        page.screenshot(path=f"{output_dir}/debug_start.png")
        pass

    page.screenshot(path=f"{output_dir}/drill_page.png")
    print(f"Screenshots saved to {output_dir}")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--ignore-certificate-errors'])
        context = browser.new_context(ignore_https_errors=True)
        page = context.new_page()
        try:
            test_drill_functionality(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
