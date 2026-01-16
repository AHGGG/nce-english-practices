# Master Design: Antigravity Proficiency System
**Date**: 2025-12-31
**Topic**: proficiency-system-architecture
**Status**: Approved

## 1. Executive Summary
A unified system to manage User Vocabulary Proficiency and Reading Comprehension. It solves the "Cold Start" problem via an intelligent **Placement Lab**, reduces noise via **Smart Highlighting**, and diagnoses "Understanding" gaps (Syntax vs Vocab) using **LLM Analysis**.

This document consolidates the designs for **Smart Highlighting**, **Intelligent Sweep**, and the **Proficiency Lab**.

## 2. Core Philosophy
*   **Behavior > Settings**: Infer level from what users *do* (sweeping, clicking), not just what they set.
*   **Sentence >= Word**: Understanding is sentence-level. Proficiency Check must act on sentences.
*   **Silence is Signal**: Ignoring a word is a strong signal of mastery (or apathy). We verify this via "Sweep".

---

## 3. System Modules

### Module 1: Smart Highlighting (The Foundation)
**Goal**: Filter out known words from the article view to reduce visual noise.

*   **Logic**:
    *   `Highlights = ArticleWords - UserMasteredWords`.
    *   Backend (`identify_words_in_text`) now accepts `user_id` and joins with `WordProficiency` table.
    *   If `WordProficiency.status == 'mastered'`, the word is NOT returned as a highlight.
*   **User Interaction**:
    *   **Mark as Known**: User clicks a highlighted word -> Inspector opens -> Click "Mark as Known".
    *   **Effect**: 
        1. API call `PUT /api/proficiency/word` (status='mastered').
        2. Local state updates immediately (highlight disappears).

### Module 2: Intelligent Sweep (The Workflow)
**Goal**: Batch-process the "Long Tail" of known words without clinical individual clicking.

*   **The Inverted Workflow**:
    1.  User reads article, only clicking words they *don't* know (to check definition).
    2.  At the end (or anytime), user clicks **"Sweep"** (Broom Icon).
    3.  **Logic**: `Mastered = ArticleHighlights - InspectedWords`.
*   **Intelligent Inference (Band Analysis)**:
    *   When a Sweep occurs, the backend analyzes the frequency rank of swept words.
    *   **Algorithm**:
        *   Bucket words into 1000-rank bands (e.g., 0-1k, 1k-2k).
        *   Calculate "Miss Rate" (Inspected / Total) for each band.
        *   If `Miss Rate < 2%` and `Sample Size > 20`: **Infer Band Mastery**.
    *   **Feedback**: System prompts user: "Expert Detected! You ignored 98% of words in the Top 3000. Mark ALL Top 3000 words as Mastered globally?"

### Module 3: The Proficiency Lab (Onboarding & Calibration)
**Goal**: A dedicated "Mission" to calibrate a user's level in < 5 minutes, differentiating between Vocabulary voids and Syntax voids.

*   **The Workflow**:
    1.  **Entry**: "Take Calibration Mission".
    2.  **Content**: A "Benchmark Article" (e.g., *The Economist* snippet or LLM-gen stratified text).
    3.  **Interaction**: User marks each sentence as **Clear (Green)** or **Confused (Red)**.
*   **Inference Logic**:
    *   🟢 **Clear**:
        *   System implicitly masters *all* content words in the sentence.
        *   Updates `WordProficiency` for potentially 50-100 words instantly.
    *   🔴 **Confused**:
        *   System asks: "Tap any unknown words".
        *   **Case A (Vocab Gap)**: User clicks words. -> Standard Vocab Learning.
        *   **Case B (Syntax Gap)**: User clicks *nothing*. -> System flags sentence for **LLM Diagnosis**.
*   **LLM Diagnosis**:
    *   **Prompt**: "User understood all words but failed to grasp this sentence: '{text}'. Diagnose the likely syntactic hurdle (e.g., Inversion, Subjunctive)."
    *   **Result**: "Your Vocabulary is B2, but you struggle with *Reduced Relative Clauses*."

---

## 4. Technical Architecture

### 4.1 Backend Components
*   **`WordListService`**:
    *   Updated `identify_words_in_text` to support `user_id` filtering.
*   **`ProficiencyService`**:
    *   `master_word(user, word, source)`.
    *   `process_sweep(swept_words, inspected_words)` -> Returns `CalibrationRecommendation`.
    *   `analyze_bands(stats)` -> Logic for band inference.
*   **`LLMService`**:
    *   New method `diagnose_syntax_gap(sentence_text)`.

### 4.2 Frontend Components
*   **`ReadingMode.jsx`**:
    *   State: `inspectedWords` (Set).
    *   Actions: `handleMarkAsKnown`, `handleSweep`.
    *   UI: Toolbar "Sweep" button, Inspector "Mark Known" button.
*   **`LabCalibration.jsx`** (New Route):
    *   State: `sentenceStatuses` (Map: index -> 'clear'|'confused').
    *   UI: Sentence-by-sentence view with hover actions.

### 4.3 API Endpoints
*   `PUT /api/proficiency/word`: Mark single word.
*   `POST /api/proficiency/sweep`: Batch mark words + Get Recommendation.
*   `POST /api/proficiency/calibrate`: Submit Lab results.

---

## 5. Implementation Roadmap

1.  **Phase 1: Primitives (Data & API)**
    *   Ensure `WordProficiency` table exists and is indexed.
    *   Implement `word_list_service` filtering.
    *   Create basic API endpoints.

2.  **Phase 2: The Reading Flow (UI)**
    *   Update `WordInspector` (Mark as Known).
    *   Update `ReadingMode` (Sweep Button & Logic).
    *   Implement Band Analysis logic in backend.

3.  **Phase 3: The Proficiency Lab**
    *   Build the `LabCalibration` UI.
    *   Integrate LLM Diagnosis.
    *   Create the "Benchmark Article" content.
