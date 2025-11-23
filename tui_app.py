from __future__ import annotations

import asyncio
from typing import Dict, List, Optional, Tuple

from rich.table import Table
from rich.text import Text
from textual.app import App, ComposeResult
from textual.containers import Container, Horizontal, Vertical
from textual.widgets import Button, Footer, Header, Input, ListView, ListItem, Label, RadioSet, RadioButton, Static

from models import SelectionState
from practice_core import (
    TENSE_COLUMNS,
    export_matrix_csv,
    grade_sentence,
    log_matrix_attempt,
)
from sentence_generator import ensure_sentences, clear_topic_cache, TIME_LAYERS, WH_WORDS
from theme_vocab import ThemeVocabulary, ensure_theme


def selection_from_vocab(vocab: ThemeVocabulary) -> SelectionState:
    slots = {key: list(values) for key, values in vocab.slots.items()}
    verbs = list(vocab.verbs)
    return SelectionState(topic=vocab.topic, slots=slots, verbs=verbs)


class PracticeApp(App):
    CSS_PATH = "tui.css"
    BINDINGS = [("ctrl+c", "quit", "Quit")]

    def __init__(self, ensure_theme, client, check_model, **kwargs):
        super().__init__(**kwargs)
        self._ensure_theme = ensure_theme
        self._client = client
        self._check_model = check_model
        self.state: Optional[SelectionState] = None
        self.sentence_cache: Dict[str, Dict] = {}  # Cache by time_layer
        self.cell_scores: Dict[Tuple[str, str], Dict] = {}
        self.tense_options = [col["key"] for col in TENSE_COLUMNS]
        self.form_options = ["affirmative", "negative", "question", "special_question"]
        self.wh_options = ["when", "where", "how", "why", "who"]
        self.active_tense = self.tense_options[0]
        self.active_form = self.form_options[0]
        self.active_wh_word = self.wh_options[0]
        self.model_available = False
        self.model_message = "Checking model..."
        self.current_time_layer = "present"  # Default time layer

    def compose(self) -> ComposeResult:
        yield Header()
        with Container(id="app-shell"):
            yield Static("Checking model status…", id="status-bar")
            with Horizontal(id="theme-bar"):
                yield Input(placeholder="Topic", id="topic-input", disabled=True)
                yield Button("Load", id="load-topic", disabled=True)
                yield Button("🎲", id="shuffle-words", variant="primary", disabled=True)
                yield Button("CSV", id="export-btn", disabled=True)
                yield Button("Check", id="check-model")
            yield Static("English order: Subject → Verb → Object → Manner → Place → Time", id="order-info")
            with Container(id="workspace"):
                with Vertical(id="matrix-panel"):
                    yield Static("Practice Panel", id="matrix-title")
                    yield Static("Load a topic to see practice sentences.", id="matrix-output")
                    with Horizontal(id="controls"):
                        with Vertical(id="tense-selector"):
                            yield Static("Select Tense:", id="tense-label")
                            with ListView(id="tense-list"):
                                for col in TENSE_COLUMNS:
                                    yield ListItem(Label(col["label"]), id=f"tense-{col['key']}")
                        with Vertical(id="form-selector"):
                            yield Static("Sentence Type:", id="form-label")
                            with RadioSet(id="form-radio"):
                                for form in self.form_options:
                                    form_label = form.replace("_", " ").title()
                                    yield RadioButton(form_label, value=form == self.active_form, id=f"form-{form}")
                            yield Static("Wh-word (for special questions):", id="wh-label")
                            with RadioSet(id="wh-radio"):
                                for wh in self.wh_options:
                                    yield RadioButton(wh.upper(), value=wh == self.active_wh_word, id=f"wh-{wh}")
                    yield Input(placeholder="Type your answer and press Enter", id="answer-input", disabled=True)
                    yield Static("Feedback will appear here.", id="feedback")
        yield Footer()

    async def on_mount(self) -> None:
        await self.refresh_model_status()

    async def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "load-topic":
            await self.load_topic(refresh=False)
        elif event.button.id == "export-btn":
            self.export_matrix()
        elif event.button.id == "check-model":
            await self.refresh_model_status()
        elif event.button.id == "shuffle-words":
            self.shuffle_words()

    async def on_input_submitted(self, event: Input.Submitted) -> None:
        if event.input.id == "topic-input":
            await self.load_topic(refresh=False)
        elif event.input.id == "answer-input":
            await self.evaluate_answer(event.value)

    def on_list_view_selected(self, event: ListView.Selected) -> None:
        if event.list_view.id == "tense-list":
            item_id = event.item.id or ""
            if item_id.startswith("tense-"):
                tense_key = item_id.replace("tense-", "")
                self.active_tense = tense_key
                # Extract time_layer from tense_key (e.g., "past_simple" -> "past")
                new_time_layer = tense_key.split("_")[0] if "_" in tense_key else "present"
                if new_time_layer != self.current_time_layer:
                    self.current_time_layer = new_time_layer
                    # Load sentences for new time layer if not cached
                    asyncio.create_task(self.ensure_time_layer_sentences())
                else:
                    self.refresh_matrix()

    def on_radio_set_changed(self, event: RadioSet.Changed) -> None:
        if event.radio_set.id == "form-radio":
            pressed_id = event.pressed.id or ""
            if pressed_id.startswith("form-"):
                form = pressed_id.replace("form-", "")
                self.active_form = form
                self.refresh_matrix()
        elif event.radio_set.id == "wh-radio":
            pressed_id = event.pressed.id or ""
            if pressed_id.startswith("wh-"):
                wh = pressed_id.replace("wh-", "")
                self.active_wh_word = wh
                self.refresh_matrix()

    async def load_topic(self, refresh: bool = False) -> None:
        if not self.model_available and refresh:
            self.notify("Model unavailable. Cannot refresh theme.", severity="warning")
            return
        topic_input = self.query_one("#topic-input", Input)
        topic = topic_input.value.strip() or "general"
        self.notify(f"Loading vocabulary for '{topic}'...", severity="information")
        try:
            vocab = await asyncio.to_thread(self._ensure_theme, topic, self._client, refresh)
        except RuntimeError as exc:
            self.notify(str(exc), severity="error")
            return
        self.state = selection_from_vocab(vocab)
        self.cell_scores.clear()
        self.sentence_cache.clear()
        self.current_time_layer = "present"
        answer_input = self.query_one("#answer-input", Input)
        answer_input.disabled = False
        export_btn = self.query_one("#export-btn", Button)
        export_btn.disabled = False
        shuffle_btn = self.query_one("#shuffle-words", Button)
        shuffle_btn.disabled = False
        # Load initial sentences for present tense
        await self.ensure_time_layer_sentences()
        self.notify(f"Ready to practice '{vocab.topic}'.", severity="success")

    def shuffle_words(self) -> None:
        if not self.state:
            self.notify("Load a topic first.", severity="warning")
            return
        # Regenerate vocabulary from LLM
        asyncio.create_task(self.regenerate_vocabulary())

    async def regenerate_vocabulary(self) -> None:
        """Regenerate vocabulary for current topic using LLM."""
        if not self.state:
            return

        topic = self.state.topic
        self.notify(f"Generating new words for '{topic}'...", severity="information")

        try:
            # Build previous vocab from current state to avoid duplicates
            from theme_vocab import ThemeVocabulary
            previous_vocab = ThemeVocabulary(
                topic=topic,
                generated_at="",
                slots=self.state.slots,
                verbs=self.state.verbs
            )

            # Regenerate vocabulary from LLM (refresh=True) with previous words
            vocab = await asyncio.to_thread(self._ensure_theme, topic, self._client, True, previous_vocab)
            self.state = selection_from_vocab(vocab)

            # Clear all cached sentences
            self.sentence_cache.clear()
            self.cell_scores.clear()

            # Clear cached sentences on disk
            clear_topic_cache(topic)

            # Regenerate sentences for current time_layer
            await self.ensure_time_layer_sentences()

            self.notify("New words generated! Sentences refreshed.", severity="success")
        except Exception as exc:
            self.notify(f"Failed to regenerate: {exc}", severity="error")

    async def ensure_time_layer_sentences(self) -> None:
        """Ensure sentences for current time_layer are loaded."""
        if not self.state:
            return

        # Check if already cached
        if self.current_time_layer in self.sentence_cache:
            self.refresh_matrix()
            return

        # Show loading message
        matrix_static = self.query_one("#matrix-output", Static)
        matrix_static.update(f"Generating {self.current_time_layer} tense sentences...")

        sentence = self.state.build_sentence()
        try:
            sentences = await asyncio.to_thread(
                ensure_sentences,
                self.state.topic,
                self.current_time_layer,
                sentence.subject,
                sentence.verb_base,
                sentence.verb_past,
                sentence.verb_participle,
                sentence.object,
                sentence.manner,
                sentence.place,
                sentence.time,
                self._client,
                refresh=False,
            )
            self.sentence_cache[self.current_time_layer] = sentences
            self.refresh_matrix()
            self.notify(f"{self.current_time_layer.title()} sentences loaded!", severity="success")
        except Exception as exc:
            matrix_static.update(f"Error generating sentences: {exc}")
            self.notify(f"Failed to generate sentences: {exc}", severity="error")

    def refresh_matrix(self) -> None:
        if not self.state or self.current_time_layer not in self.sentence_cache:
            return
        matrix_static = self.query_one("#matrix-output", Static)
        matrix_static.update(self.render_matrix_table())

    def render_matrix_table(self) -> Table:
        # Show only the current tense column with all forms
        table = Table(show_header=True, header_style="bold cyan", title="Current Practice", expand=True)
        table.add_column("Sentence Type", style="bold", ratio=1)

        # Get current tense label and aspect
        current_col = next((col for col in TENSE_COLUMNS if col["key"] == self.active_tense), None)
        if not current_col:
            return table

        tense_label = current_col["label"]
        aspect = current_col["aspect"]  # simple, perfect, progressive, perfect_progressive
        table.add_column(tense_label, overflow="fold", ratio=3)

        # Get sentences from cache
        time_layer_data = self.sentence_cache.get(self.current_time_layer, {})
        aspect_data = time_layer_data.get(aspect, {})

        for form in self.form_options:
            form_label = form.replace("_", " ").title()

            # Get sentence from LLM-generated data
            if form == "special_question":
                # Use current wh-word for special questions
                sentence = aspect_data.get(self.active_wh_word, "")
            else:
                sentence = aspect_data.get(form, "")

            cell = Text(sentence or "Loading...")

            # Highlight current selection
            if form == self.active_form:
                cell.stylize("bold yellow on blue")
                form_label = f"► {form_label}"

            # Add score if available
            result = self.cell_scores.get((self.active_tense, form))
            if result and isinstance(result.get("score"), (int, float)):
                score_pct = result['score'] * 100
                score_style = "green" if score_pct >= 80 else "yellow" if score_pct >= 60 else "red"
                cell.append(f" [{score_style}]({score_pct:.0f}%)[/]")

            table.add_row(form_label, cell)

        return table

    async def evaluate_answer(self, text: str) -> None:
        if not (self.state and self.current_time_layer in self.sentence_cache):
            self.notify("Load a topic first.", severity="warning")
            return
        text = text.strip()
        if not text:
            return

        # Get expected sentence from cache
        current_col = next((col for col in TENSE_COLUMNS if col["key"] == self.active_tense), None)
        if not current_col:
            return

        aspect = current_col["aspect"]
        time_layer_data = self.sentence_cache.get(self.current_time_layer, {})
        aspect_data = time_layer_data.get(aspect, {})

        if self.active_form == "special_question":
            expected = aspect_data.get(self.active_wh_word, "")
        else:
            expected = aspect_data.get(self.active_form, "")

        if not expected:
            self.notify("Sentence not available.", severity="warning")
            return

        feedback = await asyncio.to_thread(grade_sentence, expected, text)
        self.cell_scores[(self.active_tense, self.active_form)] = feedback
        wh_word = self.active_wh_word if self.active_form == "special_question" else None
        log_matrix_attempt(self.state.snapshot(), self.active_tense, self.active_form, expected, text, feedback, wh_word)
        feedback_box = self.query_one("#feedback", Static)
        score = feedback.get("score")
        if isinstance(score, (int, float)):
            feedback_box.update(f"Score: {score:.2f}\n{feedback.get('feedback', '')}")
        else:
            feedback_box.update(feedback.get("feedback", ""))
        answer_input = self.query_one("#answer-input", Input)
        answer_input.value = ""
        self.refresh_matrix()

    def export_matrix(self) -> None:
        if not self.sentence_cache:
            self.notify("Nothing to export yet.", severity="warning")
            return
        # Build a matrix structure from sentence cache for export
        matrix = {}
        for time_layer, aspects in self.sentence_cache.items():
            for aspect, forms in aspects.items():
                key = f"{time_layer}_{aspect}"
                matrix[key] = {}
                for form_name, sentence in forms.items():
                    if form_name in ["affirmative", "negative", "question"]:
                        matrix[key][form_name] = sentence
                    elif form_name in WH_WORDS:
                        # Export special questions with wh-word prefix
                        matrix[key][f"special_question_{form_name}"] = sentence
        path = export_matrix_csv(matrix)
        self.notify(f"Sentences exported to {path}", severity="information")

    async def refresh_model_status(self) -> None:
        status_bar = self.query_one("#status-bar", Static)
        status_bar.update("Checking model status…")
        ok, message = await asyncio.to_thread(self._check_model) if self._check_model else (False, "No check function")
        self.model_available = ok
        self.model_message = message
        if ok:
            status_bar.update(f"[Model OK] {message}")
        else:
            status_bar.update(f"[Model ERROR] {message}")
            self.notify(f"Model unavailable: {message}", severity="warning")
        self.set_controls_enabled(ok)

    def set_controls_enabled(self, enabled: bool) -> None:
        ids = [
            "#topic-input",
            "#load-topic",
        ]
        for selector in ids:
            widget = self.query_one(selector)
            if hasattr(widget, "disabled"):
                widget.disabled = not enabled
