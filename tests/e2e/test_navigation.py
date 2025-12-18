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
    learn_link = page.locator("a[href='/learn']").filter(has_text="Context (Story)").first
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

    # 1. Initially hidden or disabled (Sidebar might show them but they are not links yet)
    # We'll skip the explicit disabled check and jump to initialization

    # 2. Initialize Topic to unlock
    topic_input = page.get_by_placeholder("Initialize Topic...")
    expect(topic_input).to_be_visible()
    topic_input.fill("Test Navigation")
    topic_input.press("Enter")
    
    # 3. Switch to Drill
    # Wait for the Matrix (Drill) link to appear in the sidebar
    # The topic generation might take a bit if real LLM is used.
    drill_link = page.get_by_role("link", name="Matrix (Drill)")
    expect(drill_link).to_be_visible(timeout=60000) 
    drill_link.click()
    expect(drill_link).to_have_class(re.compile(r"text-neon-green"))
    expect(page).to_have_url(f"{base_url}/drill")
    
    # 4. Switch to Apply
    apply_link = page.get_by_role("link", name="Scenario (Sim)")
    expect(apply_link).to_be_visible()
    apply_link.click()
    expect(apply_link).to_have_class(re.compile(r"text-neon-green"))
    expect(page).to_have_url(f"{base_url}/apply")
    
    # 5. Switch to Stats (Always enabled)
    stats_link = page.get_by_role("link", name="Performance")
    stats_link.click()
    expect(stats_link).to_have_class(re.compile(r"text-neon-green"))
    expect(page).to_have_url(f"{base_url}/stats")
    
    # 6. Switch back to Learn
    learn_link = page.get_by_role("link", name="Context (Story)")
    learn_link.click()
    expect(learn_link).to_have_class(re.compile(r"text-neon-green"))
    expect(page).to_have_url(f"{base_url}/learn")
