#!/usr/bin/env python3
from __future__ import annotations

import argparse
from typing import Dict

from rich.console import Console
from rich.table import Table

from config import check_model_availability
from models import SelectionState
from practice_core import TENSE_COLUMNS, build_matrix, export_matrix_csv
from practice_core import client as llm_client
from theme_vocab import ThemeVocabulary, ensure_theme
from tui_app import PracticeApp

console = Console()


def selection_from_vocab(vocab: ThemeVocabulary) -> SelectionState:
    slots = {key: list(values) for key, values in vocab.slots.items()}
    verbs = list(vocab.verbs)
    return SelectionState(topic=vocab.topic, slots=slots, verbs=verbs)


def print_matrix(matrix: Dict[str, Dict[str, str]]) -> None:
    table = Table(title="Sentence Matrix", header_style="bold cyan")
    table.add_column("Form \\ Tense", style="bold", no_wrap=True)
    for column in TENSE_COLUMNS:
        table.add_column(column["label"], overflow="fold")

    for form in ["affirmative", "negative", "question"]:
        row = [form.title()]
        for column in TENSE_COLUMNS:
            row.append(matrix.get(column["key"], {}).get(form, ""))
        table.add_row(*row)
    console.print(table)


def matrix_demo(topic: str, refresh: bool = False) -> None:
    try:
        vocab = ensure_theme(topic, client=llm_client, refresh=refresh)
    except RuntimeError as exc:
        console.print(f"[red]Error:[/red] {exc}")
        return
    state = selection_from_vocab(vocab)
    matrix = build_matrix(state.build_sentence())
    print_matrix(matrix)


def export_topic(topic: str, refresh: bool = False) -> None:
    try:
        vocab = ensure_theme(topic, client=llm_client, refresh=refresh)
    except RuntimeError as exc:
        console.print(f"[red]Error:[/red] {exc}")
        return
    state = selection_from_vocab(vocab)
    matrix = build_matrix(state.build_sentence())
    path = export_matrix_csv(matrix)
    console.print(f"[green]CSV exported to[/green] {path}")


def launch_app() -> None:
    app = PracticeApp(
        ensure_theme=ensure_theme,
        client=llm_client,
        check_model=lambda: check_model_availability(llm_client),
    )
    app.run()


def main() -> None:
    parser = argparse.ArgumentParser(description="NCE English tense practice.")
    parser.add_argument("--matrix-demo", metavar="TOPIC", help="Print tense matrix for topic.")
    parser.add_argument("--export", metavar="TOPIC", help="Export CSV for topic.")
    parser.add_argument("--refresh", action="store_true", help="Regenerate vocabulary for the topic.")
    args = parser.parse_args()

    if args.matrix_demo:
        matrix_demo(args.matrix_demo, refresh=args.refresh)
        return
    if args.export:
        export_topic(args.export, refresh=args.refresh)
        return
    launch_app()


if __name__ == "__main__":
    main()
