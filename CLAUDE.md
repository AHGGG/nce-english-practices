# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an English tense practice application for New Concept English (NCE) learners. It uses LLM (DeepSeek) to generate vocabulary and practice sentences across 16 tense variations (4 time layers × 4 aspects). The app provides a TUI (Terminal User Interface) for interactive practice with real-time grading.

## Development Setup

```bash
# Install dependencies
uv sync

# Run the TUI application
python english_tense_practice.py

# CLI demos
python english_tense_practice.py --matrix-demo travel
python english_tense_practice.py --export travel
python english_tense_practice.py --matrix-demo travel --refresh  # force regenerate
```

## Environment Configuration

Create a `.env` file in the project root:

```env
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
MODEL_NAME=deepseek-chat
```

The app uses OpenAI-compatible API client to connect to DeepSeek.

## Architecture

### Data Flow: Two-Stage LLM Generation

The application uses a **lazy loading pattern** with two distinct LLM generation stages:

1. **Theme/Vocabulary Generation** (`theme_vocab.py`)
   - Input: Topic keyword (e.g., "travel", "muse")
   - Output: ONE set of words (subject, object, verb, manner, place, time)
   - Cached in: `~/.english_tense_practice/themes/{topic}.json`
   - **Critical constraint**: Generated vocabulary MUST include the topic word in at least one slot

2. **Sentence Generation** (`sentence_generator.py`)
   - Input: Topic + time_layer + vocabulary components
   - Output: 32 sentences for one time_layer (4 aspects × 8 forms)
   - Cached in: `~/.english_tense_practice/sentences/{topic}_{time_layer}.json`
   - Generated on-demand when user selects a time_layer
   - **Critical constraint**: Sentences MUST use the exact words from vocabulary (no substitutions)

### Tense Matrix Structure

**Time Layers** (4):
- `past`, `present`, `future`, `past_future` (would-based)

**Aspects** (4):
- `simple`, `perfect`, `progressive`, `perfect_progressive`

**Sentence Forms** (8 per tense):
- `affirmative`, `negative`, `question`
- Special questions: `when`, `where`, `how`, `why`, `who`

Total: 4 × 4 × 8 = **128 sentence variations** per topic

### Core Components

**State Management** (`models.py`):
- `SelectionState`: Holds current topic, vocabulary slots, selected indices
- `ThemeVocabulary`: Stores LLM-generated words for a topic
- `BaseSentence`: Sentence components ready for tense transformation

**Sentence Generation**:
- `practice_core.py`: Code-based tense transformation (legacy, still used for matrix demo)
- `sentence_generator.py`: LLM-based sentence generation (primary method for TUI)

**TUI Application** (`tui_app.py`):
- Built with Textual framework
- Lazy loads sentences by time_layer (reduces API calls from 128→32 per load)
- Caches sentences in memory (`self.sentence_cache`) and on disk
- Shuffle button regenerates vocabulary with anti-duplicate logic

### Anti-Duplicate Logic for Shuffle

When user clicks "Shuffle" (`tui_app.py:167-201`):
1. Builds `previous_vocab` from current state
2. Passes to `ensure_theme(..., previous_vocab=previous_vocab)`
3. LLM prompt includes: "IMPORTANT: Generate NEW words. Avoid repeating these previously used words: ..."
4. Temperature increased to 0.7 for more diversity

## Key Design Decisions

### Why Lazy Loading by Time Layer?

**Problem**: Generating all 128 sentences upfront is wasteful (user typically practices one time_layer at a time).

**Solution**: Generate 32 sentences when user selects a time_layer:
- First load: Generate `present` sentences
- Switch to `past`: Generate `past` sentences on-demand
- Cached for instant access on revisit

### Why Two-Stage Generation?

**Stage 1 (Vocabulary)**: Fast, cheap, cacheable across time_layers
**Stage 2 (Sentences)**: Expensive, but only done once per time_layer

This separation allows:
- Shuffle vocabulary without regenerating sentences
- Reuse vocabulary across different time_layers
- Clear cache granularity (by topic vs by topic+time_layer)

### CSS and Layout

The TUI uses `tui.css` for styling. Key constraints:
- Terminal width is often limited (80 columns)
- Responsive layout: Input uses `width: 1fr`, buttons auto-size
- Matrix table: `expand=True` with ratio-based columns (1:3)

## File Locations

**User Data**:
- `~/.english_tense_practice/themes/*.json` - Cached vocabulary
- `~/.english_tense_practice/sentences/*.json` - Cached sentences
- `~/.english_tense_practice/progress.json` - Practice history
- `~/.english_tense_practice/exported_practice.csv` - Exported matrices

**Source Code**:
- `config.py` - Environment, paths, model availability check
- `models.py` - Data classes (no business logic)
- `theme_vocab.py` - Vocabulary generation (Stage 1)
- `sentence_generator.py` - Sentence generation (Stage 2)
- `practice_core.py` - Grading, logging, code-based tense transform
- `tui_app.py` - Textual TUI application
- `english_tense_practice.py` - CLI entry point

## Common Pitfalls

### LLM Prompt Engineering

**Theme Generation** (`THEME_PROMPT` in `theme_vocab.py`):
- MUST enforce: "Use the topic word in at least ONE slot"
- Without this, LLM generates related concepts but omits the topic word itself
- Example: Topic "muse" should generate "my muse" not just "creative ideas"

**Sentence Generation** (`SENTENCE_GENERATION_PROMPT` in `sentence_generator.py`):
- MUST enforce: "Use EXACT words provided" with explicit examples
- Without this, LLM paraphrases/substitutes words
- Include "CRITICAL RULES" section with numbered constraints

### Cache Invalidation

When changing prompts or generation logic:
```bash
rm -rf ~/.english_tense_practice/themes/*.json
rm -rf ~/.english_tense_practice/sentences/*.json
```

### Textual Layout Issues

If widgets are invisible:
1. Check CSS `height` values (avoid `height: 1fr` on containers with dynamic content)
2. Use `expand=True` on Tables
3. Set `width: 100%` on main containers
4. Terminal width < 80 columns will cause layout issues

## Testing the Application

**Manual Test Flow**:
1. Run app, click "Recheck Model" → should show "[Model OK]"
2. Enter topic (e.g., "travel") → press Enter or click "Load"
3. Verify generated vocabulary includes the topic word
4. Verify sentences display in the table
5. Switch time_layer (select different tense) → should trigger new sentence generation
6. Click "🎲 Shuffle" → should generate NEW vocabulary (different from before)
7. Type answer → should show score and feedback

**Expected Behavior**:
- First load: Shows "Generating present tense sentences..."
- Shuffle: Shows "Generating new words for 'travel'..."
- All sentences should use the exact vocabulary generated
- No word substitutions or paraphrasing
