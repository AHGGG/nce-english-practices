# Coach-Centric Architecture Design

**Date:** 2025-12-15
**Status:** Design Validated

## Overview

Transform the application from a tab-based navigation model (Learn/Drill/Apply/Stats) to a **unified coach-centric experience** where all learning happens through conversation with an intelligent AI coach.

### Core Philosophy

**在丰富的语境中学会单词 → 通过逐步引导的主动使用来学会运用**

Learn word meanings through rich context → Master usage through guided active production.

### The Paradigm Shift

**Before:** Four separate feature tabs users navigate between
**After:** One intelligent coach who orchestrates the entire learning journey through conversation

Users don't navigate UI - they talk to their tutor.

---

## 1. User Experience Design

### Typical User Flows

**First-Time User:**
1. App opens → Coach greets via voice/text
2. Coach: "What's your English level? What interests you?"
3. User responds → Coach builds profile through conversation
4. Coach immediately starts first lesson based on responses

**Returning User:**
```
Coach: "Welcome back! Last time we worked on cooking vocabulary.
        Want to continue or try something new?"
User: "Continue with cooking"
Coach: [recalls progress] "Great! You mastered 'simmer' and 'sauté'.
        Let's add 3 new words today..."
```

**Self-Directed Learning:**
```
User: "I forgot what 'simmer' means"
Coach: [shows definition] "It means to cook just below boiling point.
        Want to see it in a story?"
User: "Yes"
Coach: [generates/retrieves story with 'simmer' highlighted]
Coach: "Ready to practice using it in sentences?"
```

**Adaptive Teaching Session:**
```
User: "I want to work on past tense"
Coach: "Which past tense? Simple, continuous, perfect, or perfect continuous?"
User: "Simple past"
Coach: "Let's use a topic you like. What interests you?"
User: "Travel"
Coach: [generates travel vocabulary + story in simple past]
Coach: [guides through: context → drills → roleplay]
```

### Key Characteristics

- **Conversational access to everything:** No tabs. Want past vocab? Ask. Need to review? Ask. Change topics? Ask.
- **Context-aware teaching:** Simple flashcard when teaching new word, full grid when reviewing mastery
- **Persistent tutor relationship:** Coach remembers struggles, preferences, progress across sessions
- **Modality flexible:** Voice when convenient, text when necessary - same experience

### How This Solves Current Problems

1. **Eliminates navigation friction:** One interface instead of four tabs
2. **Centers guided progression:** Coach leads the flow
3. **Unifies scattered features:** Coach orchestrates vocab→story→drill→roleplay as one coherent journey
4. **Reduces interruptions:** Smooth conversational flow instead of manual tab switching and waiting

---

## 2. System Architecture

### Coach as Central Orchestrator Agent

```
┌─────────────────────────────────────┐
│  Voice/Text Input (User)            │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  Coach Agent (LLM Session)          │
│  - Maintains conversation context   │
│  - Has access to tool suite         │
│  - Makes pedagogical decisions      │
└──────────────┬──────────────────────┘
               ↓
         [Tool Calls]
               ↓
┌──────────────────────────────────────┐
│ Teaching Tools  │  Memory Tools      │
├─────────────────┼────────────────────┤
│ show_vocabulary │ remember()         │
│ present_story   │ recall()           │
│ start_drill     │ get_progress()     │
│ launch_roleplay │ update_mastery()   │
│ explain_concept │ get_profile()      │
│ play_audio      │ save_session()     │
│ wait_for_user   │                    │
└─────────────────┴────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  UI Renderer                        │
│  - Displays tool call results       │
│  - Shows: vocab cards, stories,     │
│    drills, chat interfaces          │
└─────────────────────────────────────┘
```

### Two Implementation Paths

**Path A: Realtime API (Future)**
- Gemini Live or similar WebSocket-based native audio API
- Low latency, natural conversation
- Tool calling when API supports it
- Cost concern → may need usage limits/tiers

**Path B: STT + LLM + TTS Pipeline (MVP)**
- Wake word activation ("Hey Coach")
- DeepSeek/Claude for reasoning + tool calls
- TTS for coach responses
- More cost-effective, full tool control

**Design for Path B now, easy migration to Path A later.**

### Coach Memory System

The coach has explicit memory management tools:

