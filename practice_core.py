from __future__ import annotations

import difflib
import json
from datetime import datetime
from typing import Dict, Iterable, List, Optional

from config import EXPORT_FILE, MODEL_NAME, OPENAI_API_KEY, OPENAI_BASE_URL, PROGRESS_FILE
from models import BaseSentence, SelectionSnapshot
from openai import OpenAI

client = OpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL) if OPENAI_API_KEY else None


TIME_LAYERS = ["past", "present", "future", "past_future"]
ASPECTS = ["simple", "perfect", "progressive", "perfect_progressive"]
TIME_LABELS = {
    "past": "Past",
    "present": "Present",
    "future": "Future",
    "past_future": "Past Future",
}
ASPECT_LABELS = {
    "simple": "Simple",
    "perfect": "Perfect",
    "progressive": "Progressive",
    "perfect_progressive": "Perfect Progressive",
}
TENSE_COLUMNS = [
    {
        "key": f"{time}_{aspect}",
        "time_layer": time,
        "aspect": aspect,
        "label": f"{TIME_LABELS[time]} · {ASPECT_LABELS[aspect]}",
    }
    for time in TIME_LAYERS
    for aspect in ASPECTS
]
TENSE_COLUMN_MAP = {col["key"]: col for col in TENSE_COLUMNS}
DEFAULT_FORMS = ["affirmative", "negative", "question"]
_VOWELS = set("aeiou")


def _rest_clause(sentence: BaseSentence) -> str:
    return " ".join(filter(None, [sentence.object, sentence.manner, sentence.place, sentence.time]))


def _subject_key(subject: str) -> str:
    return subject.strip().lower()


def _has_plural_nature(subject: str) -> bool:
    subj = _subject_key(subject)
    if subj in {"we", "they"}:
        return True
    if " and " in subj:
        return True
    if subj.endswith("s") and subj not in {"is"}:
        return True
    return False


def _takes_s_form(subject: str) -> bool:
    subj = _subject_key(subject)
    if subj in {"i", "you", "we", "they"}:
        return False
    if " and " in subj:
        return False
    if subj.endswith("s") and subj not in {"is"}:
        return False
    return True


def _verb_s_form(base: str, subject: str) -> str:
    if not _takes_s_form(subject):
        return base
    if len(base) > 2 and base.endswith("y") and base[-2].lower() not in _VOWELS:
        return base[:-1] + "ies"
    if base.endswith(("s", "sh", "ch", "x", "z", "o")):
        return base + "es"
    return base + "s"


def _verb_ing_form(base: str) -> str:
    lower = base.lower()
    if lower.endswith("ie"):
        return base[:-2] + "ying"
    if lower.endswith("ee") or lower.endswith("oe"):
        return base + "ing"
    if lower.endswith("e") and not lower.endswith("ee"):
        return base[:-1] + "ing"
    if lower.endswith("c"):
        return base + "king"
    return base + "ing"


def _be_form_present(subject: str) -> str:
    subj = _subject_key(subject)
    if subj == "i":
        return "am"
    if subj in {"you", "we", "they"} or " and " in subj:
        return "are"
    return "is"


def _be_form_past(subject: str) -> str:
    subj = _subject_key(subject)
    if subj in {"we", "they"} or " and " in subj or subj == "you":
        return "were"
    return "was"


def _have_form_present(subject: str) -> str:
    subj = _subject_key(subject)
    if subj in {"he", "she", "it"}:
        return "has"
    if subj == "i":
        return "have"
    if _has_plural_nature(subject) or subj in {"we", "they", "you"}:
        return "have"
    return "has"


def _do_helper(subject: str, past: bool = False, capitalize: bool = False) -> str:
    if past:
        helper = "did"
    else:
        helper = "does" if _takes_s_form(subject) else "do"
    if capitalize:
        return helper.capitalize()
    return helper


def _verb_components(sentence: BaseSentence, time_layer: str, aspect: str) -> Dict:
    base = sentence.verb_base
    components = {
        "subject": sentence.subject,
        "aux": [],
        "main": "",
        "base": base,
        "past": sentence.verb_past,
        "participle": sentence.verb_participle,
        "ing": _verb_ing_form(base),
        "time_layer": time_layer,
        "aspect": aspect,
    }
    subj = sentence.subject
    if time_layer == "present":
        if aspect == "simple":
            components["main"] = _verb_s_form(base, subj)
        elif aspect == "perfect":
            components["aux"] = [_have_form_present(subj)]
            components["main"] = sentence.verb_participle
        elif aspect == "progressive":
            components["aux"] = [_be_form_present(subj)]
            components["main"] = components["ing"]
        elif aspect == "perfect_progressive":
            components["aux"] = [_have_form_present(subj), "been"]
            components["main"] = components["ing"]
    elif time_layer == "past":
        if aspect == "simple":
            components["main"] = sentence.verb_past
        elif aspect == "perfect":
            components["aux"] = ["had"]
            components["main"] = sentence.verb_participle
        elif aspect == "progressive":
            components["aux"] = [_be_form_past(subj)]
            components["main"] = components["ing"]
        elif aspect == "perfect_progressive":
            components["aux"] = ["had", "been"]
            components["main"] = components["ing"]
    elif time_layer == "future":
        if aspect == "simple":
            components["aux"] = ["will"]
            components["main"] = base
        elif aspect == "perfect":
            components["aux"] = ["will", "have"]
            components["main"] = sentence.verb_participle
        elif aspect == "progressive":
            components["aux"] = ["will", "be"]
            components["main"] = components["ing"]
        elif aspect == "perfect_progressive":
            components["aux"] = ["will", "have", "been"]
            components["main"] = components["ing"]
    elif time_layer == "past_future":
        prefix = ["would"]
        if aspect == "simple":
            components["aux"] = prefix
            components["main"] = base
        elif aspect == "perfect":
            components["aux"] = prefix + ["have"]
            components["main"] = sentence.verb_participle
        elif aspect == "progressive":
            components["aux"] = prefix + ["be"]
            components["main"] = components["ing"]
        elif aspect == "perfect_progressive":
            components["aux"] = prefix + ["have", "been"]
            components["main"] = components["ing"]
    return components


