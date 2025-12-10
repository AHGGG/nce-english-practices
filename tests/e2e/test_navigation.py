import pytest
from playwright.sync_api import Page, expect

def test_initial_load(page: Page, base_url: str):
    """
    Verify the app loads initially with the Learn tab active.
    """
    page.goto(base_url)
    
    # Check Title
    expect(page).to_have_title("NCE Active Grammar Gym")
    
    # Verify Learn section is visible
    learn_section = page.locator("#viewLearn")
    expect(learn_section).to_be_visible()
    
    # Verify Drill section is NOT visible
    drill_section = page.locator("#viewDrill")
    expect(drill_section).not_to_be_visible()

def test_tab_switching(page: Page, base_url: str):
    """
    Verify clicking navigation buttons switches views.
    """
    page.goto(base_url)
    
    # Switch to Drill
    page.click("button[data-view='viewDrill']")
    expect(page.locator("#viewDrill")).to_be_visible()
    expect(page.locator("#viewLearn")).not_to_be_visible()
    
    # Switch to Apply
    page.click("button[data-view='viewApply']")
    expect(page.locator("#viewApply")).to_be_visible()
    expect(page.locator("#viewDrill")).not_to_be_visible()
    
    # Switch to Stats
    page.click("button[data-view='viewStats']")
    expect(page.locator("#viewStats")).to_be_visible()
    
    # Switch back to Learn
    page.click("button[data-view='viewLearn']")
    expect(page.locator("#viewLearn")).to_be_visible()