```python
tools = [
    {
        "name": "remember",
        "description": "Save important facts about user",
        "parameters": {
            "key": "category of memory (preferences, struggles, interests)",
            "value": "what to remember"
        }
    },
    {
        "name": "recall",
        "description": "Retrieve user information",
        "parameters": {"query": "what to look up"}
    },
    {
        "name": "update_progress",
        "description": "Update user's mastery level for vocabulary/grammar",
        "parameters": {
            "topic": "vocabulary/grammar item",
            "level": "0-5 mastery scale",
            "notes": "observations about performance"
        }
    },
    {
        "name": "get_learning_profile",
        "description": "Get full user context at session start",
        "returns": {
            "level": "beginner/intermediate/advanced",
            "interests": ["cooking", "travel"],
            "weak_areas": ["present perfect continuous"],
            "strong_areas": ["simple past"],
            "recent_topics": [...]
        }
    }
]
```

### Database Schema

**New Tables:**
```sql
CREATE TABLE user_memories (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_progress (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    mastery_level INTEGER CHECK (mastery_level >= 0 AND mastery_level <= 5),
    notes TEXT,
    last_practiced TIMESTAMP DEFAULT NOW(),
    practice_count INTEGER DEFAULT 1
);

CREATE TABLE coach_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    summary JSONB,
    message_count INTEGER DEFAULT 0
);
```

**Existing Tables (Reused):**
- `stories` → coach calls `present_story()`
- `chat_history` → coach calls `launch_roleplay()`
- `user_attempts` → coach analyzes for weak areas

---

## 3. Coach Mode UI Design

### Layout: Minimal + Spotlight

```
┌─────────────────────────────────────────┐
│                                         │
│         [Main Content Canvas]           │
│                                         │
│    Coach dynamically renders:           │
│    - Vocabulary cards (VocabGrid)       │
│    - Story with highlights (StoryReader)│
│    - Drill interface (MatrixGrid/Quiz)  │
│    - Roleplay chat (ChatCard)           │
│    - Dictionary lookup (DictionaryModal)│
│                                         │
│                                         │
│                                         │
│                                         │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Coach Transcript Area                   │
│ ────────────────────────────────────    │
│ Coach: "Let me show you these words..." │
│ You: "Can you explain 'simmer'?"        │
│ Coach: "Sure! It means..."              │
│                                         │
│ 🎤 [Voice Button]  💬 [Text Mode]       │
└─────────────────────────────────────────┘
```

### Content Canvas (Top ~70%)

- Full-screen teaching material display
- Coach tool calls update this area
- **Context-aware rendering** based on pedagogical intent:
  - `show_vocabulary(words, mode="cards")` → Simple flashcards for teaching
  - `show_vocabulary(words, mode="grid", progress=true)` → Full VocabGrid with mastery
  - `start_drill(type="single", tense="past_simple")` → One question at a time
  - `start_drill(type="matrix", tense="all")` → Full 4x4 matrix

### Coach Footer (~30%)

- **Transcript area:** Scrollable conversation history (last 5-10 exchanges)
- **Voice button:** Large, always accessible (push-to-talk or toggle)
- **Text mode toggle:** Switch to keyboard input
- **Session controls:** Pause, end session, settings
- **Visual feedback:** Waveform animation when coach speaks, listening indicator

### Design System

- **Aesthetic:** Keep "Cyber-Noir" mental gym philosophy
- **Accent color:** `neon-purple` or `neon-cyan` (distinct from Learn/Drill/Apply)
- **Typography:**
  - Coach transcript: `font-mono` for voice authenticity
  - Teaching materials: `Merriweather` for content readability
- **Animations:** Smooth fade transitions when canvas content changes

### Mobile Adaptations

- Footer becomes collapsible bottom sheet
- Voice button prominent and thumb-accessible
- Canvas takes full screen when footer collapsed
- Swipe up for transcript, swipe down to focus on content

---

## 4. Coach Teaching Tools

### Tool Suite Definition

