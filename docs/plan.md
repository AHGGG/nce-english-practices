# Product Roadmap: NCE Active Grammar Gym

> **Core Philosophy**: "Active Usage over Passive Memorization."
> **Strategy**: A 4-Stage Learning Path (Context -> Drill -> Apply -> Speak).

## 1. Stage 0: Context & Concept (The "Learn" Stage)
*For beginners or starting a new concept.*
- [ ] **Contextual Story Generator**:
    - Generates a short, engaging story that naturally uses the target tense/aspect multiple times.
    - **Why**: Primes the brain with pattern recognition before analyzing rules.
- [ ] **Interactive Explainer**:
    - Click any sentence in the story to see a breakdown: "Why was *had been running* used here?"
    - **Tech**: LLM analysis on demand.

## 2. Stage 1: The Matrix Gym (The "Drill" Stage)
*For building speed and mechanical accuracy.*
- [ ] **Interactive Matrix** (Current Core):
    - Transformation practice: "Change this Present Simple sentence to Future Perfect."
    - **Upgrade**: Add strict input validation and "Give me a hint" button.
- [ ] **comparative Analysis**:
    - Side-by-side view of commonly confused tenses (e.g., Simple Past vs. Present Perfect).

## 3. Stage 2: Active Application (The "Use" Stage)
*For checking understanding in isolation.*
- [ ] **Smart Cloze Mode**:
    - The system hides the *critical* grammar components (auxiliary verbs, participial endings) based on the target tense.
    - *Not just random words*, but structurally relevant deletions.
- [ ] **Sentence Scramble**:
    - Reassemble complex sentences to internalize word order (syntax).

## 4. Stage 3: Real-World Simulation (The "Speak" Stage)
*The ultimate goal: Spontaneous usage.*
- [ ] **Scenario Roleplay**:
    - "You are at a cafe. Order a coffee using *would like*."
    - Open-ended chat interface with an AI persona.
- [ ] **Mission System**:
    - The AI judges if you *achieved the goal* AND *used the grammar correctly*.

## Technical Foundation Updates
- [ ] **Backend**: New endpoints for `/api/story` and `/api/chat`.
- [ ] **Frontend**: New "Mode Switcher" (Learn / Drill / Apply / Speak) in the navigation.
- [ ] **State**: Persist user progress per stage.
