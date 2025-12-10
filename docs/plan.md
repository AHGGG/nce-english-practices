# Product Roadmap: NCE Active Grammar Gym

> **Core Philosophy**: "Active Usage over Passive Memorization."
> **Strategy**: A 4-Stage Learning Path (Context -> Drill -> Apply -> Speak).

## 1. Stage 0: Context & Concept (The "Learn" Stage)
*For beginners or starting a new concept.*
- [x] **Contextual Story Generator**:
    - [x] **Streaming Support**: Real-time story generation for better UX.
    - Generates a short, engaging story that naturally uses the target tense/aspect multiple times.
    - **Why**: Primes the brain with pattern recognition before analyzing rules.
- [ ] **Interactive Explainer**:
    - Click any sentence in the story to see a breakdown: "Why was *had been running* used here?"
    - **Tech**: LLM analysis on demand.

## 2. Stage 1: The Matrix Gym (The "Drill" Stage)
*For building speed and mechanical accuracy.*
- [x] **Interactive Matrix** (Current Core):
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
- [x] **Scenario Roleplay**:
    - "You are at a cafe. Order a coffee using *would like*."
    - Open-ended chat interface with an AI persona.
- [ ] **Mission System**:
    - The AI judges if you *achieved the goal* AND *used the grammar correctly*.
- [x] **Grammar Coach** (New):
    - **Contextual Refinement**: "Polish my sentence" button on user messages.
    - AI suggests more native/idiomatic expressions based on the conversation context.

## 5. Stage 4: Review & Retention (The "Keep" Stage)
*For long-term mastery.*
- [x] **Review Notes System**:
    - Extract key vocabulary/grammar points from chat sessions.
    - User accepts/rejects notes.
- [x] **Spaced Repetition (SRS)**:
    - Schedule reviews for accepted notes (Anki-style algorithms).

## Technical Foundation Updates
- [x] **Backend**: New endpoints for `/api/story` and `/api/chat`.
- [x] **Frontend**: New "Mode Switcher" (Learn / Drill / Apply / Speak) in the navigation.
- [x] **State**: Persist user progress per stage (Now in PostgreSQL).
- [x] **Async Architecture**: Refactor synchronous LLM calls to prevent blocking (Complete).
- [x] **Dictionary Fixes**: Support `@@@LINK` redirects and relative asset pathing.
- [x] **Testing Infrastructure**: `pytest` suite with `nce_practice_test` DB for safe backend testing.
- [x] **Mobile Adaptation**:
    - [x] Responsive Sidebar/Navbar.
    - [x] HTTPS Configuration for local external access.
    - [x] Layout optimizations for smaller screens.

## 6. Tools & Ecosystem (The "Support" Layer)
*Features that support the learning journey.*
- [x] **Hybrid Dictionary (Crucial)**:
    - **Layer 1 (Fast)**: **MDX Support**. Import local dictionary files (e.g., Mdict) for authoritative definitions.
    - **Layer 2 (Context)**: "Explain in Context" AI button for specific sentence nuances.
- [x] **Data Dashboard**:
    - **Visual Stats**: Daily streaks, words encounter counter, practice volume.
    - **Time Tracking**: Record total practice duration per session.
    - **History**: Log of all completed quizzes and missions.
- [ ] **Audio Engine**:
    - **TTS**: Text-to-Speech for all generated sentences (Browser Native or API).
    - **Shadowing**: Record user audio and compare (Future).
