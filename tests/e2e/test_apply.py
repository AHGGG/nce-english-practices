import pytest
from playwright.sync_api import Page, expect

def test_chat_roleplay_flow(page: Page, base_url: str, mock_llm_response):
    """
    Test the Chat Roleplay flow in Apply tab.
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

    # 2. Navigate to Apply
    # 2. Start Mission (Initialize Topic first)
    # 2. Navigate to Apply
    # 2. Start Mission (Initialize Topic first)
    page.goto(base_url)
    
    # New Flow: Must initialize topic to unlock navigation
    topic_input = page.locator("input[placeholder='Initialize Topic...']")
    expect(topic_input).to_be_visible()
    topic_input.fill("Spy Mission")
    page.locator("button[title='Execute']").click()

    # Wait for Apply link to be unlocked
    page.locator("a[href='/apply']").first.wait_for(state="visible", timeout=10000)
    
    # 4. Navigate and Select Tab
    page.locator("a[href='/apply']").first.click()
    page.locator("button", has_text="Roleplay").click()

    # 5. Verify Mission Started
    expect(page.locator("p", has_text="Secret Agent")).to_be_visible(timeout=10000)

    # 5. Send a Message
    # ChatCard uses id="chatInput"
    page.locator("#chatInput").fill("I accept.")
    page.locator("#chatSendBtn").click()

    # 6. Verify Reply
    expect(page.locator("span", has_text="Good job, Agent.")).to_be_visible(timeout=10000)

def test_scenario_challenge_flow(page: Page, base_url: str, mock_llm_response):
    """
    Test the Scenario Challenge flow in Apply tab.
    """
    # Mock APIs
    mock_llm_response(endpoint="theme", response_data={"topic": "Shop", "slots": {}, "verbs": []})
    mock_llm_response(endpoint="sentences", response_data={})
    story_data = {"title": "Shop", "content": "...", "highlights": [], "grammar_notes": []}
    mock_llm_response(
        endpoint="story/stream", 
        response_data={}, 
        is_stream=True, 
        stream_chunks=[
            {"type": "text", "chunk": "..."},
            {"type": "data", "story": story_data}
        ]
    )

    # Mock Scenario Generation
    mock_llm_response(
        endpoint="scenario",
        response_data={
            "situation": "You are at a shop.",
            "goal": "Buy milk."
        }
    )
    mock_llm_response(endpoint="chat/start", response_data={"session_id": "1", "mission": {}, "first_message": "Hi"})

    # Mock Grading
    mock_llm_response(
        endpoint="scenario/grade",
        response_data={
            "is_pass": True,
            "feedback": "Perfect!",
            "score": 100
        }
    )

    # Navigate
    # Navigate
    # Navigate
    # Navigate
    page.goto(base_url)
    
    # Start (Initialize first)
    topic_input = page.locator("input[placeholder='Initialize Topic...']")
    expect(topic_input).to_be_visible()
    topic_input.fill("Shopping")
    page.locator("button[title='Execute']").click()
    
    # Wait for Apply link to be unlocked
    page.locator("a[href='/apply']").first.wait_for(state="visible", timeout=10000)
    
    # Navigate to Apply
    page.locator("a[href='/apply']").first.click()

    # Default tab is Challenge (Scenario)

    # Verify Scenario
    # Text is wrapped in quotes in UI, so use has_text to be safe
    expect(page.locator("p", has_text="You are at a shop.")).to_be_visible(timeout=10000)

    # Submit Answer
    # ScenarioCard placeholder is uppercase with >>
    page.locator("input[placeholder='>> TYPE RESPONSE HERE...']").fill("I buy milk.")
    page.locator("button", has_text="TRANSMIT").click()

    # Verify Feedback
    expect(page.locator("text='Perfect!'")).to_be_visible(timeout=10000)