```python
# app/services/coach.py

COACH_TOOLS = [
    {
        "name": "show_vocabulary",
        "description": "Display vocabulary words to user",
        "parameters": {
            "words": "list of vocab items from theme",
            "mode": "cards|grid|list",
            "highlight": "optional word to emphasize"
        }
    },
    {
        "name": "present_story",
        "description": "Show story with vocabulary in context",
        "parameters": {
            "story_id": "from stories table or generate new",
            "highlights": "words to emphasize",
            "read_aloud": "boolean - coach narrates"
        }
    },
    {
        "name": "start_drill",
        "description": "Begin grammar/vocabulary practice",
        "parameters": {
            "drill_type": "fill_blank|translation|tense_matrix|quiz",
            "tense": "specific tense to practice",
            "mode": "single|batch",
            "words": "which vocab to focus on"
        }
    },
    {
        "name": "launch_roleplay",
        "description": "Start conversational practice scenario",
        "parameters": {
            "scenario_type": "restaurant|interview|shopping|custom",
            "focus_grammar": "tense/structure to practice",
            "difficulty": "based on user level"
        }
    },
    {
        "name": "explain_concept",
        "description": "Show definition, examples, usage notes",
        "parameters": {
            "term": "word or grammar concept",
            "show_dictionary": "boolean - open dict panel",
            "examples": "number of example sentences"
        }
    },
    {
        "name": "wait_for_user",
        "description": "Pause and let user explore/practice",
        "parameters": {
            "duration": "suggested wait time in seconds",
            "prompt": "what user should do during wait"
        }
    },
    {
        "name": "assess_response",
        "description": "Evaluate user's answer (drill/roleplay)",
        "parameters": {
            "user_input": "what user said/wrote",
            "expected": "correct answer or pattern",
            "provide_feedback": "boolean"
        }
    }
]
```

### Component Integration

| Tool Call | Renders Component | Props Passed |
|-----------|-------------------|--------------|
| `show_vocabulary()` | `<VocabGrid>` or `<VocabCards>` | `vocab`, `mode`, `highlight` |
| `present_story()` | `<StoryReader>` | `story`, `highlights`, `autoRead` |
| `start_drill(tense_matrix)` | `<MatrixGrid>` | `data`, `mode="coached"` |
| `start_drill(quiz)` | `<QuizModal>` | `question`, `onSubmit` |
| `launch_roleplay()` | `<ChatCard>` | `scenario`, `sessionId` |
| `explain_concept()` | `<DictionaryModal>` or inline card | `term`, `definitions` |

### New Components Needed

```
frontend/src/components/Coach/
├── CoachCanvas.jsx       # Main content area renderer
├── CoachFooter.jsx       # Transcript + voice controls
├── VocabCards.jsx        # Simplified vocab for teaching
└── DrillSingle.jsx       # One-question-at-a-time interface
```

### Backend Service Structure

```python
# app/services/coach.py

class CoachService:
    def __init__(self):
        self.llm_client = llm_service.async_client
        self.sessions = {}

    async def start_session(self, user_id: str) -> dict:
        """Initialize coach session with user context"""
        profile = await get_learning_profile(user_id)

        system_prompt = f"""You are an adaptive English coach...

        User profile: {profile}

        Your role:
        - Guide users through vocabulary → context → practice → application
        - Use tools to teach, assess, and remember progress
        - Adapt difficulty based on user performance
        - Be encouraging but provide honest feedback

        Teaching principles:
        - Introduce words in rich context before drilling
        - Practice immediately after learning
        - Repeat and reinforce weak areas
        - Celebrate progress
        """

        session = {
            "id": str(uuid.uuid4()),
            "messages": [{"role": "system", "content": system_prompt}],
            "user_id": user_id,
            "started_at": datetime.now()
        }

        self.sessions[session["id"]] = session
        return session

    async def handle_turn(self, session_id: str, user_input: str) -> dict:
        """Process user input, get coach response with tool calls"""
        session = self.sessions[session_id]
        session["messages"].append({"role": "user", "content": user_input})

        response = await self.llm_client.chat.completions.create(
            model="deepseek-chat",
            messages=session["messages"],
            tools=COACH_TOOLS
        )

        # Execute tool calls
        tool_results = []
        if response.tool_calls:
            for tool_call in response.tool_calls:
                result = await self.execute_tool(tool_call)
                tool_results.append({
                    "tool": tool_call.function.name,
                    "args": tool_call.function.arguments,
                    "result": result
                })

        session["messages"].append(response.message)

        return {
            "coach_message": response.message.content,
            "tool_calls": tool_results
        }

    async def execute_tool(self, tool_call) -> dict:
        """Route tool calls to appropriate handlers"""
        name = tool_call.function.name
        args = json.loads(tool_call.function.arguments)

        handlers = {
            "show_vocabulary": self._show_vocabulary,
            "present_story": self._present_story,
            "start_drill": self._start_drill,
            "launch_roleplay": self._launch_roleplay,
            "remember": self._remember,
            "recall": self._recall,
            # ... other handlers
        }

        handler = handlers.get(name)
        if handler:
            return await handler(**args)
        else:
            return {"error": f"Unknown tool: {name}"}
```

