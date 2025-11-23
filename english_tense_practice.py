#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fully Integrated English Tense Practice System
-------------------------------------------------
Features:
1. Structured sentence database (JSON)
2. Automatic tense & sentence-type generation
3. Interactive CLI practice
4. LLM-based grading (OpenAI-compatible, loads key from .env)
5. Progress tracking
6. Export to CSV

Required: pip install python-dotenv openai
"""

import os
import json
import difflib
import random
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import Dict, List
from dotenv import load_dotenv
from openai import OpenAI
import csv

# ================================
# CONFIG
# ================================
HOME_DIR = os.path.expanduser("~/.english_tense_practice")
SENTENCE_FILE = os.path.join(HOME_DIR, "sentences.json")
PROGRESS_FILE = os.path.join(HOME_DIR, "progress.json")
EXPORT_FILE = os.path.join(HOME_DIR, "exported_practice.csv")

# Load .env
load_dotenv()
OPENAI_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
OPENAI_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
client = OpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL) if OPENAI_API_KEY else None

# Ensure directory exists
os.makedirs(HOME_DIR, exist_ok=True)


# ================================
# DATA STRUCTURES
# ================================
@dataclass
class BaseSentence:
    subject: str
    verb: str
    verb_past: str
    verb_pp: str
    object: str
    time: str
    place: str
    manner: str


# ================================
# File Helpers
# ================================
def load_json(path, default):
    if not os.path.exists(path):
        return default
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# ================================
# Sentence DB
# ================================
class SentenceDB:
    def __init__(self):
        raw = load_json(SENTENCE_FILE, [])
        self.sentences: List[BaseSentence] = [BaseSentence(**x) for x in raw]

    def save(self):
        save_json(SENTENCE_FILE, [asdict(s) for s in self.sentences])

    def add(self, s: BaseSentence):
        self.sentences.append(s)
        self.save()

    def random(self) -> BaseSentence:
        return random.choice(self.sentences) if self.sentences else None


# ================================
# Tense + Sentence Transformations
# ================================
def gen_simple_present(s: BaseSentence):
    v = s.verb + "s" if s.subject.lower() not in ["i", "you", "we", "they"] else s.verb
    return f"{s.subject} {v} {s.object} {s.manner} {s.place} {s.time}".strip()


def gen_present_cont(s: BaseSentence):
    be = (
        "is"
        if s.subject.lower() not in ["i", "you", "we", "they"]
        else ("am" if s.subject.lower() == "i" else "are")
    )
    return (
        f"{s.subject} {be} {s.verb}ing {s.object} {s.manner} {s.place} {s.time}".strip()
    )


def gen_simple_past(s: BaseSentence):
    return f"{s.subject} {s.verb_past} {s.object} {s.manner} {s.place} {s.time}".strip()


def gen_future(s: BaseSentence):
    return f"{s.subject} will {s.verb} {s.object} {s.manner} {s.place} {s.time}".strip()


TENSE_GENERATORS = {
    "simple_present": gen_simple_present,
    "present_continuous": gen_present_cont,
    "simple_past": gen_simple_past,
    "future": gen_future,
}

# Sentence-type transformations


def to_negative(sentence: str):
    # naive but works if tense generation is structured
    if "will" in sentence:
        return sentence.replace("will", "will not", 1)
    if " is " in sentence:
        return sentence.replace(" is ", " is not ", 1)
    if " are " in sentence:
        return sentence.replace(" are ", " are not ", 1)
    if " am " in sentence:
        return sentence.replace(" am ", " am not ", 1)
    # simple present/past
    words = sentence.split()
    sub = words[0]
    # detect past (very rough)
    if words[1].endswith("ed") or words[1] in ["did"]:
        return f"{sub} did not {words[2]} {' '.join(words[3:])}".strip()
    else:
        return f"{sub} does not {words[1]} {' '.join(words[2:])}".strip()


def to_question(sentence: str):
    words = sentence.split()
    sub = words[0]
    if "will" in words:
        return f"Will {sub} {' '.join(words[words.index('will')+1:])}?"

    if " is " in sentence or " are " in sentence or " am " in sentence:
        be = words[1]
        rest = " ".join(words[2:])
        return f"{be.capitalize()} {sub} {rest}?"

    # simple present
    return f"Does {sub} {' '.join(words[1:])}?"


# ================================
# LLM GRADER
# ================================
def llm_grade(expected: str, user: str) -> Dict:
    if not OPENAI_API_KEY:
        # fallback to similarity scoring
        ratio = difflib.SequenceMatcher(None, expected.lower(), user.lower()).ratio()
        return {
            "score": ratio,
            "llm": False,
            "feedback": "(No API key) Similarity used.",
        }

    prompt = f"You are an English teacher. Compare the expected answer and the user answer. Give a score between 0 and 1 and short feedback.\nExpected: {expected}\nUser: {user}"

    try:
        rsp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )
        txt = rsp.choices[0].message.content.strip()
        # Expected simple JSON-like output, fallback parse
        # Try to extract score
        score = 0
        for line in txt.splitlines():
            if "score" in line.lower():
                num = "".join([c for c in line if c.isdigit() or c == "."])
                try:
                    score = float(num)
                except:
                    score = 0
        return {"score": score, "llm": True, "feedback": txt}
    except Exception as e:
        ratio = difflib.SequenceMatcher(None, expected.lower(), user.lower()).ratio()
        return {"score": ratio, "llm": False, "feedback": f"LLM error: {e}"}


# ================================
# PROGRESS TRACKER
# ================================
def load_progress():
    return load_json(PROGRESS_FILE, [])


def save_progress(rec):
    data = load_progress()
    data.append(rec)
    save_json(PROGRESS_FILE, data)


# ================================
# EXPORT CSV
# ================================
def export_matrix(sentence: BaseSentence):
    rows = []
    for tname, gen in TENSE_GENERATORS.items():
        base = gen(sentence)
        rows.append([tname, "affirmative", base])
        rows.append([tname, "negative", to_negative(base)])
        rows.append([tname, "question", to_question(base)])

    with open(EXPORT_FILE, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["tense", "type", "sentence"])
        w.writerows(rows)


# ================================
# CLI INTERFACE
# ================================
def practice_single(sentence: BaseSentence):
    print("\n=== PRACTICE: Full Matrix ===")

    for tname, gen in TENSE_GENERATORS.items():
        base = gen(sentence)
        items = {
            "affirmative": base,
            "negative": to_negative(base),
            "question": to_question(base),
        }

        for stype, expected in items.items():
            print(f"\nTense: {tname}  | Type: {stype}")
            user = input("Your answer: ")
            res = llm_grade(expected, user)
            print(f"Score: {res['score']:.2f}")
            print(f"Feedback: {res['feedback']}")

            save_progress(
                {
                    "timestamp": datetime.now().isoformat(),
                    "tense": tname,
                    "stype": stype,
                    "expected": expected,
                    "user": user,
                    "score": res["score"],
                    "feedback": res["feedback"],
                }
            )


# ================================
# ADD NEW SENTENCE
# ================================
def add_sentence_ui(db: SentenceDB):
    print("Enter sentence components:")
    s = BaseSentence(
        subject=input("subject: "),
        verb=input("verb(base form): "),
        verb_past=input("verb past: "),
        verb_pp=input("verb past participle: "),
        object=input("object: "),
        time=input("time: "),
        place=input("place: "),
        manner=input("manner: "),
    )
    db.add(s)
    print("Added.")


# ================================
# MAIN MENU
# ================================
def main():
    db = SentenceDB()

    while True:
        print(
            """
==============================
 English Tense Practice System
==============================
1. Practice (full matrix) with random sentence
2. Add new sentence
3. Export matrix for a random sentence
4. View progress count
0. Exit
"""
        )
        choice = input("Choose: ")

        if choice == "1":
            s = db.random()
            if not s:
                print("No sentences in DB.")
            else:
                practice_single(s)

        elif choice == "2":
            add_sentence_ui(db)

        elif choice == "3":
            s = db.random()
            if not s:
                print("No sentences in DB.")
            else:
                export_matrix(s)
                print(f"Exported to {EXPORT_FILE}")

        elif choice == "4":
            pr = load_progress()
            print(f"Total records: {len(pr)}")

        elif choice == "0":
            return
        else:
            print("Invalid option.")


if __name__ == "__main__":
    main()
