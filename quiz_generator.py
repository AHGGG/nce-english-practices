from __future__ import annotations

import json
from typing import List
from config import MODEL_NAME
from models import QuizItem, QuizOption

QUIZ_PROMPT = """You are an expert English grammar test creator.
Create a Multiple Choice Question (MCQ) to test the user's knowledge of the target tense.

Context: The user is practicing "{tense} {aspect}".
Correct Sentence: "{sentence}"

REQUIREMENTS:
1. Create a "Fill-in-the-blank" question based on the Correct Sentence.
2. The ANSWER must be the correct conjugation from the sentence.
3. DISTRACTORS (Wrong Options):
   - Must be plausible mistakes (e.g., wrong tense, wrong auxiliary, wrong participle).
   - DO NOT use random words. Use other tenses or common learner errors.
4. Explanation: Brief 1-sentence reason why the answer is correct.

Output JSON Format:
{{
  "question_context": "Tomorrow by 5 PM, I ______ (finish) the work.",
  "options": [
    {{ "id": "A", "text": "will have finished", "is_correct": true, "explanation": "Future Perfect is used for actions completed before a future time." }},
    {{ "id": "B", "text": "will finish", "is_correct": false, "explanation": "Future Simple doesn't emphasize completion before a deadline." }},
    {{ "id": "C", "text": "have finished", "is_correct": false, "explanation": "Missing 'will' for future." }},
    {{ "id": "D", "text": "had finished", "is_correct": false, "explanation": "Past Perfect is for the past, not future." }}
  ],
  "tense_category": "{tense}",
  "aspect": "{aspect}"
}}
"""

def generate_quiz(client, topic: str, tense: str, aspect: str, correct_sentence: str) -> QuizItem:
    if not client:
        raise RuntimeError("LLM client unavailable for quiz generation")

    prompt = QUIZ_PROMPT.format(tense=tense, aspect=aspect, sentence=correct_sentence)
    
    messages = [
        {"role": "system", "content": "You create grammar drills."},
        {"role": "user", "content": prompt}
    ]

    try:
        rsp = client.chat.completions.create(model=MODEL_NAME, messages=messages, temperature=0.7)
        content = rsp.choices[0].message.content.strip()
        
        if content.startswith("```json"):
            content = content[7:-3]
        elif content.startswith("```"):
            content = content[3:-3]
            
        data = json.loads(content.strip())
        return QuizItem(**data)
    except Exception as e:
        # Fallback if LLM fails: create a basic dumb quiz (better than crashing)
        return QuizItem(
            question_context=f"Complete the sentence: {correct_sentence.replace(correct_sentence.split()[1], '_____', 1)}",
            options=[
                QuizOption(id="A", text="[Error Generating Options]", is_correct=True, explanation="Backend Error")
            ],
            tense_category=tense,
            aspect=aspect
        )
