# Product Roadmap: NCE Active Grammar Gym

> **Core Philosophy**: "Active Usage over Passive Memorization."
> **Strategy**: A 4-Stage Learning Path (Context -> Drill -> Apply -> Speak).

## 0. Strategic Pivot (2025-12-27): The Voice-First CI Architecture
> **New Core Philosophy**: "Unified Contextual Acquisition."
> **Shift**: Moving away from the discrete 4-stage model (Drill/Apply/Speak) to a **single, unified Voice Interface** that guides the user through the input-intake-acquisition loop using CI principles (i+1, 98% Comprehension, Low Anxiety).

### Core Features (Implemented 2025-12)
- [x] **Negotiation Loop**: "Huh?" button triggers simplified explanation (L1/L2) -> "Got it" moves to next.
- [x] **Multi-Example Navigation**: Browse multiple senses and examples for deep context.
- [x] **Context Enhancement**:
    - [x] **Rich Context**: Backend uses definition and POS to ground explanations (Fixes "Context is not enough").
    - [x] **Session Sync**: Navigation resets session to prevent stale context.
    - [x] **TTS Optimization**: Prompts forbid markdown/asterisks for clean audio.
- [x] **Step History**: Back/Forward navigation through the negotiation dialogue.
- [x] **Scaffolding**: Click-to-reveal definitions and translations.
- [x] **Playback Control**: Speed adjustment (0.5x, 0.75x, 1.0x) and auto-replay.
- [x] **Word List Focus**: Practice vocabulary from specific books (CET4/6, COCA).
    - [x] **Random Selection**: Uses `func.random()` for variety instead of sequential order.
    - [x] **SKIP Support**: Exclude current word when fetching next (prevents repetition).
- [x] **Ingestion Strategy**: Content-driven learning from external sources.
    - [x] **RSS Service**: Basic feed parsing and sentence extraction (2025-12-28).
    - [x] **EPUB Service**: Local EPUB parsing with full-text articles (2025-12-28).
    - [x] **Word Sense Disambiguation**: LLM-powered sense selection based on context.
    - [x] **Content Provider Architecture** (2025-12-29):
        - [x] `ContentBundle` unified data model for all content sources.
        - [x] `BaseContentProvider` abstract interface.
        - [x] 4 Providers implemented: Epub, RSS, Podcast, PlainText.
        - [x] `ContentFeeder` migrated to use `ContentService`.
- [ ] **Frontend Mode Separation** (Planned):
    - [ ] Specialized Views: Podcast Mode, Reading Mode, Vocabulary Mode.
    - [ ] Source-Aware Drill-down: Record learning context for each word.

## [LEGACY] 1. Stage 0: Context & Concept (The "Learn" Stage)
*(Note: This 4-stage model is being deprecated in favor of the unified voice flow)*
*For beginners or starting a new concept.*
- [x] **Contextual Story Generator**:
    - [x] **Streaming Support**: Real-time story generation for better UX.
    - [x] **Micro-Scenarios**: Real-time context generation for dictionary examples (2025-12-27).
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

## Technical Foundation & Deployment Updates
- [x] **Backend**: New endpoints for `/api/story` and `/api/chat`.
- [x] **Frontend**: New "Mode Switcher" (Learn / Drill / Apply / Speak) in the navigation.
- [x] **State**: Persist user progress per stage (Now in PostgreSQL).
- [x] **Async Architecture**: Refactor synchronous LLM calls to prevent blocking (Complete).
- [x] Dictionary Fixes: Support `@@@LINK` redirects and relative asset pathing.
- [x] Testing Infrastructure: Refactored legacy tests into a modern `pytest` suite for voice integration and WebSocket verification.
- [x] **Mobile Adaptation**:
    - [x] `TEXT_DELTA`: Streaming text incremental updates.
    - [x] `TEXT_MESSAGE_START/END`: Message lifecycle events (Segmentation).
    - [x] `STATE_SNAPSHOT`: Complete state for recovery/initialization (2025-12-22).
    - [x] `STATE_DELTA`: JSON Patch state updates (Implemented via jsonpatch).
    - [x] `MESSAGES_SNAPSHOT`: History synchronization event.
    - [x] `STREAM_START/END/ERROR`: Lifecycle events.
    - [x] **AUI Streaming**: Complete AG-UI compatible streaming system (2025-12-22).
        - [x] Backend deep copy bug fixes in `stream_vocabulary_flip()`.
        - [x] Frontend hooks violation fix in `StoryReader` component.
        - [x] All 4 streaming scenarios verified working (Story, Vocabulary, State Sync, Vocab Patch).
        - [x] **Context Resources**: Grouped by Sense for better clarity (2025-12-24).
        - [x] **Translation Toggle**: Chinese hidden by default, click to reveal (2025-12-24).
    - [x] **AUI Bi-directional (Phase 2)**: (2025-12-22)
        - [x] Backend Input Service (Postgres Persistent).
        - [x] Interactive UI Components.
        - [x] Human-in-the-Loop Demo.
    - [x] **AUI Protocol Gaps (Phase 3)**: (2025-12-22)
        - [x] `INTERRUPT` Event for explicit control flow.
        - [x] Component Schema Validation (`aui_schema.py`).
    - [x] **AG-UI Protocol Alignment (Phase 4)**: (2025-12-23)
        - [x] Enhanced `InterruptEvent` with `interrupt_id` and `payload` fields.
        - [x] Enhanced `RunFinishedEvent` with `interrupt` outcome support.
        - [x] Interactive `InterruptBanner` component with action buttons.
        - [x] Enhanced `RunFinishedEvent` with `interrupt` outcome support.
        - [x] Interactive `InterruptBanner` component with action buttons.
        - [x] Demo endpoint for Study Plan confirmation flow.
    - [x] **Reading Mode Stylization (2025-12-29)**:
        - [x] Deep refactor of `ReadingMode.jsx` to Cyber-Noir Design System.
        - [x] Replaced hardcoded styles with `components/ui` primitives (Button, Card, Tag).
        - [x] Implemented sharp aesthetics (no rounded corners, hard shadows).
        - [x] **Performance Optimization**: `React.memo` + CSS-based highlighting to reduce click latency (<50ms).
    - [x] **AUI Mobile Compatibility (Phase 5)**: (2025-12-25)
        - [x] Robust Reconnection: Auto-reconnect, Backoff, Visibility handling in `useAUITransport`.
        - [x] Responsive Layout: `AUIStreamingDemo` stack layout on mobile.
        - [x] Component Optimization: Touch-friendly sizing for all inline components (`InterruptBanner`, `MessageList`).
        - [x] UI Fixes: Improved flexbox centering to prevent clipping on overflow.
    - [x] **AUI Transport Consolidation (2025-12-26)**:
        - [x] **Cut SSE**: Removed dual transport complexity.
        - [x] **Unified WebSocket**: Standardized all streaming on WebSocket.
        - [x] **Frontend Refactor**: Simplified `useAUITransport` and Hydrator.
        - [x] **Cleanup**: Removed legacy SDKs (`deepgram-sdk`, `elevenlabs`), SSE scripts, and unused routers.
