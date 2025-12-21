# AUI Scaffolding Matrix ("i+1" Strategy)

This document defines how the UI adapts to the user's mastery level. The goal is to provide **Scaffolding** for beginners and remove it for advanced users ("fading").

## 1. Intent: `show_vocabulary`
**Goal**: Teach new words or review existing ones.

| Level | Component | Description | Scaffolding |
| :--- | :--- | :--- | :--- |
| **Level 1 (Beginner)** | `FlashCardStack` | Classic flip-card stack. | **High**: Translation is immediately available on flip. User focuses on recognition. |
| **Level 2 (Intermediate)** | `VocabGrid` | Visual grid of words. | **Medium**: Translation hidden behind hover/click. "Challenge Mode" encourages active recall before verifying. |
| **Level 3 (Advanced)** | `VocabGrid` | Visual grid (Monolingual). | **Low**: Definitions are in English (no L1 translation). Focus on nuance and synonyms. |

---

## 2. Intent: `present_story`
**Goal**: Provide context for learning grammar/vocab.

| Level | Component | Description | Scaffolding |
| :--- | :--- | :--- | :--- |
| **Level 1 (Beginner)** | `StoryReader` | Rich text reader. | **High**: <br>1. **Highlights**: Keywords highlighted.<br>2. **Notes**: Full grammar breakdown at bottom.<br>3. **Click-to-Define**: Functional. |
| **Level 2 (Intermediate)** | `StoryReader` | Rich text reader. | **Medium**: <br>1. **Highlights**: Only for critical unknown idioms.<br>2. **Notes**: Hidden/Removed. User must deduce grammar from context.<br>3. **Click-to-Define**: Functional. |
| **Level 3 (Advanced)** | `StoryReader` | Plain text reader. | **Low**: <br>1. **Highlights**: None (unless requested).<br>2. **Notes**: None.<br>3. **Click-to-Define**: English definitions only. |

---

## 3. Intent: `explain_correction`
**Goal**: Correct a user's mistake.

| Level | Component | Description | Scaffolding |
| :--- | :--- | :--- | :--- |
| **Level 1 (Beginner)** | `DiffCard` | Visual Diff (Red/Green). | **Direct**: "You said X, say Y instead." Visual difference makes the error obvious immediately. |
| **Level 2 (Intermediate)** | `MarkdownMessage` | Detailed Analysis. | **Analytical**: Shows the correction AND explains the grammar rule why. Connects theory to practice. |
| **Level 3 (Advanced)** | `MarkdownMessage` | Socratic Hint. | **Indirect**: "You made a tense error in the second clause." Forces user to self-correct. |

---

## 4. Intent: `explain_grammar`
**Goal**: Teach a specific grammar rule (e.g., Past Perfect).

| Level | Component | Description | Scaffolding |
| :--- | :--- | :--- | :--- |
| **Level 1 (Beginner)** | `RuleCard` (Markdown) | Static Formula. | **Formulaic**: "Subject + had + V3". Focus on mechanics. |
| **Levels 2-3** | `TenseTimeline` | Interactive Timeline. | **Conceptual**: Visualizes *when* the action happened relative to other actions. Focus on aspect and time relationships. |
