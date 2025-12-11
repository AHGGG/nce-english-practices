from __future__ import annotations

import json
from app.config import MODEL_NAME
from app.models import ScenarioPrompt, ScenarioResponse
from app.services.prompt_manager import prompt_manager
from app.core.utils import parse_llm_json

def generate_scenario(client, topic: str, tense: str, aspect: str) -> ScenarioPrompt:
    if not client:
        raise RuntimeError("LLM client unavailable")

    prompt = prompt_manager.format("scenario.generation.user_template", topic=topic, tense=tense, aspect=aspect)
    system_prompt = prompt_manager.get("scenario.generation.system")
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt}
    ]

    try:
        rsp = client.chat.completions.create(model=MODEL_NAME, messages=messages, temperature=0.7)
        content = rsp.choices[0].message.content.strip()
        content = rsp.choices[0].message.content.strip()
        data = parse_llm_json(content)
        return ScenarioPrompt(**data)
    except Exception as e:
        return ScenarioPrompt(situation="Error generating scenario.", goal="Just practice asking a question.")

def grade_scenario_response(client, situation: str, goal: str, user_input: str, tense: str) -> ScenarioResponse:
    if not client:
        # Fallback without LLM
        return ScenarioResponse(is_pass=False, feedback="API Key missing. Cannot grade.", improved_version="")

    prompt = prompt_manager.format("scenario.grading.user_template",
                                   situation=situation, goal=goal, user_input=user_input, tense=tense)
    system_prompt = prompt_manager.get("scenario.grading.system")
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt}
    ]

    try:
        rsp = client.chat.completions.create(model=MODEL_NAME, messages=messages, temperature=0.0)
        content = rsp.choices[0].message.content.strip()
        content = rsp.choices[0].message.content.strip()
        data = parse_llm_json(content)
        # Inject user_input as it is required by the model and not returned by LLM
        data['user_input'] = user_input
        # Map fields if new prompt changed keys
        if 'better_response' in data and 'improved_version' not in data:
            data['improved_version'] = data['better_response']

        return ScenarioResponse(**data)
    except Exception as e:
        return ScenarioResponse(
            user_input=user_input,
            is_pass=False, 
            feedback=f"Grading error: {str(e)}", 
            improved_version=""
        )
