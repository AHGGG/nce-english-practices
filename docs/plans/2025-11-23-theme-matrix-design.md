# Theme-Based Matrix Practice Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the ad-hoc sentence entry flow with a topic-driven vocabulary selector plus a horizontal (tense) × vertical (sentence-type) drill matrix.

**Architecture:** Keep persistence/LLM logic in `english_tense_practice.py` but extract new helpers for theme vocabulary and sentence matrix computation. Introduce a lightweight Textual-based TUI to show slot columns, matrix preview, and scoring. Reuse existing grading/progress modules.

**Tech Stack:** Python 3.11, `textual` for TUI, `openai` (DeepSeek) for vocabulary generation, existing dotenv/json storage.

---

### Task 1: Theme vocabulary store + LLM generation

**Files:**
- Modify: `pyproject.toml` (add `textual` dependency)
- Modify: `english_tense_practice.py:1-200`
- Create: `theme_vocab.py`
- Modify: `uv.lock` (regenerate via `uv pip install textual`)

**Step 1: Write vocabulary data structures**

Create `theme_vocab.py`:

```python
from dataclasses import dataclass, field
from typing import Dict, List

DEFAULT_SLOTS = {
    "subject": ["I", "You"],
    "verb": ["travel", "study"],
    "object": ["English", "books"],
    "manner": ["carefully"],
    "place": ["at home"],
    "time": ["every day"],
}

@dataclass
class ThemeVocabulary:
    topic: str
    generated_at: str
    slots: Dict[str, List[str]] = field(default_factory=lambda: DEFAULT_SLOTS.copy())

    def ensure_defaults(self):
        for key, words in DEFAULT_SLOTS.items():
            self.slots.setdefault(key, words)
            if not self.slots[key]:
                self.slots[key] = words
```

**Step 2: Add load/save helpers + cache directory**

In `theme_vocab.py` add functions:

```python
THEME_DIR = os.path.join(HOME_DIR, "themes")
os.makedirs(THEME_DIR, exist_ok=True)

def load_theme(topic: str) -> ThemeVocabulary: ...
def save_theme(data: ThemeVocabulary) -> None: ...
```

Use slugified filenames (`travel-to-japan.json`). Provide JSON serialization.

**Step 3: Implement LLM-backed generation**

Add `generate_theme(topic: str)`:

```python
PROMPT = f"""You are an English tutor..."""
```

When API key absent or request fails, return `ThemeVocabulary(topic=topic, generated_at=now, slots=DEFAULT_SLOTS)`.

**Step 4: Wire helper into CLI**

Add CLI command `themes`:

```python
def ensure_theme(topic, refresh=False):
    data = load_theme(topic)
    if data and not refresh: return data
    new = generate_theme(topic)
    save_theme(new)
    return new
```

Verify with `python english_tense_practice.py --demo-theme travel`. Expect JSON preview of loaded slots.

**Step 5: Update dependencies**

`uv pip install textual` and capture lock update. `pyproject.toml` gains `[project.optional-dependencies.tui]` if desired.

Run `python english_tense_practice.py --demo-theme travel` to ensure no ImportError, expect “Theme travel has slots…” message.

---

### Task 2: Slot selection state + matrix builder

**Files:**
- Modify: `english_tense_practice.py:200-420`

**Step 1: Create `SelectionState` dataclass**

```python
@dataclass
class SelectionState:
    topic: str
    choices: Dict[str, List[str]]
    selected: Dict[str, int]

    def current_sentence(self) -> BaseSentence:
        return BaseSentence(
            subject=self.current_word("subject"),
            verb=self.current_word("verb"),
            verb_past=self.verb_forms()[0],
            verb_pp=self.verb_forms()[1],
            object=self.current_word("object"),
            manner=self.current_word("manner"),
            place=self.current_word("place"),
            time=self.current_word("time"),
        )
```

Include helper `cycle(slot, direction)` to move selection. Provide `verb_forms` using stored metadata (LLM should supply base/past/pp; fallback to naive `-ed`). Update `BaseSentence` creation to respect new fields.

**Step 2: Build horizontal×vertical matrix generator**

Add function `build_matrix(sentence: BaseSentence)` returning nested dict:

```python
def build_matrix(s, tenses=TENSE_GENERATORS, forms=("affirmative","negative","question")):
    matrix = {}
    for tense, gen in tenses.items():
        base = gen(s)
        matrix[tense] = {
            "affirmative": base,
            "negative": to_negative(base),
            "question": to_question(base),
        }
    return matrix
```

Expose CLI command `python english_tense_practice.py --matrix-demo travel` to print table for verification. Expected output: 4 columns, 3 rows of sentences.

---

### Task 3: Textual TUI for slot picking + matrix preview

**Files:**
- Modify: `english_tense_practice.py` (new `run_tui` entry)
- Possibly add `tui_app.py`

**Step 1: Create Textual app skeleton**

`tui_app.py`:

```python
from textual.app import App, ComposeResult
from textual.widgets import Static, Footer

class PracticeApp(App):
    CSS_PATH = "tui.css"

    def __init__(self, selection_state, **kwargs):
        super().__init__(**kwargs)
        self.state = selection_state
```

Implement `compose` to yield slot columns (custom widget listing choices with highlight), matrix grid (3×N), and prompt widget for user answer. Bind keys: arrows for slot/matrix navigation, `t` to cycle tense, `f` to cycle form, `enter` to answer.

**Step 2: Slot column widget**

Implement `SlotColumn(Static)` showing current options with pointer. Provide `on_key` to cycle selection and notify main app via message. When selection changes, send message to update matrix preview.

**Step 3: Matrix grid widget**

Create `MatrixGrid` storing cells, each cell shows sentence string + last score (colored). Provide method `update_matrix(matrix, scores)` to refresh text. When user selects a cell and presses `enter`, trigger answer modal.

**Step 4: Input dialog + scoring hook**

Implement `AnswerDialog` that prompts for user sentence. After submission call new `grade_cell(tense, form, answer)` helper (reuse `llm_grade`). Update `scores` dict and `SelectionState` progress logging.

**Step 5: Entry integration**

Expose CLI entry `python english_tense_practice.py --topic travel` to call `ensure_theme`, create `SelectionState`, then `PracticeApp(state).run()`. Document fallback CLI path when `textual` unavailable.

Manual verification: run command, ensure slot navigation updates preview and scoring colors change.

---

### Task 4: Updated progress & export workflow

**Files:**
- Modify: `english_tense_practice.py:420-640`

**Step 1: Extend progress records**

`save_progress` should now include `topic`, `selected_words`, `tense`, `form`, and `source_matrix_sentence`.

```python
save_progress({
    "topic": state.topic,
    "words": state.snapshot(),
    ...
})
```

**Step 2: Export matrix per selection**

Update `export_matrix` to accept `SelectionState` and include topic metadata in CSV header. Hook this into the TUI via a shortcut (e.g., `x`) instead of CLI parameters.

**Step 3: Manual regression pass**

Commands to run:

```bash
python english_tense_practice.py                  # launches TUI, prompts for topic
python english_tense_practice.py --matrix-demo travel
python english_tense_practice.py --export theme travel
```

Expect: default run enters TUI with topic prompt; matrix demo prints sentences; export writes CSV.

---

Plan complete and saved to `docs/plans/2025-11-23-theme-matrix-design.md`. Two execution options:

1. **Subagent-Driven (this session)** – we dispatch fresh subagent per task with reviews between them.
2. **Parallel Session** – open a new session, apply `superpowers:executing-plans`, and run tasks sequentially there.

Which approach would you like?
