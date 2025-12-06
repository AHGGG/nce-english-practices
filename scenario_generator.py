from __future__ import annotations

import json
from config import MODEL_NAME
from models import ScenarioPrompt, ScenarioResponse

SCENARIO_PROMPT = """You are an English language coach.
Create a "Real-life Scenario" for the user to practice the target tense: "{tense} {aspect}".
Topic: "{topic}"

OUTPUT REQUIREMENTS:
1. Situation: A brief, realistic context (1-2 sentences).
2. Goal: A specific communicative goal (e.g., "Explain why...", "Ask about...", "Describe...").
   - The goal MUST require using the target tense naturally.
   - DO NOT give away the answer.

Output JSON Format:
{{
  "situation": "You arrive at the meeting 10 minutes late. The boss looks annoyed.",
  "goal": "Apologize and give a reason using the Past Simple tense."
}}
"""

GRADING_PROMPT = """You are an English teacher grading a student's answer.
Situation: "{situation}"
Goal: "{goal}"
Student Answer: "{user_input}"
Target Tense: "{tense}"

REQUIREMENTS:
1. Check if the Goal was achieved.
2. Check if the grammar (especially target tense) is correct.
3. Provide an Improved Version (natural, native-speaker level).

Output JSON Format:
{{
  "is_pass": true,
  "feedback": "Good job! You used the correct tense.",
  "improved_version": "I'm so sorry I'm late; traffic was terrible."
}}
"""

def generate_scenario(client, topic: str, tense: str, aspect: str) -> ScenarioPrompt:
    if not client:
        raise RuntimeError("LLM client unavailable")

    prompt = SCENARIO_PROMPT.format(topic=topic, tense=tense, aspect=aspect)
    
    messages = [
        {"role": "system", "content": "You create English practice scenarios."},
        {"role": "user", "content": prompt}
    ]

    try:
        rsp = client.chat.completions.create(model=MODEL_NAME, messages=messages, temperature=0.7)
        content = rsp.choices[0].message.content.strip()
        if content.startswith("```json"): content = content[7:-3]
        elif content.startswith("```"): content = content[3:-3]
        
        data = json.loads(content.strip())
        return ScenarioPrompt(**data)
    except Exception as e:
        return ScenarioPrompt(situation="Error generating scenario.", goal="Just practice asking a question.")

def grade_scenario_response(client, situation: str, goal: str, user_input: str, tense: str) -> ScenarioResponse:
    if not client:
        # Fallback without LLM
        return ScenarioResponse(is_pass=False, feedback="API Key missing. Cannot grade.", improved_version="")

    prompt = GRADING_PROMPT.format(situation=situation, goal=goal, user_input=user_input, tense=tense)
    
    messages = [
        {"role": "system", "content": "You are a helpful English teacher."},
        {"role": "user", "content": prompt}
    ]

    try:
        rsp = client.chat.completions.create(model=MODEL_NAME, messages=messages, temperature=0.0)
        content = rsp.choices[0].message.content.strip()
        if content.startswith("```json"): content = content[7:-3]
        elif content.startswith("```"): content = content[3:-3]
        
        data = json.loads(content.strip())
        # Inject user_input as it is required by the model and not returned by LLM
        data['user_input'] = user_input
        return ScenarioResponse(**data)
    except Exception as e:
        return ScenarioResponse(
            user_input=user_input,
            is_pass=False, 
            feedback=f"Grading error: {str(e)}", 
            improved_version=""
        )
