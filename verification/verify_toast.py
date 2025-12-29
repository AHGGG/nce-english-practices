import asyncio
from playwright.async_api import async_playwright

async def verify_toast_a11y():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Create a new context with ignore_https_errors since we are using local dev
        context = await browser.new_context(ignore_https_errors=True)
        page = await context.new_page()

        # Navigate to the app - try both ports just in case
        print("Navigating to https://localhost:5173")
        try:
            # wait_until="domcontentloaded" is faster and might be enough for us to check the DOM
            await page.goto("https://localhost:5173", timeout=10000, wait_until="domcontentloaded")
            print(f"Loaded page: {page.url}")
        except Exception as e:
            print(f"Failed to navigate: {e}")
            await browser.close()
            return

        print("Page loaded. Checking for toast container...")

        # Wait for the toast container to be present
        # We modified it to have role="region" and aria-label="Notifications"
        # We can select it by role

        try:
             container = page.get_by_role("region", name="Notifications")
             # Wait for it to be attached
             await container.wait_for(state="attached", timeout=5000)

             if await container.count() > 0:
                 print("Success: Found toast container with role=region and name=Notifications")
                 print(f"Aria-Live: {await container.get_attribute(aria-live)}")
             else:
                 print("Container not found by role/name.")
        except Exception as e:
             print(f"Error finding container: {e}")

        # Inspecting DOM just in case
        divs = page.locator("div.fixed.bottom-4.right-4")
        if await divs.count() > 0:
            print("Found toast container div via CSS.")
            role = await divs.get_attribute("role")
            label = await divs.get_attribute("aria-label")
            live = await divs.get_attribute("aria-live")
            print(f"Role: {role}")
            print(f"Aria-Label: {label}")
            print(f"Aria-Live: {live}")
        else:
            print("Could not find toast container div via CSS.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_toast_a11y())
