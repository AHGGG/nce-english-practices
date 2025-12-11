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
    expect(page.get_by_role("heading", name="NCE Practice")).to_be_visible()
    
    # Verify Learn link is active
    # We look for the link that has the active class style
    # first is a property, not a method
    learn_link = page.locator("a[href='/learn']").filter(has_text="Learn").first
    expect(learn_link).to_have_class(re.compile(r"text-sky-400"))

def test_tab_switching(page: Page, base_url: str):
    """
    Verify clicking navigation buttons switches views.
    """
    page.goto(base_url)
    
    # Helper to get visible link
    def get_link(href):
        # We might have mobile and desktop links.
        # The Sidebar links have text and icon.
        # first is a property
        return page.locator(f"a[href='{href}']").filter(has_text=re.compile(r"[a-zA-Z]")).first

    # Switch to Drill
    get_link("/drill").click()
    expect(get_link("/drill")).to_have_class(re.compile(r"text-sky-400"))
    expect(page).to_have_url(f"{base_url}/drill")
    
    # Switch to Apply
    get_link("/apply").click()
    expect(get_link("/apply")).to_have_class(re.compile(r"text-sky-400"))
    expect(page).to_have_url(f"{base_url}/apply")
    
    # Switch to Stats
    get_link("/stats").click()
    expect(get_link("/stats")).to_have_class(re.compile(r"text-sky-400"))
    expect(page).to_have_url(f"{base_url}/stats")
    
    # Switch back to Learn
    get_link("/learn").click()
    expect(get_link("/learn")).to_have_class(re.compile(r"text-sky-400"))
    expect(page).to_have_url(f"{base_url}/learn")
