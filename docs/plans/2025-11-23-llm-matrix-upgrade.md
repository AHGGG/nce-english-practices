# Topic Matrix Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enforce LLM connectivity before regenerating vocabulary, expand the tense grid to 4×4 (time × aspect), and add a fourth sentence type (special questions) with robust error handling.

**Architecture:** Detect DeepSeek availability by calling `/models` before any chat request; block the UI if the check fails. Replace the old tense-form logic with explicit generators for each time/aspect combination, then drive sentence forms (affirmative/negative/yes-no question/wh-question) from these structured outputs. Update the TUI to surface model status, special-question options, and grading failures gracefully.

**Tech Stack:** Python 3.11, Textual 0.6+, `openai` client for DeepSeek-compatible API, existing JSON storage.

---

### Task 1: LLM availability gate + theme refresh UX

**Files:**
- Modify: `config.py`
- Modify: `english_tense_practice.py`
- Modify: `tui_app.py`
- Modify: `theme_vocab.py`

**Step 1: Add `/models` probe helper**

In `config.py` expose `def check_model_availability(client) -> tuple[bool,str]`:

```python
def check_model_availability(client) -> tuple[bool, str]:
    if not client:
        return False, "DEEPSEEK_API_KEY missing"
    try:
        data = client.models.list()
        return True, f"{len(data.data)} models"
    except Exception as exc:
        return False, str(exc)
```

**Step 2: UI-level status indicator**

In `tui_app.py` add a banner widget `#status-bar`. When app boots, call the helper (background task) and show `[OK] Model ready` or `[ERROR] …`. Disable topic input, refresh, and practice widgets if status is False; re-enable only after success.

**Step 3: Theme loading logic**

`english_tense_practice.py` should pass the availability flag down to `PracticeApp`. `theme_vocab.ensure_theme` must respect `refresh=True` strictly (ignore cache). When load attempts happen without availability, raise `RuntimeError("Model unavailable")` and let the UI show an alert.

**Step 4: Verification**

Commands:

```bash
source .venv/bin/activate
python - <<'PY'
from config import check_model_availability, OPENAI_API_KEY
from practice_core import client
print(check_model_availability(client))
PY
```

Expected: `(False, "...missing")` on empty env, `(True, "...models")` once configured. Manually run TUI with/without key to ensure blocking message appears.

---

### Task 2: 4×4 tense generator overhaul

**Files:**
- Modify: `models.py`
- Modify: `practice_core.py`

**Step 1: Extend `BaseSentence`**

Add `time_hint` (string) if needed; ensure verbs keep base/past/participle. Create helper enums:

```python
TIME_LAYERS = ["past", "present", "future", "past_future"]
ASPECTS = ["simple", "perfect", "progressive", "perfect_progressive"]
```

**Step 2: Implement generators**

In `practice_core.py`, replace `TENSE_GENERATORS` with nested dict:

```python
def gen_sentence(sentence, time_layer, aspect) -> str:
    if time_layer == "past":
        ...
TENSE_TEMPLATES[(time_layer, aspect)] = gen_sentence(...)
```

Each case explicitly builds auxiliaries:

- Past perfect progressive: `had been + verb_ing`
- Future perfect: `will have + past_participle`
- Past-future simple: `would + base`

Include helper `verb_ing(base)` for orthography (e.g., drop trailing `e`).

**Step 3: Adjust matrix builder**

Loop over `time_layer` × `aspect` to build 16 columns. Return metadata so the UI can label columns (e.g., “Past · Perfect”). Ensure CSV export also includes both dimensions (`writer.writerow([time_layer, aspect, form, sentence])`).

**Step 4: Verification**

CLI demo:

```bash
python english_tense_practice.py --matrix-demo travel
```

Expect 16 columns; spot-check grammar (e.g., “I will have been studying …”).

---

### Task 3: Special question form + tense-aware forms

**Files:**
- Modify: `practice_core.py`
- Modify: `tui_app.py`

**Step 1: Build sentence-form helpers**

Create `produce_affirmative`, `produce_negative`, `produce_yes_no_question`, `produce_wh_question`. They should accept `(time_layer, aspect, sentence, wh_word)` and reuse the auxiliary logic from Task 2 to avoid string hacks.

Example for present progressive wh-question:

```python
return f"{wh_word} {_be_form(subject).lower()} {subject} {verb_ing} {rest}?"
```

Generalize to perfect/perfect-progressive (use `have/has` / `have been`).

**Step 2: `WHWords` selection**

In `tui_app.py`, add a `Select` (e.g., `#wh-select`) with options `when/where/how/why/who`. Store current selection in app state and pass it down when computing matrix. Hide/disable when user is not on the special-question row. Update matrix rendering headers to new sentence-type labels.

**Step 3: Input workflow**

When user selects "Special Question" row, show the current wh-word in the prompt (“Answer for: WHY …”). Ensure `log_matrix_attempt` records `form="special_question"` and the wh-word used (`record["wh_word"]=...`).

**Step 4: Verification**

Manual steps in TUI: switch to a column (e.g., Future Perfect Progressive) and choose “Special Question” row + “when”. Confirm generated sentence looks like “When will I have been studying … ?”.

---

### Task 4: Grading error handling and regression pass

**Files:**
- Modify: `practice_core.py`
- Modify: `tui_app.py`
- README update (optional)

**Step 1: Handle 400/model errors**

Wrap `grade_sentence` in specific exception handling: if the API responds with 400/model not found, set `feedback` to `"Model unavailable (HTTP 400 ...)"` and `llm=False`. In the TUI, catch this flag and show a warning toast plus keep the user’s answer (so they can retry later).

**Step 2: Update progress logging**

Include `wh_word` (for special questions) and `time_layer/aspect` fields in the saved JSON. Example payload:

```json
{"time_layer":"future","aspect":"perfect_progressive","form":"special_question","wh_word":"when", ...}
```

**Step 3: Regression checklist**

Run:

```bash
python english_tense_practice.py --matrix-demo travel
python english_tense_practice.py --export travel
python - <<'PY'
from config import check_model_availability
from practice_core import client
print(check_model_availability(client))
PY
```

Additionally, launch TUI twice: once without API key (expect blocking banner), once with a fake key (ensure `/models` failure surfaces). Manually test scoring to verify 400 errors surface instead of raw tracebacks.

---

Plan complete and saved to `docs/plans/2025-11-23-llm-matrix-upgrade.md`. Two execution options:

1. **Subagent-Driven (this session)** – dispatch a subagent per task with checkpoints.
2. **Parallel Session** – open a separate session using superpowers:executing-plans.

Which approach would you like?