def _compose_affirmative(components: Dict, rest: str) -> str:
    tokens = [components["subject"]] + components["aux"]
    if components["main"]:
        tokens.append(components["main"])
    if rest:
        tokens.append(rest)
    return " ".join(tokens).strip()


def _compose_negative(components: Dict, rest: str) -> str:
    if components["aux"]:
        aux = components["aux"].copy()
        aux.insert(1, "not")
        tokens = [components["subject"]] + aux + [components["main"]]
    else:
        helper = _do_helper(components["subject"], past=components["time_layer"] == "past")
        tokens = [components["subject"], helper, "not", components["base"]]
    if rest:
        tokens.append(rest)
    return " ".join(tokens).strip()


def _compose_yes_no_question(components: Dict, rest: str) -> str:
    if components["aux"]:
        aux = components["aux"]
        first = aux[0].capitalize()
        remainder = aux[1:]
        tokens = [first, components["subject"]] + remainder + [components["main"]]
    else:
        helper = _do_helper(components["subject"], past=components["time_layer"] == "past", capitalize=True)
        tokens = [helper, components["subject"], components["base"]]
    if rest:
        tokens.append(rest)
    return (" ".join(tokens).strip()) + "?"


def _compose_wh_question(components: Dict, rest: str, wh_word: str = "when") -> str:
    wh = wh_word.capitalize()
    if components["aux"]:
        aux = components["aux"]
        first = aux[0]
        remainder = aux[1:]
        tokens = [wh, first, components["subject"]] + remainder + [components["main"]]
    else:
        helper = _do_helper(components["subject"], past=components["time_layer"] == "past", capitalize=False)
        tokens = [wh, helper, components["subject"], components["base"]]
    if rest:
        tokens.append(rest)
    return (" ".join(tokens).strip()) + "?"


def build_matrix(sentence: BaseSentence, forms: Optional[Iterable[str]] = None, wh_word: str = "when") -> Dict[str, Dict[str, str]]:
    forms = list(forms) if forms else list(DEFAULT_FORMS)
    matrix: Dict[str, Dict[str, str]] = {}
    rest = _rest_clause(sentence)
    for column in TENSE_COLUMNS:
        key = column["key"]
        comps = _verb_components(sentence, column["time_layer"], column["aspect"])
        matrix[key] = {}
        for form in forms:
            if form == "affirmative":
                matrix[key][form] = _compose_affirmative(comps, rest)
            elif form == "negative":
                matrix[key][form] = _compose_negative(comps, rest)
            elif form == "question":
                matrix[key][form] = _compose_yes_no_question(comps, rest)
            elif form == "special_question":
                matrix[key][form] = _compose_wh_question(comps, rest, wh_word)
            else:
                matrix[key][form] = ""
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
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )
        content = rsp.choices[0].message.content.strip()
        data = json.loads(content)
        return {"score": float(data.get("score", 0)), "llm": True, "feedback": data.get("feedback", "").strip()}
    except json.JSONDecodeError as exc:
        ratio = difflib.SequenceMatcher(None, expected.lower(), user.lower()).ratio()
        return {"score": ratio, "llm": False, "feedback": f"LLM response parsing error; fallback similarity."}
    except Exception as exc:
        exc_str = str(exc)
        if "400" in exc_str or "model" in exc_str.lower():
            ratio = difflib.SequenceMatcher(None, expected.lower(), user.lower()).ratio()
            return {"score": ratio, "llm": False, "feedback": f"Model unavailable (HTTP 400 or model error); fallback similarity."}
        ratio = difflib.SequenceMatcher(None, expected.lower(), user.lower()).ratio()
        return {"score": ratio, "llm": False, "feedback": f"LLM error; fallback similarity."}


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


def log_matrix_attempt(snapshot: SelectionSnapshot, tense: str, form: str, expected: str, user: str, result: Dict, wh_word: Optional[str] = None) -> None:
    tense_col = TENSE_COLUMN_MAP.get(tense, {})
    record = {
        "timestamp": datetime.utcnow().isoformat(),
        "topic": snapshot.topic,
        "words": snapshot.words,
        "verb": snapshot.verb,
        "tense": tense,
        "time_layer": tense_col.get("time_layer", ""),
        "aspect": tense_col.get("aspect", ""),
        "form": form,
        "expected": expected,
        "user": user,
        "score": result.get("score"),
        "feedback": result.get("feedback"),
        "llm": result.get("llm"),
    }
    if wh_word and form == "special_question":
        record["wh_word"] = wh_word
    save_progress(record)


def export_matrix_csv(matrix: Dict[str, Dict[str, str]]) -> str:
    import csv

    with open(EXPORT_FILE, "w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["time_layer", "aspect", "form", "sentence"])
        for column in TENSE_COLUMNS:
            entry = matrix.get(column["key"], {})
            for form, sentence in entry.items():
                writer.writerow([column["time_layer"], column["aspect"], form, sentence])
    return str(EXPORT_FILE)
