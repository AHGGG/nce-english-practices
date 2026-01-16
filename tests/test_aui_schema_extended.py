"""
Tests for extended AUI schema validation.
Covers the newly added component schemas: MarkdownMessage, DiffCard, TenseTimeline, TaskDashboard.
"""

import pytest
from pydantic import ValidationError

from app.services.aui_schema import (
    validate_component_props,
)


# --- MarkdownMessage Tests ---


class TestMarkdownMessageSchema:
    def test_valid_props(self):
        props = {"content": "Hello **world**!"}
        assert validate_component_props("MarkdownMessage", props) is True

    def test_missing_content(self):
        props = {}
        with pytest.raises(ValidationError):
            validate_component_props("MarkdownMessage", props)


# --- DiffCard Tests ---


class TestDiffCardSchema:
    def test_valid_props(self):
        props = {"original": "I goed", "corrected": "I went"}
        assert validate_component_props("DiffCard", props) is True

    def test_with_label(self):
        props = {"original": "bad", "corrected": "good", "label": "Grammar Fix"}
        assert validate_component_props("DiffCard", props) is True

    def test_missing_corrected(self):
        props = {"original": "I goed"}
        with pytest.raises(ValidationError):
            validate_component_props("DiffCard", props)


# --- TenseTimeline Tests ---


class TestTenseTimelineSchema:
    def test_valid_props(self):
        props = {"tense": "Present Perfect"}
        assert validate_component_props("TenseTimeline", props) is True

    def test_with_complexity(self):
        props = {"tense": "Past Simple", "complexity": "medium"}
        assert validate_component_props("TenseTimeline", props) is True

    def test_missing_tense(self):
        props = {"complexity": "high"}
        with pytest.raises(ValidationError):
            validate_component_props("TenseTimeline", props)


# --- TaskDashboard Tests ---


class TestTaskDashboardSchema:
    def test_valid_minimal_props(self):
        props = {"title": "Processing", "status": "running", "progress": 50.0}
        assert validate_component_props("TaskDashboard", props) is True

    def test_valid_full_props(self):
        props = {
            "title": "Data Import",
            "status": "completed",
            "progress": 100.0,
            "logs": ["Step 1 done", "Step 2 done"],
            "metrics": {"cpu": 45, "memory": 120},
            "tasks": [
                {"id": "t1", "name": "Fetch data", "status": "completed"},
                {"id": "t2", "name": "Process data", "status": "running"},
            ],
        }
        assert validate_component_props("TaskDashboard", props) is True

    def test_missing_status(self):
        props = {"title": "Test", "progress": 10.0}
        with pytest.raises(ValidationError):
            validate_component_props("TaskDashboard", props)

    def test_invalid_progress_type(self):
        props = {"title": "Test", "status": "idle", "progress": "fifty"}
        with pytest.raises(ValidationError):
            validate_component_props("TaskDashboard", props)
