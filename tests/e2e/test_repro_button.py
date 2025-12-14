import pytest
from playwright.sync_api import Page, expect

def test_repro_button_position(page: Page, base_url: str, mock_llm_response):
    """
    Test to reproduce the issue where 'Optimize Syntax' button is too far left.
    """
    # 1. Mock APIs
    mock_llm_response(endpoint="theme", response_data={"topic": "Spy", "slots": {}, "verbs": []})
    mock_llm_response(endpoint="sentences", response_data={})

    story_data = {"title": "Spy", "content": "...", "highlights": [], "grammar_notes": []}
    mock_llm_response(
        endpoint="story/stream",
        response_data={},
        is_stream=True,
        stream_chunks=[
            {"type": "text", "chunk": "..."},
            {"type": "data", "story": story_data}
        ]
    )

    mock_llm_response(endpoint="scenario", response_data={"situation": "Spying", "goal": "Find intel"})

    mock_llm_response(
        endpoint="chat/start",
        response_data={
            "session_id": "test-session-123",
            "mission": {
                "title": "Secret Agent",
                "description": "You are a spy.",
                "required_grammar": ["Use Past Simple"]
            },
            "first_message": "Welcome, Agent."
        }
    )

    mock_llm_response(
        endpoint="chat/reply",
        response_data={
            "reply": "Good job, Agent.",
            "history": []
        }
    )

    # 2. Navigate and Start Mission
    page.goto(base_url)
    topic_input = page.locator("input[placeholder='Initialize Topic...']")
    expect(topic_input).to_be_visible()
    topic_input.fill("Spy Mission")
    page.locator("button[title='Execute']").click()

    # Wait for Apply link
    page.locator("a[href='/apply']").first.wait_for(state="visible", timeout=10000)

    # 3. Go to Apply -> Roleplay
    page.locator("a[href='/apply']").first.click()
    page.locator("button", has_text="Roleplay").click()
    expect(page.locator("p", has_text="Secret Agent")).to_be_visible(timeout=10000)

    # 4. Send a SHORT Message "Hi"
    page.locator("#chatInput").fill("Hi")
    page.locator("#chatSendBtn").click()

    # 5. Verify Message and Button Position
    # Wait for bubble
    # The bubble contains "Hi".
    # The bubble is inside a div with border.
    bubble_text = page.locator("span", has_text="Hi").last
    bubble = bubble_text.locator("xpath=..")
    expect(bubble).to_be_visible()

    # Get row (parent of bubble)
    row = bubble.locator("xpath=..")

    # Hover row
    row.hover()

    # Find button
    button = row.locator("button[title='Optimize Syntax']")
    # Force wait for button to be attached
    button.wait_for(state="attached")

    # Get positions
    bubble_box = bubble.bounding_box()
    button_box = button.bounding_box()
    row_box = row.bounding_box()

    print(f"\nRow Box: {row_box}")
    print(f"Bubble Box: {bubble_box}")
    print(f"Button Box: {button_box}")

    # Calculate Gap
    # Button is to the left of Bubble.
    # Gap = Bubble Left - Button Right
    gap = bubble_box['x'] - (button_box['x'] + button_box['width'])
    print(f"Gap between Button Right and Bubble Left: {gap}px")

    # Assert
    # If gap is huge (e.g., > 30px), fail.
    # The intended gap is roughly:
    # Button is at -left-12 (48px) relative to container left.
    # Bubble is at Container left (start of content).
    # So Button Left = Bubble Left - 48px.
    # Button Width ~30px.
    # Button Right = Bubble Left - 48 + 30 = Bubble Left - 18px.
    # Gap = Bubble Left - Button Right = 18px.

    # If the bug exists:
    # Row Width is 85% of screen.
    # Bubble is at Right of Row.
    # Button is at Left of Row - 48px.
    # Gap = (Row Width - Bubble Width) + 18px.
    # If Row Width >> Bubble Width, Gap is large.

    assert gap < 40, f"Button is too far! Gap is {gap}px. It should be close to 18px."