---

## 5. Voice Integration

### Voice Pipeline (STT + LLM + TTS)

```python
# app/services/voice_coach.py

class VoiceCoachService:
    def __init__(self):
        self.wake_word = "hey coach"
        self.coach_service = CoachService()

    async def process_voice_input(self, audio_chunk: bytes, session_id: str) -> dict:
        """Complete voice processing pipeline"""

        # 1. Speech-to-Text
        transcript = await self.stt(audio_chunk)

        # 2. Send to coach agent
        coach_response = await self.coach_service.handle_turn(
            session_id,
            transcript
        )

        # 3. Text-to-Speech
        audio = await self.tts(coach_response["coach_message"])

        return {
            "user_transcript": transcript,
            "coach_text": coach_response["coach_message"],
            "coach_audio": audio,
            "tool_calls": coach_response["tool_calls"]
        }

    async def stt(self, audio: bytes) -> str:
        """Speech to text (Whisper or WebSpeech API)"""
        # Implementation depends on chosen STT engine
        pass

    async def tts(self, text: str) -> bytes:
        """Text to speech (Edge TTS, Google TTS, etc.)"""
        # Implementation depends on chosen TTS engine
        pass
```

### Frontend Voice Controller

```javascript
// frontend/src/services/voiceController.js

class VoiceController {
  constructor() {
    this.isListening = false;
    this.mediaRecorder = null;
    this.ws = null; // WebSocket connection
  }

  async startSession() {
    // Connect to coach WebSocket
    this.ws = new WebSocket('ws://localhost:8000/ws/coach-voice');

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleCoachResponse(data);
    };
  }

  async startListening() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(stream);

    this.mediaRecorder.ondataavailable = async (e) => {
      // Send audio chunks to backend
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(e.data);
      }
    };

    this.mediaRecorder.start(100); // 100ms chunks
    this.isListening = true;
  }

  stopListening() {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.isListening = false;
    }
  }

  handleCoachResponse(data) {
    // 1. Play audio response
    this.playAudio(data.coach_audio);

    // 2. Update transcript
    this.updateTranscript({
      user: data.user_transcript,
      coach: data.coach_text
    });

    // 3. Render tool calls in canvas
    this.renderToolCalls(data.tool_calls);
  }

  playAudio(audioBase64) {
    const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
    audio.play();
  }
}
```

### Voice Interaction Patterns

**Push-to-Talk (MVP Implementation):**
- User holds/clicks voice button → Records
- User releases → Stops recording, sends to backend
- Clear start/end, prevents accidental triggers
- Lower complexity, good for initial version

**Wake Word + Continuous (Future Enhancement):**
- Always listening for "Hey Coach"
- Activates → records until silence detected → processes
- More natural but requires silence detection

**Turn-Based Conversation:**
- User speaks → Coach responds → Waits for user
- Clear turn-taking, prevents interruptions
- Good for teaching scenarios

### Proactive Coach Behaviors

```python
async def smart_wait(self, context: dict) -> str:
    """Coach decides wait time based on activity"""

    if context["activity"] == "reading_story":
        # Story length-based wait (assume ~180 wpm reading speed)
        words = len(context["story"].split())
        wait_seconds = words / 3

    elif context["activity"] == "doing_drill":
        # Give time to think and answer
        wait_seconds = 30

    elif context["activity"] == "conversation":
        # Shorter wait in active conversation
        wait_seconds = 10

    # Set timer; if user doesn't respond, coach checks in
    await asyncio.sleep(wait_seconds)

    if not user_responded:
        return "How's it going? Need help?"
```

### Text Fallback

Voice and text work identically through the same coach service:

```jsx
// Coach footer always shows both options
<CoachFooter>
  <TranscriptArea messages={messages} />

  <InputControls>
    {voiceMode ? (
      <VoiceButton
        onPress={startListening}
        onRelease={stopListening}
        isActive={isListening}
      />
    ) : (
      <TextInput
        onSubmit={sendMessage}
        placeholder="Type your message..."
      />
    )}

    <ModeToggle
      value={voiceMode}
      onChange={setVoiceMode}
      icons={{ voice: "🎤", text: "💬" }}
    />
  </InputControls>
</CoachFooter>
```

