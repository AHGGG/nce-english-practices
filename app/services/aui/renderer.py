from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field
import uuid

# --- AUI Protocol Models ---


class AUIComponent(BaseModel):
    """Base model for any UI component payload."""

    component: str  # The key used by Frontend Registry (e.g. "TenseTimeline")
    props: Dict[str, Any] = Field(default_factory=dict)


class AUIRenderPacket(BaseModel):
    """The standard envelope for Agent-to-UI communication."""

    type: Literal["aui_render"] = "aui_render"
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    intention: str  # e.g. "explain_error", "teach_concept"
    ui: AUIComponent
    fallback_text: str  # For clients that don't support AUI

    # Metadata for the "i+1" logic
    target_level: Optional[int] = None  # 1=Beginner, 2=Intermediate, 3=Advanced


# --- Concrete Component Props Models (Optional but good for type safety) ---


class TenseTimelineProps(BaseModel):
    tense: str
    points: List[
        Dict[str, Any]
    ]  # e.g. [{"label": "Now", "t": 0}, {"label": "Action", "t": -1}]


class TranslationCardProps(BaseModel):
    original: str
    translation: str
    notes: Optional[str] = None


# --- Main Renderer Service ---


class AUIRenderer:
    """
    The 'Visual Cortex' of the Agent.
    Decides WHICH component to show based on WHAT the agent wants to do (Intent)
    and WHO the user is (Mastery Level).
    """

    def render(
        self, intent: str, data: Dict[str, Any], user_level: int = 1
    ) -> AUIRenderPacket:
        """
        Main entry point.
        intent: The abstract goal (e.g. "show_vocabulary", "explain_tense")
        data: The raw data needed (e.g. words list, tense name)
        user_level: 1 (Beginner) -> 3 (Advanced)
        """

        if intent == "show_vocabulary":
            return self._render_vocabulary(data, user_level)

        elif intent == "present_story":
            return self._render_story(data, user_level)

        elif intent == "explain_grammar":
            return self._render_grammar(data, user_level)

        elif intent == "explain_correction":
            return self._render_correction(data, user_level)

        # Fallback to generic text
        return AUIRenderPacket(
            intention="unknown",
            ui=AUIComponent(component="MarkdownMessage", props={"content": str(data)}),
            fallback_text=str(data),
        )

    # --- Specific Render Logic ---

    def _render_vocabulary(self, data: Dict[str, Any], level: int) -> AUIRenderPacket:
        words = data.get("words", [])
        # mode = data.get("mode", "cards")

        if level <= 1:
            # Level 1: Simple Flashcards with translations
            component = "FlashCardStack"
            props = {"words": words, "show_translation": True}
            fallback = f"Here are the words: {', '.join(words)}"

        elif level == 2:
            # Level 2: Interactive Grid, challenge mode (L1 translation allowed)
            component = "VocabGrid"
            props = {
                "words": words,
                "show_translation": False,
                "challenge_mode": True,
                "monolingual": False,
            }
            fallback = f"Review these words: {', '.join(words)}"

        else:
            # Level 3: Monolingual Grid (English definitions only)
            component = "VocabGrid"
            props = {
                "words": words,
                "show_translation": False,
                "challenge_mode": True,
                "monolingual": True,
            }
            fallback = f"Advanced review: {', '.join(words)}"

        return AUIRenderPacket(
            intention="show_vocabulary",
            ui=AUIComponent(component=component, props=props),
            fallback_text=fallback,
            target_level=level,
        )

    def _render_story(self, data: Dict[str, Any], level: int) -> AUIRenderPacket:
        title = data.get("title", "Story")
        content = data.get("content", "")

        # Level Logic for Story
        # Level 1: Beginner -> Full Notes
        # Level 2/3: Pure content

        notes = data.get("grammar_notes", []) if level <= 1 else []
        notes_text = (
            "\n\n".join(
                [f"📝 {n.get('note', '')}: _{n.get('example', '')}_" for n in notes]
            )
            if notes
            else ""
        )

        markdown_content = f"# {title}\n\n{content}"
        if notes_text:
            markdown_content += f"\n\n---\n{notes_text}"

        props = {"content": markdown_content}

        return AUIRenderPacket(
            intention="present_story",
            ui=AUIComponent(component="MarkdownMessage", props=props),
            fallback_text=f"Story: {title}\n\n{content}",
        )

    def _render_grammar(self, data: Dict[str, Any], level: int) -> AUIRenderPacket:
        tense = data.get("tense", "unknown")

        if level <= 1:
            # Beginner: Simple Rule Card
            return AUIRenderPacket(
                intention="explain_grammar",
                ui=AUIComponent(
                    component="MarkdownMessage",
                    props={
                        "content": f"**{tense} Rule**\n\nUsage: Subject + have/has + V3"
                    },
                ),
                fallback_text=f"Rule for {tense}: Subject + have/has + V3",
            )
        elif level == 2:
            # Level 2: Timeline with moderate complexity
            return AUIRenderPacket(
                intention="explain_grammar",
                ui=AUIComponent(
                    component="TenseTimeline",
                    props={"tense": tense, "complexity": "medium"},
                ),
                fallback_text=f"Let's visualize {tense} on the timeline.",
            )
        else:
            # Level 3: Advanced Timeline with full complexity
            return AUIRenderPacket(
                intention="explain_grammar",
                ui=AUIComponent(
                    component="TenseTimeline",
                    props={"tense": tense, "complexity": "high"},
                ),
                fallback_text=f"Let's visualize {tense} on the timeline.",
            )

    def _render_correction(self, data: Dict[str, Any], level: int) -> AUIRenderPacket:
        original = data.get("original", "")
        corrected = data.get("corrected", "")
        explanation = data.get("explanation", "Here is the correction.")

        if level <= 1:
            # Level 1: Visual Diff + Simple Explanation
            return AUIRenderPacket(
                intention="explain_correction",
                ui=AUIComponent(
                    component="DiffCard",
                    props={
                        "original": original,
                        "corrected": corrected,
                        "label": "Correction",
                    },
                ),
                fallback_text=f"Correction: {original} -> {corrected}",
            )
        elif level == 2:
            # Level 2: Diff + Detailed explanation
            return AUIRenderPacket(
                intention="explain_correction",
                ui=AUIComponent(
                    # Using a Carousel or Composite component would be ideal here
                    # For now, let's use Markdown to show both
                    component="MarkdownMessage",
                    props={
                        "content": f"**Correction**\n\n❌ {original}\n✅ {corrected}\n\n**Why?**\n{explanation}"
                    },
                ),
                fallback_text=f"Correction: {original} -> {corrected}",
            )
        else:
            # Level 3: Socratic Hint (No direct correction)
            return AUIRenderPacket(
                intention="explain_correction",
                ui=AUIComponent(
                    component="MarkdownMessage",
                    props={
                        "content": f'**Hint**\n\nThere is a small error in: *"{original}"*.\n\nCould you try to rephrase it?'
                    },
                ),
                fallback_text=f"Hint: Check {original}",
            )


# Singleton Export
aui_renderer = AUIRenderer()
