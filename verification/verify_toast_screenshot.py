import asyncio
from playwright.async_api import async_playwright

async def verify_toast_a11y():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(ignore_https_errors=True)
        page = await context.new_page()

        print("Navigating to https://localhost:5173")
        await page.goto("https://localhost:5173", timeout=10000, wait_until="domcontentloaded")
        print(f"Loaded page: {page.url}")

        print("Page loaded. Checking for toast container...")

        container = page.get_by_role("region", name="Notifications")
        # Wait for it to be attached
        await container.wait_for(state="attached", timeout=5000)

        if await container.count() > 0:
             print("Success: Found toast container with role=region and name=Notifications")
             # Take a screenshot
             await page.screenshot(path="verification/toast_container.png")
             print("Screenshot saved to verification/toast_container.png")
        else:
             print("Container not found by role/name.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_toast_a11y())
