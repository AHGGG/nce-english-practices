from app.services.aui_events import (
    ActivitySnapshotEvent,
    ActivityDeltaEvent,
    create_activity_delta,
    AUIEventType,
)
import jsonpatch
import copy


def test_activity_snapshot_creation():
    """Test creating an activity snapshot event"""
    event = ActivitySnapshotEvent(
        activity_id="act_123",
        name="Generating story",
        status="running",
        progress=0.5,
        current_step="Step 3/5: Building vocabulary",
    )

    assert event.type == AUIEventType.ACTIVITY_SNAPSHOT
    assert event.activity_id == "act_123"
    assert event.name == "Generating story"
    assert event.status == "running"
    assert event.progress == 0.5
    assert event.current_step == "Step 3/5: Building vocabulary"
    assert event.id is not None  # Auto-generated
    assert event.timestamp is not None


def test_activity_delta_creation():
    """Test creating an activity delta event manually"""
    delta = [
        {"op": "replace", "path": "/progress", "value": 0.75},
        {"op": "replace", "path": "/current_step", "value": "Step 4/5"},
    ]

    event = ActivityDeltaEvent(activity_id="act_123", delta=delta)

    assert event.type == AUIEventType.ACTIVITY_DELTA
    assert event.activity_id == "act_123"
    assert len(event.delta) == 2
    assert event.delta[0]["op"] == "replace"
    assert event.delta[0]["path"] == "/progress"
    assert event.delta[0]["value"] == 0.75


def test_create_activity_delta_helper():
    """Test activity delta helper function"""
    old_state = {
        "name": "Generating story",
        "status": "running",
        "progress": 0.25,
        "current_step": "Step 1/4",
    }

    new_state = {
        "name": "Generating story",
        "status": "running",
        "progress": 0.5,
        "current_step": "Step 2/4",
    }

    event = create_activity_delta("act_456", old_state, new_state)

    assert isinstance(event, ActivityDeltaEvent)
    assert event.activity_id == "act_456"
    assert len(event.delta) == 2  # Changed progress and current_step

    # Verify patch application
    patched = jsonpatch.apply_patch(copy.deepcopy(old_state), event.delta)
    assert patched["progress"] == 0.5
    assert patched["current_step"] == "Step 2/4"


def test_activity_progress_sequence():
    """Test realistic activity progress sequence"""
    # Initial state
    state = {
        "name": "Data Processing",
        "status": "idle",
        "progress": 0.0,
        "current_step": None,
    }

    # Step 1: Start
    new_state_1 = {**state, "status": "running", "current_step": "Loading data"}
    event_1 = create_activity_delta("act_proc", state, new_state_1)
    state = jsonpatch.apply_patch(state, event_1.delta)
    assert state["status"] == "running"

    # Step 2: Progress update
    new_state_2 = {**state, "progress": 0.33, "current_step": "Processing batch 1/3"}
    event_2 = create_activity_delta("act_proc", state, new_state_2)
    state = jsonpatch.apply_patch(state, event_2.delta)
    assert state["progress"] == 0.33

    # Step 3: More progress
    new_state_3 = {**state, "progress": 0.66, "current_step": "Processing batch 2/3"}
    event_3 = create_activity_delta("act_proc", state, new_state_3)
    state = jsonpatch.apply_patch(state, event_3.delta)
    assert state["progress"] == 0.66

    # Step 4: Complete
    new_state_4 = {
        **state,
        "progress": 1.0,
        "status": "completed",
        "current_step": "Done",
    }
    event_4 = create_activity_delta("act_proc", state, new_state_4)
    state = jsonpatch.apply_patch(state, event_4.delta)
    assert state["status"] == "completed"
    assert state["progress"] == 1.0


def test_activity_snapshot_serialization():
    """Test that events can be serialized to JSON"""
    event = ActivitySnapshotEvent(
        activity_id="test_123",
        name="Test Activity",
        status="running",
        progress=0.4,
        metadata={"source": "test"},
    )

    # Pydantic model_dump_json
    json_str = event.model_dump_json()
    assert "test_123" in json_str
    assert "Test Activity" in json_str

    # Should be parsable back
    data = event.model_dump()
    assert data["type"] == "aui_activity_snapshot"
    assert data["activity_id"] == "test_123"


def test_activity_with_metadata():
    """Test activity events with custom metadata"""
    event = ActivitySnapshotEvent(
        activity_id="act_meta",
        name="Complex Task",
        status="running",
        progress=0.6,
        metadata={
            "estimated_time_remaining": 120,
            "items_processed": 60,
            "items_total": 100,
            "worker_id": "worker_5",
        },
    )

    assert event.metadata is not None
    assert event.metadata["items_processed"] == 60
    assert event.metadata["worker_id"] == "worker_5"


def test_activity_no_change_delta():
    """Test that identical states produce minimal delta"""
    state = {"name": "Task", "status": "running", "progress": 0.5}

    event = create_activity_delta("act_same", state, state)
    assert len(event.delta) == 0  # No changes
