import pytest
import re
from playwright.sync_api import Page, expect

def test_initial_load(page: Page, base_url: str):
    """
    Verify the app loads initially with the Learn tab active.
    """
    page.goto(base_url)
    
    # Check Title
    # Use get_by_role to be specific about the heading level and name
    expect(page.get_by_role("heading", name="Active Gym")).to_be_visible()
    
    # Verify Learn link is active
    # We look for the link that has the active class style
    # first is a property, not a method
    learn_link = page.locator("a[href='/learn']").filter(has_text="Context").first
    expect(learn_link).to_have_class(re.compile(r"text-neon-green"))

def test_tab_switching(page: Page, base_url: str):
    """
    Verify clicking navigation buttons switches views.
    Handles 'System Standby' state where nav is locked until topic is set.
    """
    page.goto(base_url)
    
    # Helper to get visible link (or disabled item)
    def get_link(href):
        return page.locator(f"a[href='{href}']").filter(has_text=re.compile(r"[a-zA-Z]")).first

    def get_disabled_item(label):
        return page.locator(f"div.cursor-not-allowed").filter(has_text=label).first

    # 1. Verify initially locked
    expect(get_disabled_item("Matrix")).to_be_visible()
    expect(get_disabled_item("Scenario")).to_be_visible()

    # 2. Initialize Topic to unlock
    # We can just type into the input and hit enter/execute. 
    # Since we are running against real backend (or mocked), we need to ensure it succeeds.
    # For now, let's assume the backend is responding or we are monitoring mocks.
    # However, test_navigation doesn't setup mocks.
    # Let's type a simple topic.
    
    topic_input = page.locator("input[placeholder='Initialize Topic...']")
    if topic_input.is_visible():
        topic_input.fill("Test Navigation")
        page.locator("button[title='Execute']").click()
        
        # Wait for unlocking (nav items become links)
        # The topic generation might take a bit if real LLM is used, but usually it's fast or mocked in other tests.
        # This test file doesn't import mocks, so it might be hitting real backend?
        # If so, it depends on API keys. 
        # But we can try to wait for the link to appear.
        expect(get_link("/drill")).to_be_visible(timeout=10000)

    # 3. Switch to Drill
    get_link("/drill").click()
    expect(get_link("/drill")).to_have_class(re.compile(r"text-neon-green"))
    expect(page).to_have_url(f"{base_url}/drill")
    
    # 4. Switch to Apply
    get_link("/apply").click()
    expect(get_link("/apply")).to_have_class(re.compile(r"text-neon-green"))
    expect(page).to_have_url(f"{base_url}/apply")
    
    # 5. Switch to Stats (Always enabled)
    get_link("/stats").click()
    expect(get_link("/stats")).to_have_class(re.compile(r"text-neon-green"))
    expect(page).to_have_url(f"{base_url}/stats")
    
    # 6. Switch back to Learn
    get_link("/learn").click()
    expect(get_link("/learn")).to_have_class(re.compile(r"text-neon-green"))
    expect(page).to_have_url(f"{base_url}/learn")