- [ ] **Deployment & Architecture Optimization** (New):
    - [x] **Dockerization**: Multi-stage build for React (Vite) + FastAPI.
    - [x] **SPA Serving**: Configure FastAPI to serve React static files (remove Jinja2).
    - [x] **Code Cleanup**: Remove legacy `templates/` directory and synchronous DB patterns.
    - [x] **Service Layer Refactor**: Decouple business logic from `voice.py` router.

## 6. Tools & Ecosystem (The "Support" Layer)
*Features that support the learning journey.*
- [x] **Hybrid Dictionary (Crucial)**:
    - **Layer 1 (Fast)**: **MDX Support**. Import local dictionary files (e.g., Mdict) for authoritative definitions.
    - **Layer 2 (Context)**: "Explain in Context" AI button for specific sentence nuances.
- [x] **Log Bridge**:
    - [x] **Unified Debugging**: Stream frontend logs (console.log) to the backend terminal via `navigator.sendBeacon` (non-blocking).
    - [x] **RLock Fix**: Fixed backend self-deadlock in `log_collector.py`.
- [x] **Data Dashboard**:
    - [x] **Visual Stats**: Daily streaks, words encounter counter, practice volume.
    - [x] **Time Tracking**: Record total practice duration per session.
    - [x] **History**: Log of all completed quizzes and missions.
- [x] **Voice Vendor Lab**:
    - [x] **Internal Tool**: `/voice-lab` refactored to **Vendor-Centric Layout** (Google, Deepgram, ElevenLabs tabs).
    - [x] **SDK Removal**: Removed ElevenLabs and Deepgram SDKs in favor of raw `httpx` API calls.
    - [x] **Automation**: Added `VoiceTester` service for cross-vendor semantic verification.
    - [x] **Conversation Loop**: Added interactive STT-LLM-TTS loop for real-time testing.
- [x] **Audio Engine**:
    - [x] **TTS**: Text-to-Speech for all generated sentences (Browser Native or API).
    - [x] **Shadowing**: Record user audio and compare (via Voice Lab & Agents).

## 7. Visual & UX Overhaul (The "Cyber-Noir" System)
*Goal: Combine Synthwave aesthetics with Ink & Paper sharpness for a high-performance "Mental Gym".*
- [x] **Design Exploration**:
    - [x] Review candidate UIs (Ink, Neon, Nomadic, Synthwave).
    - [x] Prototype "Cyber-Noir" Unified System (High contrast, 1px borders, No glow).
- [x] **Core Design System**:
    - [x] **Tokens**: Define Colors (OLED Black, Neon Green/Pink), Typography (Serif Headers + Mono Data).
    - [x] **Components**: Rebuild primitives (Button, Input, Card, Modal) in `frontend/src/components/ui/`.
- [x] **View Implementation**:
    - [x] **App Shell**: Update Sidebar/Navbar to "Cyber-Noir" style.
    - [x] **Story Mode**: Apply Serif typography and high-contrast reading experience.
    - [x] **Drill Matrix**: Apply Monospace data aesthetic and snappy interactions.
    - [x] **Story Mode**: Apply Serif typography and high-contrast reading experience.
    - [x] **Drill Matrix**: Apply Monospace data aesthetic and snappy interactions.
    - [x] **Scenario/Chat**: Update message bubbles to "Hard Shape" style.
    - [x] **Reading Mode**: Refactored to strict Cyber-Noir token usage (2025-12-29).

## 8. Engineering Excellence (Optimization)
- [x] **Structure Optimization**: Consolidate models into pp/models/ package.
- [x] **DX**: Scripts for easy startup and testing (scripts/dev.ps1, scripts/test.ps1).
- [x] **Legacy Cleanup**: Removed expired E2E tests and formalized offline fallback logic.

