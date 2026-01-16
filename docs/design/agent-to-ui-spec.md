# Agent-to-UI (AUI) Specification

## 1. Overview
The Agent-to-UI (AUI) framework enables the backend AI Agent to "render" React components on the client side. This allows for rich, interactive, and context-aware responses (e.g., drills, timelines, flashcards) instead of plain text.

## 2. Core Protocol
The communication uses a JSON DSL payload called `AUIRenderPacket`.

### 2.1 Envelope Structure
```json
{
  "type": "aui_render",
  "id": "uuid-v4",
  "intention": "string",  // e.g. "show_vocabulary", "present_story"
  "ui": {
    "component": "ComponentKey", // Mapped in frontend registry
    "props": { ... }             // Passed directly to React component
  },
  "fallback_text": "string",     // For non-AUI clients (e.g. CLI, simple logs)
  "target_level": 1              // i+1 Scaffolding Level (1=Beginner, 2=Intermediate, 3=Advanced)
}
```

## 3. Scaffolding Levels ("i+1")
The system dynamically selects components/props based on user mastery.

| Level | Intent | Component | Behavior |
|-------|--------|-----------|----------|
| **1 (Beginner)** | `show_vocabulary` | `FlashCardStack` | Shows translation immediately. Focus on recognition. |
| **2 (Interm.)** | `show_vocabulary` | `VocabGrid` | Hidden translation ("Challenge Mode"). Focus on recall. |
| **1 (Beginner)** | `explain_grammar` | `RuleCard` | Simple static formula (e.g. "Subject + V2"). |
| **3 (Advanced)** | `explain_grammar` | `TenseTimeline` | Comparative timeline with relative time points. |

## 4. Frontend Architecture
- **AUIHydrator**: The shell component that unpacks the JSON and renders the target component.
- **Registry**: `frontend/src/components/aui/registry.js` maps string keys to lazy-loaded modules.

## 5. Implementation Status
- [x] Backend Service (`app/services/aui.py`)
- [x] Protocol Models (Pydantic)
- [x] Frontend Hydrator (`AUIHydrator.jsx`)
- [x] Component Registry
- [x] Integration with `CoachCanvas`
