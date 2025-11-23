from __future__ import annotations

import difflib
import json
from datetime import datetime
from typing import Dict, Iterable, List, Optional

from config import EXPORT_FILE, OPENAI_API_KEY, OPENAI_BASE_URL, PROGRESS_FILE
from models import BaseSentence, SelectionSnapshot
from openai import OpenAI

client = OpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL) if OPENAI_API_KEY else None


# ======================
# Sentence generators
# ======================
def gen_simple_present(s: BaseSentence) -> str:
    third_person = s.subject.strip().lower() not in {"i", "you", "we", "they"}
    verb = s.verb_base + "s" if third_person else s.verb_base
    return " ".join(filter(None, [s.subject, verb, s.object, s.manner, s.place, s.time])).strip()


def gen_present_continuous(s: BaseSentence) -> str:
    subject = s.subject.strip().lower()
    if subject == "i":
        be = "am"
    elif subject in {"you", "we", "they"}:
        be = "are"
    else:
        be = "is"
    return " ".join(filter(None, [s.subject, be, f"{s.verb_base}ing", s.object, s.manner, s.place, s.time])).strip()


def gen_simple_past(s: BaseSentence) -> str:
    return " ".join(filter(None, [s.subject, s.verb_past, s.object, s.manner, s.place, s.time])).strip()


def gen_future(s: BaseSentence) -> str:
    return " ".join(filter(None, [s.subject, "will", s.verb_base, s.object, s.manner, s.place, s.time])).strip()


TENSE_GENERATORS = {
    "simple_present": gen_simple_present,
    "present_continuous": gen_present_continuous,
    "simple_past": gen_simple_past,
    "future": gen_future,
}


def _rest_clause(sentence: BaseSentence) -> str:
    return " ".join(filter(None, [sentence.object, sentence.manner, sentence.place, sentence.time]))


def _be_form(subject: str) -> str:
    subj = subject.strip().lower()
    if subj == "i":
        return "am"
    if subj in {"you", "we", "they"}:
        return "are"
    return "is"


def to_negative(tense: str, sentence: BaseSentence) -> str:
    rest = _rest_clause(sentence)
    subject = sentence.subject
    parts = []
    if tense == "simple_present":
        helper = "do" if subject.lower() in {"i", "you", "we", "they"} else "does"
        parts = [subject, helper, "not", sentence.verb_base]
    elif tense == "present_continuous":
        be = _be_form(subject)
        parts = [subject, be, "not", f"{sentence.verb_base}ing"]
    elif tense == "simple_past":
        parts = [subject, "did", "not", sentence.verb_base]
    elif tense == "future":
        parts = [subject, "will", "not", sentence.verb_base]
    if rest:
        parts.append(rest)
    return " ".join(parts).strip()


def to_question(tense: str, sentence: BaseSentence) -> str:
    rest = _rest_clause(sentence)
    subject = sentence.subject
    if tense == "simple_present":
        helper = "Do" if subject.lower() in {"i", "you", "we", "they"} else "Does"
        return " ".join(filter(None, [f"{helper}", subject, sentence.verb_base, rest])) + "?"
    if tense == "present_continuous":
        be = _be_form(subject).capitalize()
        return " ".join(filter(None, [be, subject, f"{sentence.verb_base}ing", rest])) + "?"
    if tense == "simple_past":
        return " ".join(filter(None, ["Did", subject, sentence.verb_base, rest])) + "?"
    if tense == "future":
        return " ".join(filter(None, ["Will", subject, sentence.verb_base, rest])) + "?"
    return ""


def build_matrix(sentence: BaseSentence, tenses: Optional[Iterable[str]] = None, forms: Optional[Iterable[str]] = None) -> Dict[str, Dict[str, str]]:
    tenses = list(tenses) if tenses else list(TENSE_GENERATORS.keys())
    forms = list(forms) if forms else ["affirmative", "negative", "question"]
    matrix: Dict[str, Dict[str, str]] = {}
    for tense in tenses:
        gen = TENSE_GENERATORS[tense]
        base = gen(sentence)
        matrix[tense] = {}
        for form in forms:
            if form == "affirmative":
                matrix[tense][form] = base
            elif form == "negative":
                matrix[tense][form] = to_negative(tense, sentence)
            else:
                matrix[tense][form] = to_question(tense, sentence)
    return matrix


# ======================
# Grading & Progress
# ======================
def grade_sentence(expected: str, user: str) -> Dict[str, Optional[str]]:
    if not user.strip():
        return {"score": 0.0, "llm": False, "feedback": "No answer provided."}
    if not client:
        ratio = difflib.SequenceMatcher(None, expected.lower(), user.lower()).ratio()
        return {"score": ratio, "llm": False, "feedback": "Similarity comparison (no API key)."}
    prompt = f"""You are an encouraging English teacher. Compare the EXPECTED and USER sentences.
Return JSON: {{"score": 0-1 float, "feedback": "short constructive note"}}.
EXPECTED: {expected}
USER: {user}
"""
    try:
        rsp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )
        content = rsp.choices[0].message.content.strip()
        data = json.loads(content)
        return {"score": float(data.get("score", 0)), "llm": True, "feedback": data.get("feedback", "").strip()}
    except Exception as exc:
        ratio = difflib.SequenceMatcher(None, expected.lower(), user.lower()).ratio()
        return {"score": ratio, "llm": False, "feedback": f"LLM error ({exc}); fallback similarity."}


def load_progress() -> List[Dict]:
    try:
        with open(PROGRESS_FILE, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        return []


def save_progress(record: Dict) -> None:
    data = load_progress()
    data.append(record)
    with open(PROGRESS_FILE, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)


def log_matrix_attempt(snapshot: SelectionSnapshot, tense: str, form: str, expected: str, user: str, result: Dict) -> None:
    save_progress(
        {
            "timestamp": datetime.utcnow().isoformat(),
            "topic": snapshot.topic,
            "words": snapshot.words,
            "verb": snapshot.verb,
            "tense": tense,
            "form": form,
            "expected": expected,
            "user": user,
            "score": result.get("score"),
            "feedback": result.get("feedback"),
            "llm": result.get("llm"),
        }
    )


def export_matrix_csv(matrix: Dict[str, Dict[str, str]]) -> str:
    import csv

    with open(EXPORT_FILE, "w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["tense", "form", "sentence"])
        for tense, forms in matrix.items():
            for form, sentence in forms.items():
                writer.writerow([tense, form, sentence])
    return str(EXPORT_FILE)
