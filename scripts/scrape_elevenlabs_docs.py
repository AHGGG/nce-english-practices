import asyncio
from pathlib import Path
from urllib.parse import urlparse

import httpx
from playwright.async_api import async_playwright

BASE_URL = "https://elevenlabs.io/docs/api-reference/introduction"
OUTPUT_DIR = Path("docs/voice/elevenlabs")


async def extract_links():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        print(f"Navigating to {BASE_URL}...")
        await page.goto(BASE_URL)

        # Wait for sidebar to load
        await page.wait_for_selector("nav", timeout=10000)

        # Expand all sidebar sections
        print("Expanding sidebar sections...")
        # Keep clicking buttons until no unexpanded buttons remain
        # We look for buttons that are likely closed sections.
        # Based on inspection, they have data-state="inactive"
        for i in range(5):  # Passes
            # Re-query every time because DOM changes
            buttons = await page.query_selector_all(
                'button.fern-sidebar-link[data-state="inactive"]'
            )
            if not buttons:
                print("No more inactive buttons found.")
                break

            print(f"Pass {i + 1}: Found {len(buttons)} inactive buttons. Clicking...")
            for button in buttons:
                try:
                    # check if still inactive (might have changed if parent click affected it, though unlikely in this flat list)
                    state = await button.get_attribute("data-state")
                    if state == "inactive":
                        await button.click()
                        await asyncio.sleep(0.1)
                except Exception:
                    pass
            await asyncio.sleep(1)

        # Extract all links
        print("Extracting links...")
        links = await page.evaluate("""() => {
            const anchors = Array.from(document.querySelectorAll('a.fern-sidebar-link'));
            return anchors.map(a => ({
                href: a.href,
                text: a.innerText.trim()
            }));
        }""")

        await browser.close()

        # Filter for api-reference links only
        api_links = [l for l in links if "/docs/api-reference/" in l["href"]]
        # Deduplicate by href
        seen = set()
        unique_links = []
        for l in api_links:
            if l["href"] not in seen:
                seen.add(l["href"])
                unique_links.append(l)

        print(f"Found {len(unique_links)} unique API reference links.")
        return unique_links


async def download_markdown(client, link):
    url = link["href"]
    # If it ends with slash, remove it before appending .md?
    # Actually the user example was .../introduction.md.
    # Usually .../endpoint becomes .../endpoint.md

    # We need to construct the storage path
    parsed = urlparse(url)
    path_parts = parsed.path.strip("/").split("/")

    # path_parts example: ['docs', 'api-reference', 'text-to-speech', 'convert']
    # We want to save to docs/voice/elevenlabs/text-to-speech/convert.md
    # So we take the parts after 'api-reference'

    try:
        idx = path_parts.index("api-reference")
        rel_parts = path_parts[idx + 1 :]
    except ValueError:
        # Fallback if structure is weird
        rel_parts = path_parts[-1:]

    save_path = OUTPUT_DIR / Path(*rel_parts).with_suffix(".md")

    # Construct Markdown URL
    md_url = url + ".md"

    try:
        print(f"Downloading {md_url}...")
        resp = await client.get(md_url)
        resp.raise_for_status()

        save_path.parent.mkdir(parents=True, exist_ok=True)
        save_path.write_text(resp.text, encoding="utf-8")
        # print(f"Saved to {save_path}")
        return True
    except Exception as e:
        print(f"Failed to download {md_url}: {e}")
        return False


async def main():
    if not OUTPUT_DIR.exists():
        OUTPUT_DIR.mkdir(parents=True)

    links = await extract_links()

    async with httpx.AsyncClient(timeout=30.0) as client:
        tasks = []
        for link in links:
            tasks.append(download_markdown(client, link))

        results = await asyncio.gather(*tasks)

    print(f"Completed. Successfully downloaded {sum(results)}/{len(results)} files.")


if __name__ == "__main__":
    import sys

    # Verify dependencies are installed
    try:
        import playwright
        import httpx
    except ImportError:
        print("Please install requirements: uv sync --dev")
        sys.exit(1)

    asyncio.run(main())
