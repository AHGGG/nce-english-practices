import pytest
from playwright.sync_api import Page, expect

def test_stats_load(page: Page, base_url: str, mock_llm_response):
    """
    Test the Stats tab loading.
    """
    mock_llm_response(endpoint="stats", response_data={
        "total_xp": 100,
        "total_minutes": 50,
        "activities": [
            {"activity_type": "quiz", "count": 10, "passed": 8}
        ],
        "recent": [
            {"activity_type": "quiz", "topic": "Test", "tense": "present", "is_pass": True, "created_at": "2023-01-01"}
        ]
    })

    page.goto(base_url)
    page.locator("a[href='/stats'] >> visible=true").click()

    # Verify Data
    expect(page.locator("text='100'")).to_be_visible() # XP
    expect(page.locator("text='50'")).to_be_visible()  # Mins
    expect(page.locator("text='80%'")).to_be_visible() # Win Rate

    # Verify Chart (canvas exists)
    expect(page.locator("canvas")).to_be_visible()