---

## 6. Migration from Old Architecture

### What Changes

**Remove:**
- Tab navigation (Learn/Drill/Apply/Stats)
- Separate route-based views
- TopicInput component (replaced by conversation)

**Keep & Reuse:**
- All existing components (VocabGrid, StoryReader, MatrixGrid, QuizModal, ChatCard)
- All generators (theme, story, sentence, scenario, coach)
- All database tables (add new coach-specific tables)
- Dictionary system (coach can call it via tools)

**Component Adaptation:**

```jsx
// Existing components gain "coach mode" variants
<VocabGrid
  vocab={data}
  mode="coach-cards"  // vs "full-grid"
  highlight={targetWord}
/>

<StoryReader
  story={data}
  coachMode={true}  // simplified controls
  highlights={vocabWords}
  autoRead={true}   // TTS narration
/>

<QuizModal
  question={drill}
  coachMode={true}  // single question, voice input
  onAnswer={(answer) => sendToCoach(answer)}
/>
```

### Conversational Access to History

Users access past materials through conversation:

```
User: "Show me the vocabulary from last week"
Coach: [calls get_learning_history(days=7)]
Coach: "Here are the topics we covered:
       - Cooking (8 words, 85% mastery)
       - Travel (12 words, 60% mastery)
       Which would you like to review?"

User: "Show the cooking words"
Coach: [calls show_vocabulary(topic="cooking", mode="grid", progress=true)]
       [Renders VocabGrid with mastery indicators]
```

**No visual sidebar needed - pure conversational access.**

### Database Continuity

```sql
-- Existing tables (still used)
stories → coach calls present_story()
sentences → coach calls start_drill()
chat_history → coach calls launch_roleplay()
user_attempts → coach analyzes for weak areas

-- New tables (added)
user_memories → coach memory management
user_progress → mastery tracking
coach_sessions → session summaries
```

---

## 7. Implementation Roadmap

### Phase 1: Core Coach Engine (Backend)
- [ ] `CoachService` with tool-calling LLM integration
- [ ] Tool implementations: `show_vocabulary`, `present_story`, `start_drill`
- [ ] Memory tools: `remember()`, `recall()`, `get_profile()`
- [ ] Database migrations: `user_memories`, `user_progress`, `coach_sessions`
- [ ] API endpoints: `/api/coach/start`, `/api/coach/message`

### Phase 2: Voice Pipeline (STT + TTS)
- [ ] WebSocket endpoint: `/ws/coach-voice`
- [ ] STT integration (WebSpeech API or Whisper)
- [ ] TTS integration (Edge TTS or Google TTS)
- [ ] Audio streaming and playback
- [ ] Push-to-talk voice input

### Phase 3: Coach UI (Frontend)
- [ ] `CoachCanvas` component (tool call renderer)
- [ ] `CoachFooter` component (transcript + controls)
- [ ] `CoachContext` state management
- [ ] Voice controller service
- [ ] Text chat interface
- [ ] Voice/text mode toggle

### Phase 4: Component Adaptation
- [ ] Add coach mode props to `VocabGrid`
- [ ] Add coach mode props to `StoryReader`
- [ ] Add coach mode props to `QuizModal`
- [ ] Create `VocabCards` (simplified teaching view)
- [ ] Create `DrillSingle` (one-question interface)

### Phase 5: Onboarding & Polish
- [ ] First-time conversation flow (level, interests)
- [ ] Session management (start, pause, resume, end)
- [ ] Progress tracking and adaptive difficulty
- [ ] Error handling and fallbacks
- [ ] Mobile responsive design
- [ ] Performance optimization

### Phase 6: Testing
- [ ] Backend unit tests (coach service, tools, memory)
- [ ] E2E tests (onboarding, tool rendering, voice fallback)
- [ ] Voice integration tests (STT accuracy, TTS generation)
- [ ] Edge case handling (ambiguous input, failures, silence)

---

## 8. Technical Decisions

### LLM Choice
- **DeepSeek-Chat** with function calling
- Cost-effective, good reasoning
- OpenAI-compatible API

### Voice Engines
- **STT:** Browser WebSpeech API (MVP) → Whisper (production)
- **TTS:** Edge TTS or Google Cloud TTS
- **Wake word:** Optional future enhancement

