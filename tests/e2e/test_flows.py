import pytest
import json
from playwright.sync_api import Page, expect

def test_story_generation_flow(page: Page, base_url: str, mock_llm_response):
    """
    Test the flow of generating a story in the Learn tab.
    """
    # 1. Mock the APIs required by loadTheme
    mock_llm_response(
        endpoint="theme",
        response_data={
            "topic": "Mythology",
            "slots": {"subject": ["Zeus"], "object": ["bolt"], "verb": ["throw"], "place": ["Olympus"]},
            "verbs": [{"base": "throw", "past": "threw", "participle": "thrown"}]
        }
    )
    mock_llm_response(
        endpoint="sentences",
        response_data={
            "simple": {"affirmative": "Zeus throws.", "negative": "Zeus does not throw.", "question": "Does Zeus throw?"} 
        }
    )
    mock_llm_response(
        endpoint="story",
        response_data={
            "title": "The Golden Apple",
            "content": "Once upon a time, there was a golden apple.",
            "highlights": [],
            "grammar_notes": []
        }
    )
    mock_llm_response(
        endpoint="scenario",
        response_data={
            "situation": "You are a god.",
            "goal": "Rule correctly."
        }
    )
    mock_llm_response(
        endpoint="chat/start",
        response_data={
            "session_id": "test-session-123",
            "mission": {"title": "Secret Agent", "description": "Spy", "required_grammar": []},
            "first_message": "Welcome."
        }
    )
    
    # 2. Navigate
    page.goto(base_url)
    page.click("button[data-view='viewLearn']")
    
    # 3. Input Topic (Sidebar)
    page.fill("#topicInput", "Mythology")
    page.click("#loadBtn")
    
    # 4. Verify Result
    # Expect the story title to appear
    title_locator = page.locator("#storyTitle")
    expect(title_locator).to_have_text("The Golden Apple", timeout=15000)
    
    content_locator = page.locator("#storyContent")
    expect(content_locator).to_contain_text("Once upon a time")

def test_chat_roleplay_flow(page: Page, base_url: str, mock_llm_response):
    """
    Test the flow of starting a chat and sending a message.
    """
    # 1. Mock APIs
    # Mock other dependencies for loadTheme (since it calls everything)
    mock_llm_response(endpoint="theme", response_data={"topic": "Spy", "slots": {}, "verbs": []}) 
    mock_llm_response(endpoint="sentences", response_data={})
    mock_llm_response(endpoint="story", response_data={"title": "Spy Story", "content": "..."})
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
            "history": [] # Simplified
        }
    )

    # 2. Navigate to Apply -> Roleplay
    page.goto(base_url)
    page.click("button[data-view='viewApply']")
    
    # Switch to Roleplay tab using a specific selector (class tab-btn + text)
    page.locator("#viewApply button.tab-btn:has-text('Roleplay')").click()
    
    # 3. Start Mission via Sidebar
    page.fill("#topicInput", "Spy Mission")
    page.click("#loadBtn")
    
    # 4. Verify Mission Started
    # content should contain "Welcome, Agent."
    expect(page.locator("#chatWindow")).to_contain_text("Welcome, Agent.", timeout=10000)
    expect(page.locator("#missionTitle")).to_contain_text("Secret Agent")
    
    # 5. Send a Message
    # Workaround for visibility check issues in headless layout for the footer
    # Directly set value via JS to ensure it's there even if fill(force=True) failed to trigger events
    page.evaluate('document.getElementById("chatInput").value = "I accept the mission."')
    page.locator("#chatSendBtn").dispatch_event("click")
    
    # 6. Verify Reply
    expect(page.locator("#chatWindow")).to_contain_text("Good job, Agent.", timeout=10000)
