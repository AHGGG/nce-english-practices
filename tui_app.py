from __future__ import annotations

import asyncio
from typing import Dict, List, Optional, Tuple

from rich.table import Table
from rich.text import Text
from textual.app import App, ComposeResult
from textual.containers import Container, Horizontal, Vertical
from textual.widgets import Button, Footer, Header, Input, Select, Static

from models import SelectionState
from practice_core import (
    TENSE_GENERATORS,
    build_matrix,
    export_matrix_csv,
    grade_sentence,
    log_matrix_attempt,
)
from theme_vocab import ThemeVocabulary, ensure_theme


def selection_from_vocab(vocab: ThemeVocabulary) -> SelectionState:
    slots = {key: list(values) for key, values in vocab.slots.items()}
    verbs = list(vocab.verbs)
    return SelectionState(topic=vocab.topic, slots=slots, verbs=verbs)


class PracticeApp(App):
    CSS_PATH = "tui.css"
    BINDINGS = [("ctrl+c", "quit", "Quit")]

    def __init__(self, ensure_theme, client, **kwargs):
        super().__init__(**kwargs)
        self._ensure_theme = ensure_theme
        self._client = client
        self.state: Optional[SelectionState] = None
        self.matrix: Dict[str, Dict[str, str]] = {}
        self.cell_scores: Dict[Tuple[str, str], Dict] = {}
        self.tense_options = list(TENSE_GENERATORS.keys())
        self.form_options = ["affirmative", "negative", "question"]
        self.active_tense = self.tense_options[0]
        self.active_form = self.form_options[0]
        self.slot_order = ["subject", "object", "manner", "place", "time"]

    def compose(self) -> ComposeResult:
        yield Header()
        with Container(id="app-shell"):
            with Horizontal(id="theme-bar"):
                yield Input(placeholder="Enter a topic, e.g., travel abroad", id="topic-input")
                yield Button("Load Topic", id="load-topic")
                yield Button("Refresh", id="refresh-topic")
                yield Button("Export CSV", id="export-btn", disabled=True)
            yield Static("English order: Subject → Verb → Object → Manner → Place → Time", id="order-info")
            with Horizontal(id="workspace"):
                with Vertical(id="slots-panel"):
                    yield Static("Word Choices", id="slots-title")
                    for slot in self.slot_order:
                        yield Select([], prompt=f"{slot.title()}", allow_blank=True, id=f"slot-{slot}")
                    yield Select([], prompt="Verb", allow_blank=True, id="verb-select")
                with Vertical(id="matrix-panel"):
                    yield Static("Tense × Sentence Type", id="matrix-title")
                    yield Static("Load a topic to see practice sentences.", id="matrix-output")
                    with Horizontal(id="controls"):
                        tense_options = [(label.replace("_", " ").title(), label) for label in self.tense_options]
                        form_options = [(label.title(), label) for label in self.form_options]
                        yield Select(tense_options, allow_blank=False, value=self.active_tense, id="tense-select")
                        yield Select(form_options, allow_blank=False, value=self.active_form, id="form-select")
                    yield Input(placeholder="Type your answer and press Enter", id="answer-input", disabled=True)
                    yield Static("Feedback will appear here.", id="feedback")
        yield Footer()

    async def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "load-topic":
            await self.load_topic(refresh=False)
        elif event.button.id == "refresh-topic":
            await self.load_topic(refresh=True)
        elif event.button.id == "export-btn":
            self.export_matrix()

    async def on_input_submitted(self, event: Input.Submitted) -> None:
        if event.input.id == "topic-input":
            await self.load_topic(refresh=False)
        elif event.input.id == "answer-input":
            await self.evaluate_answer(event.value)

    def on_select_changed(self, event: Select.Changed) -> None:
        if not self.state or event.value in (None, Select.BLANK):
            return
        sid = event.select.id or ""
        if sid.startswith("slot-"):
            slot = sid.replace("slot-", "")
            try:
                self.state.selected_slot_index[slot] = int(event.value)
            except ValueError:
                self.state.selected_slot_index[slot] = 0
            self.cell_scores.clear()
            self.refresh_matrix()
        elif sid == "verb-select":
            try:
                self.state.selected_verb_index = int(event.value)
            except ValueError:
                self.state.selected_verb_index = 0
            self.cell_scores.clear()
            self.refresh_matrix()
        elif sid == "tense-select":
            self.active_tense = str(event.value)
            self.refresh_matrix()
        elif sid == "form-select":
            self.active_form = str(event.value)
            self.refresh_matrix()

    async def load_topic(self, refresh: bool = False) -> None:
        topic_input = self.query_one("#topic-input", Input)
        topic = topic_input.value.strip() or "general"
        self.notify(f"Loading vocabulary for '{topic}'...", severity="information")
        vocab = await asyncio.to_thread(self._ensure_theme, topic, self._client, refresh)
        self.state = selection_from_vocab(vocab)
        self.cell_scores.clear()
        self.populate_slot_selects()
        answer_input = self.query_one("#answer-input", Input)
        answer_input.disabled = False
        export_btn = self.query_one("#export-btn", Button)
        export_btn.disabled = False
        self.refresh_matrix()
        self.notify(f"Ready to practice '{vocab.topic}'.", severity="success")

    def populate_slot_selects(self) -> None:
        if not self.state:
            return
        for slot in self.slot_order:
            select = self.query_one(f"#slot-{slot}", Select)
            words = self.state.slots.get(slot, [])
            options = [(word, str(idx)) for idx, word in enumerate(words)]
            select.set_options(options or [("n/a", "0")])
            select.value = "0"
            self.state.selected_slot_index[slot] = 0
        verb_select = self.query_one("#verb-select", Select)
        options = [(verb.label(), str(idx)) for idx, verb in enumerate(self.state.verbs)]
        verb_select.set_options(options or [("study (studied, studied)", "0")])
        verb_select.value = "0"
        self.state.selected_verb_index = 0

    def refresh_matrix(self) -> None:
        if not self.state:
            return
        sentence = self.state.build_sentence()
        self.matrix = build_matrix(sentence)
        matrix_static = self.query_one("#matrix-output", Static)
        matrix_static.update(self.render_matrix_table())

    def render_matrix_table(self) -> Table:
        table = Table(show_header=True, header_style="bold cyan")
        table.add_column("Form \\ Tense", style="bold")
        for tense in self.tense_options:
            table.add_column(tense.replace("_", " ").title(), overflow="fold")
        for form in self.form_options:
            row: List[Text] = [Text(form.title(), style="bold")]
            for tense in self.tense_options:
                sentence = self.matrix.get(tense, {}).get(form, "")
                cell = Text(sentence or "")
                if (tense, form) == (self.active_tense, self.active_form):
                    cell.stylize("bold yellow")
                result = self.cell_scores.get((tense, form))
                if result and isinstance(result.get("score"), (int, float)):
                    cell.append(f"\n{result['score']*100:.0f}%")
                row.append(cell)
            table.add_row(*row)
        return table

    async def evaluate_answer(self, text: str) -> None:
        if not (self.state and self.matrix):
            self.notify("Load a topic first.", severity="warning")
            return
        text = text.strip()
        if not text:
            return
        expected = self.matrix[self.active_tense][self.active_form]
        feedback = await asyncio.to_thread(grade_sentence, expected, text)
        self.cell_scores[(self.active_tense, self.active_form)] = feedback
        log_matrix_attempt(self.state.snapshot(), self.active_tense, self.active_form, expected, text, feedback)
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
        if not self.matrix:
            self.notify("Nothing to export yet.", severity="warning")
            return
        path = export_matrix_csv(self.matrix)
        self.notify(f"Matrix exported to {path}", severity="information")
