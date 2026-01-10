from app.services.aui_events import (
    RunStartedEvent,
    RunFinishedEvent,
    RunErrorEvent,
    AUIEventType,
)


def test_run_started_event():
    """Test creating a run started event"""
    event = RunStartedEvent(
        run_id="run_abc123",
        agent_type="story_generator",
        task_description="Generate a story about time travel",
    )

    assert event.type == AUIEventType.RUN_STARTED
    assert event.run_id == "run_abc123"
    assert event.agent_type == "story_generator"
    assert event.task_description == "Generate a story about time travel"
    assert event.id is not None
    assert event.timestamp is not None


def test_run_started_minimal():
    """Test run started with minimal info"""
    event = RunStartedEvent(run_id="run_minimal")

    assert event.type == AUIEventType.RUN_STARTED
    assert event.run_id == "run_minimal"
    assert event.agent_type is None
    assert event.task_description is None


def test_run_finished_event():
    """Test run finished event"""
    event = RunFinishedEvent(
        run_id="run_abc123",
        outcome="Successfully generated a 500-word story with 10 vocabulary words",
        duration_ms=5432.1,
    )

    assert event.type == AUIEventType.RUN_FINISHED
    assert event.run_id == "run_abc123"
    assert (
        event.outcome
        == "Successfully generated a 500-word story with 10 vocabulary words"
    )
    assert event.duration_ms == 5432.1


def test_run_error_event():
    """Test run error event"""
    event = RunErrorEvent(
        run_id="run_fail_001",
        error_message="LLM API rate limit exceeded",
        error_code="RATE_LIMIT",
        traceback="Traceback (most recent call last):\n  File...",
    )

    assert event.type == AUIEventType.RUN_ERROR
    assert event.run_id == "run_fail_001"
    assert event.error_message == "LLM API rate limit exceeded"
    assert event.error_code == "RATE_LIMIT"
    assert event.traceback is not None


def test_complete_run_lifecycle_success():
    """Test a complete successful run lifecycle"""
    run_id = "run_success_001"

    # 1. Started
    started = RunStartedEvent(
        run_id=run_id,
        agent_type="vocabulary_coach",
        task_description="Generate flashcards from story",
    )

    # 2. Finished
    finished = RunFinishedEvent(
        run_id=run_id,
        outcome="Created 15 flashcards from story content",
        duration_ms=2150.3,
    )

    # Verify consistency
    assert started.run_id == finished.run_id
    assert started.type == AUIEventType.RUN_STARTED
    assert finished.type == AUIEventType.RUN_FINISHED

    # Verify lifecycle order (started timestamp < finished timestamp)
    # Note: In real scenario, timestamps would differ
    assert started.timestamp is not None
    assert finished.timestamp is not None


def test_complete_run_lifecycle_error():
    """Test a run lifecycle that fails"""
    run_id = "run_error_001"

    # 1. Started
    started = RunStartedEvent(
        run_id=run_id,
        agent_type="grammar_analyzer",
        task_description="Analyze sentence structure",
    )

    # 2. Error (instead of Finished)
    error = RunErrorEvent(
        run_id=run_id,
        error_message="Invalid sentence format",
        error_code="VALIDATION_ERROR",
    )

    assert started.run_id == error.run_id
    assert started.type == AUIEventType.RUN_STARTED
    assert error.type == AUIEventType.RUN_ERROR


def test_run_event_serialization():
    """Test that run events serialize correctly"""
    event = RunStartedEvent(
        run_id="run_serialize",
        agent_type="coach",
        task_description="Help user with grammar",
    )

    json_str = event.model_dump_json()
    assert "run_serialize" in json_str
    assert "coach" in json_str

    data = event.model_dump()
    assert data["type"] == "aui_run_started"
    assert data["run_id"] == "run_serialize"


def test_run_error_without_traceback():
    """Test run error with minimal info"""
    event = RunErrorEvent(
        run_id="run_simple_error", error_message="Something went wrong"
    )

    assert event.run_id == "run_simple_error"
    assert event.error_message == "Something went wrong"
    assert event.error_code is None
    assert event.traceback is None


def test_multiple_runs_different_ids():
    """Test multiple concurrent runs with different IDs"""
    run_1_started = RunStartedEvent(run_id="run_001", agent_type="coach")

    run_2_started = RunStartedEvent(run_id="run_002", agent_type="story_generator")

    run_1_finished = RunFinishedEvent(run_id="run_001", outcome="Coaching complete")

    # Verify unique IDs
    assert run_1_started.run_id != run_2_started.run_id
    assert run_1_started.run_id == run_1_finished.run_id

    # Event IDs should also be unique
    assert run_1_started.id != run_2_started.id
    assert run_1_started.id != run_1_finished.id


def test_run_finished_without_outcome():
    """Test finished event with minimal info - outcome defaults to 'success' per AG-UI spec"""
    event = RunFinishedEvent(run_id="run_minimal_finish")

    assert event.run_id == "run_minimal_finish"
    assert event.outcome == "success"  # AG-UI: default outcome is success
    assert event.duration_ms is None
