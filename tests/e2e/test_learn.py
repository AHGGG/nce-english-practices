import pytest
from playwright.sync_api import Page, expect

def test_story_generation_flow(page: Page, base_url: str, mock_llm_response):
    """
    Test the flow of generating a story in the Learn tab.
    """
    # 1. Mock the APIs
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

    story_data = {
        "title": "The Golden Apple",
        "content": "Once upon a time, there was a golden apple.",
        "highlights": [],
        "grammar_notes": []
    }
    mock_llm_response(
        endpoint="story/stream",
        response_data={},
        is_stream=True,
        stream_chunks=[
            {"type": "text", "chunk": "Once upon a time"},
            {"type": "text", "chunk": ", there was a golden apple."},
            {"type": "data", "story": story_data}
        ]
    )

    mock_llm_response(endpoint="scenario", response_data={"situation": "You are a god.", "goal": "Rule correctly."})
    mock_llm_response(endpoint="chat/start", response_data={"session_id": "123", "mission": {"title": "Spy", "description": "Spy", "required_grammar": []}, "first_message": "Hi"})

    # 2. Navigate
    page.goto(base_url)

    # 3. Input Topic
    topic_input = page.locator("input[placeholder='Enter topic...'] >> visible=true")
    expect(topic_input).to_be_visible()
    topic_input.fill("Mythology")

    page.locator("button[title='Generate'] >> visible=true").click()

    # 4. Verify Result
    expect(page.locator("h3", has_text="The Golden Apple")).to_be_visible(timeout=15000)
    expect(page.locator(".prose")).to_contain_text("Once upon a time")