### Communication
- **Voice sessions:** WebSocket (`/ws/coach-voice`)
- **Text sessions:** Can use HTTP or same WebSocket
- Unified backend handler for both modalities

### State Management
```javascript
// frontend/src/context/CoachContext.jsx
const CoachContext = createContext();

const CoachProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [canvasContent, setCanvasContent] = useState(null);
  const [voiceMode, setVoiceMode] = useState(true);
  const [isListening, setIsListening] = useState(false);

  const startSession = async () => { /* ... */ };
  const sendMessage = async (text) => { /* ... */ };
  const sendVoice = async (audioBlob) => { /* ... */ };
  const endSession = async () => { /* ... */ };

  return (
    <CoachContext.Provider value={{...}}>
      {children}
    </CoachContext.Provider>
  );
};
```

### Error Handling
- Voice fails → Auto-switch to text mode
- LLM timeout → "Let me think..." loading state
- Tool call fails → Coach adapts: "Can't load that, try something else"
- Network loss → Save session state, resume when reconnected

### Performance
- Lazy-load canvas components
- Chunk TTS output for faster playback start
- Summarize old messages when approaching context limits
- Cache generated content in database

---

## 9. Testing Strategy

### Backend Tests
```python
# tests/test_coach_service.py

async def test_coach_memory_persistence():
    """Coach remembers user preferences across sessions"""
    # Session 1: Coach learns preference
    # Session 2: Coach loads and uses that memory

async def test_tool_execution():
    """Coach tool calls work correctly"""
    # Coach calls show_vocabulary → returns vocab data

async def test_adaptive_difficulty():
    """Coach adjusts based on performance"""
    # User struggles → coach detects → adjusts difficulty
```

### E2E Tests
```python
# tests/e2e/test_coach_flow.py

async def test_onboarding_conversation(page):
    """First-time user onboarding works"""
    # Coach greets → asks level → asks interests

async def test_voice_to_text_fallback(page):
    """Graceful fallback when voice fails"""
    # Block mic → show error → switch to text mode

async def test_tool_call_rendering(page):
    """Tool calls display correctly in canvas"""
    # Ask for vocab → VocabGrid appears
```

### Edge Cases

**Ambiguous Input:**
```
User: "Show me something"
Coach: "What would you like? Vocabulary, story, or drills?"
```

**Off-Topic:**
```
User: "What's the weather?"
Coach: "I focus on English learning. Want to learn weather vocabulary?"
```

**Repeated Struggles:**
```
# After 3 wrong answers
Coach: [calls remember("struggles_with", "present_perfect")]
Coach: "This tense is tricky. Let me explain differently..."
```

**Long Silence:**
```python
# After 30 seconds
if time_since_last_input > 30:
    coach: "Still there? Take your time!"
```

**Context Overflow:**
```python
# Summarize old messages when approaching token limit
if total_tokens > 0.8 * max_tokens:
    summary = await llm.summarize(messages[10:50])
    messages = messages[:10] + [summary] + messages[50:]
```

**Tool Failures:**
```python
try:
    result = await execute_tool(tool_call)
except Exception as e:
    result = {"success": False, "error": "Resource unavailable"}
    # Coach adapts: "Can't load that now. Try another approach?"
```

---

## 10. Success Metrics

**User Engagement:**
- Average session duration
- Number of sessions per week
- Completion rate of coach-guided exercises

**Learning Effectiveness:**
- Vocabulary retention (repeat testing)
- Grammar accuracy improvement over time
- User progress through difficulty levels

**UX Quality:**
- Voice vs text usage ratio
- Tool call success rate
- Session abandonment rate
- User satisfaction ratings

**Technical Performance:**
- STT accuracy
- TTS latency
- Coach response time
- Tool call execution time

---

## Conclusion

This design transforms the application from a collection of learning tools into a **unified conversational learning experience**. The coach becomes the interface, orchestrating all features through intelligent conversation.

**Key Innovations:**
1. **Conversational UI** replaces navigation
2. **Context-aware teaching** adapts to user needs
3. **Persistent memory** builds long-term tutoring relationship
4. **Voice-first design** creates natural interaction
5. **Tool-calling architecture** gives coach full teaching capabilities

**Next Steps:**
1. Validate design with stakeholders
2. Create detailed implementation plan (bite-sized tasks)
3. Set up git worktree for isolated development
4. Begin Phase 1 implementation (Core Coach Engine)
