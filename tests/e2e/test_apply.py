import pytest
from playwright.sync_api import Page, expect

def test_chat_roleplay_flow(page: Page, base_url: str, mock_llm_response):
    """
    Test the Chat Roleplay flow in Apply tab.
    """
    # 1. Mock APIs
    mock_llm_response(endpoint="theme", response_data={"topic": "Spy", "slots": {}, "verbs": []})
    mock_llm_response(endpoint="sentences", response_data={})
    mock_llm_response(endpoint="story/stream", response_data={}, is_stream=True, stream_chunks=[{"type": "text", "chunk": "..."}])
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
    page.goto(base_url)
    page.locator("a[href='/apply'] >> visible=true").click()
    page.locator("button", has_text="Roleplay").click()

    # 3. Start Mission
    page.locator("input[placeholder='Initialize Topic...'] >> visible=true").fill("Spy Mission")
    page.locator("button[title='Execute'] >> visible=true").click()

    # 4. Verify Mission Started
    # Relaxed selector as color classes might change (e.g., text-neon-green)
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
    mock_llm_response(endpoint="story/stream", response_data={}, is_stream=True, stream_chunks=[{"type": "text", "chunk": "..."}])

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
    page.goto(base_url)
    page.locator("a[href='/apply'] >> visible=true").click()

    # Default tab is Challenge (Scenario)

    # Start
    page.locator("input[placeholder='Initialize Topic...'] >> visible=true").fill("Shopping")
    page.locator("button[title='Execute'] >> visible=true").click()

    # Verify Scenario
    expect(page.locator("text='You are at a shop.'")).to_be_visible(timeout=10000)

    # Submit Answer
    # ScenarioCard uses input[placeholder='Type your response here...'] (It changed from textarea to input in my read earlier? No, it was input type="text" in the read code!)
    # `input type="text" ... placeholder="Type your response here..."`
    page.locator("input[placeholder='Type your response here...']").fill("I buy milk.")
    page.locator("button", has_text="Submit").click()

    # Verify Feedback
    expect(page.locator("text='Perfect!'")).to_be_visible(timeout=10000)
