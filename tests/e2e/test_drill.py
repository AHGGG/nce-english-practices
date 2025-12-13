import pytest
from playwright.sync_api import Page, expect

def test_drill_flow(page: Page, base_url: str, mock_llm_response):
    """
    Test the Drill tab: loading sentences and taking a quiz.
    """
    # 1. Setup State (Drill requires a topic/vocab to be loaded first)
    # We simulate this by mocking the theme load first or ensuring state exists.
    # Actually, Drill page checks `if (topic && vocab && !sentences[...])`.
    # So we must go through Learn first OR mock the state injection (hard in E2E).
    # Easier: Go through Learn flow quickly.

    # Mock Learn APIs
    mock_llm_response(endpoint="theme", response_data={
        "topic": "DrillTopic",
        "slots": {"subject": ["I"], "verb": ["run"]},
        "verbs": [{"base": "run", "past": "ran", "participle": "run"}]
    })
    mock_llm_response(endpoint="sentences", response_data={
        "simple": {"affirmative": "I run.", "negative": "I do not run.", "question": "Do I run?"}
    })
    
    story_data = {
        "title": "Drill Story",
        "content": "I run every day.",
        "highlights": [],
        "grammar_notes": []
    }
    mock_llm_response(
        endpoint="story/stream", 
        response_data={}, 
        is_stream=True, 
        stream_chunks=[
            {"type": "text", "chunk": "I run every day."},
            {"type": "data", "story": story_data}
        ]
    )
    
    mock_llm_response(endpoint="scenario", response_data={})
    mock_llm_response(endpoint="chat/start", response_data={"session_id": "1", "mission": {}, "first_message": "Hi"})

    # Navigate and Load
    # Navigate and Load
    page.goto(base_url)
    
    # Initialize Topic
    # Wait for input to be ready and interact
    topic_input = page.locator("input[placeholder='Initialize Topic...']")
    expect(topic_input).to_be_visible()
    topic_input.fill("DrillTopic")
    page.locator("button[title='Execute']").click()
    
    # Wait for Drill link to be active/unlocked
    # Based on Sidebar implementation, it switches from div.cursor-not-allowed to a.href
    page.locator("a[href='/drill']").first.wait_for(state="visible", timeout=10000)

    # 3. Switch to Drill
    page.locator("a[href='/drill']").first.click()

    # 3. Verify Matrix Grid
    # Check button existence
    expect(page.locator("button", has_text="I run.").first).to_be_visible(timeout=10000)

    # 4. Click a cell to open Quiz
    # Setup Quiz Mock
    mock_llm_response(endpoint="quiz", response_data={
        "question_context": "Translate: I run.",
        "options": [
            {"id": "A", "text": "I run.", "is_correct": True, "explanation": "Correct."},
            {"id": "B", "text": "I ran.", "is_correct": False, "explanation": "Wrong tense."}
        ]
    })

    # Click the grid cell. 
    # Use 'button' since the grid uses buttons for interaction
    page.locator("button", has_text="I run.").first.click()

    # 5. Verify Modal
    expect(page.locator("text='Translate: I run.'")).to_be_visible()

    # 6. Answer Correctly
    # The option is rendered as text "I run." inside the modal.
    # We can scope to the modal to be safe, but since the modal covers the screen, clicking visible "I run." should work if we pick the right one.
    # The grid cell "I run." is covered by the modal backdrop? No, backdrop is translucent.
    # But strict mode fails.
    # Let's target the option specifically.
    # Option has class `border` and text "I run."
    # Or better: The option has "A" or "B" badge.
    # 6. Click Correct Option
    # Scope to modal (fixed z-100) to avoid clicking grid cell
    # Escape brackets in selector: z-[100] -> z-\[100\]
    page.locator(".fixed.z-\\[100\\] button", has_text="I run.").click()

    # 7. Check Feedback
    # Use has_text for safety
    expect(page.locator("text='Correct.'")).to_be_visible(timeout=5000)
