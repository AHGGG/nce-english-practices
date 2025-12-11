import pytest
import json
from playwright.sync_api import Page, expect

def test_story_generation_flow(page: Page, base_url: str, mock_llm_response):
    """
    Test the flow of generating a story in the Learn tab.
    """
    # Debug console
    page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))
    page.on("pageerror", lambda err: print(f"BROWSER ERROR: {err}"))

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

    # Mock Streaming Story
    story_data = {
        "title": "The Golden Apple",
        "content": "Once upon a time, there was a golden apple.",
        "highlights": [],
        "grammar_notes": []
    }
    mock_llm_response(
        endpoint="story/stream",
        response_data={}, # ignored for stream
        is_stream=True,
        stream_chunks=[
            {"type": "text", "chunk": "Once upon a time"},
            {"type": "text", "chunk": ", there was a golden apple."},
            {"type": "data", "story": story_data}
        ]
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
    
    # 2. Navigate (default is /learn)
    page.goto(base_url)
    
    # 3. Input Topic (Sidebar)
    topic_input = page.locator("input[placeholder='Enter topic...'] >> visible=true")
    expect(topic_input).to_be_visible()
    topic_input.fill("Mythology")
    
    # Click generate button next to it
    generate_btn = page.locator("button[title='Generate'] >> visible=true")
    generate_btn.click()
    
    # Check for error message
    error_msg = page.locator(".text-red-400")
    if error_msg.is_visible():
        print(f"ERROR MESSAGE VISIBLE: {error_msg.text_content()}")

    # 4. Verify Result
    try:
        # StoryReader.jsx renders h3 with title
        expect(page.locator("h3", has_text="The Golden Apple")).to_be_visible(timeout=15000)

        # Story content is in a prose div
        content_locator = page.locator(".prose")
        expect(content_locator).to_contain_text("Once upon a time")
    except AssertionError:
        print("ASSERTION FAILED. PAGE CONTENT:")
        print(page.content())
        raise

def test_chat_roleplay_flow(page: Page, base_url: str, mock_llm_response):
    """
    Test the flow of starting a chat and sending a message.
    """
    page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))
    page.on("pageerror", lambda err: print(f"BROWSER ERROR: {err}"))

    # 1. Mock APIs
    mock_llm_response(endpoint="theme", response_data={"topic": "Spy", "slots": {}, "verbs": []}) 
    mock_llm_response(endpoint="sentences", response_data={})

    # Mock stream for implicit story load (if any)
    mock_llm_response(
        endpoint="story/stream",
        response_data={},
        is_stream=True,
        stream_chunks=[{"type": "text", "chunk": "..."}]
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
    page.goto(base_url)
    
    # Click link to Apply. Use visible=true to avoid hidden mobile/desktop duplicates
    page.locator("a[href='/apply'] >> visible=true").click()
    
    # Switch to Roleplay tab in Apply.jsx
    # Button with text 'Roleplay'
    page.locator("button", has_text="Roleplay").click()
    
    # 3. Start Mission via Sidebar
    topic_input = page.locator("input[placeholder='Enter topic...'] >> visible=true")
    expect(topic_input).to_be_visible()
    topic_input.fill("Spy Mission")
    
    generate_btn = page.locator("button[title='Generate'] >> visible=true")
    generate_btn.click()
    
    # 4. Verify Mission Started
    try:
        # ChatCard.jsx: Mission title in emerald text
        expect(page.locator("p.text-emerald-400", has_text="Secret Agent")).to_be_visible(timeout=10000)

        # Verify first message
        expect(page.locator("span", has_text="Welcome, Agent.")).to_be_visible()

        # 5. Send a Message
        # ChatCard.jsx: input[placeholder='Say something...']
        # Button: button with text 'Send'
        chat_input = page.locator("input[placeholder='Say something...']")
        expect(chat_input).to_be_visible()
        chat_input.fill("I accept the mission.")

        send_btn = page.locator("button", has_text="Send")
        send_btn.click()

        # 6. Verify Reply
        expect(page.locator("span", has_text="Good job, Agent.")).to_be_visible(timeout=10000)
    except AssertionError:
        print("ASSERTION FAILED. PAGE CONTENT:")
        print(page.content())
        raise
