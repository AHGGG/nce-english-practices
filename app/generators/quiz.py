from __future__ import annotations

import json
from typing import List
from app.config import MODEL_NAME
from app.models import QuizItem, QuizOption
from app.services.prompt_manager import prompt_manager
from app.core.utils import parse_llm_json

def generate_quiz(client, topic: str, tense: str, aspect: str, correct_sentence: str) -> QuizItem:
    if not client:
        raise RuntimeError("LLM client unavailable for quiz generation")

    prompt = prompt_manager.format("quiz.user_template",
                                   topic=topic, tense=tense, aspect=aspect, correct_sentence=correct_sentence)
    system_prompt = prompt_manager.get("quiz.system")
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt}
    ]

    try:
        rsp = client.chat.completions.create(model=MODEL_NAME, messages=messages, temperature=0.7)
        content = rsp.choices[0].message.content.strip()
        data = parse_llm_json(content)

        # Map fields if the prompt format changed (e.g. prompt returns 'question' but model expects 'question_context')
        # The new prompt template outputs "question", "options", "correct_index", "explanation".
        # But QuizItem expects: question_context, options[List[QuizOption]], tense_category, aspect.

        # We need to adapt the LLM output to the Pydantic model.
        # Let's adjust the Python logic to match the new prompt output format.

        # Pydantic Model (QuizItem) likely needs:
        # question_context (str)
        # options (List[QuizOption])
        # tense_category
        # aspect

        # New Prompt returns:
        # question, options(List[str]), correct_index, explanation

        options_list = []
        raw_options = data.get("options", [])
        correct_idx = data.get("correct_index", 0)
        expl = data.get("explanation", "")

        for i, opt_text in enumerate(raw_options):
            is_correct = (i == correct_idx)
            options_list.append(QuizOption(
                id=chr(65+i), # A, B, C...
                text=opt_text,
                is_correct=is_correct,
                explanation=expl if is_correct else "Incorrect."
            ))

        return QuizItem(
            question_context=data.get("question", "Question?"),
            options=options_list,
            tense_category=tense,
            aspect=aspect
        )

    except Exception as e:
        print(f"Quiz Generation Error: {e}")
        # Fallback
        return QuizItem(
            question_context=f"Complete the sentence: {correct_sentence} ...",
            options=[
                QuizOption(id="A", text="Error", is_correct=True, explanation="Backend Error")
            ],
            tense_category=tense,
            aspect=aspect
        )
