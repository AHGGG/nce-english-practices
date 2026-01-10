"""
Tests for StateSnapshotEvent with activities field for rehydration.
"""


from app.services.aui_events import (
    StateSnapshotEvent,
    AUIEventType,
)


class TestStateSnapshotActivities:
    def test_snapshot_without_activities(self):
        """Ensure backward compatibility - activities is optional."""
        event = StateSnapshotEvent(
            state={"component": "StoryReader", "props": {"story": {"title": "Test"}}}
        )
        assert event.type == AUIEventType.STATE_SNAPSHOT
        assert event.activities is None

    def test_snapshot_with_activities(self):
        """Verify activities can be included for rehydration."""
        activities = [
            {
                "activity_id": "act_123",
                "name": "Loading Story",
                "status": "running",
                "progress": 0.5,
                "current_step": "Fetching content...",
            }
        ]
        event = StateSnapshotEvent(
            state={"component": "StoryReader", "props": {}},
            activities=activities,
        )
        assert event.activities == activities
        assert len(event.activities) == 1
        assert event.activities[0]["progress"] == 0.5

    def test_snapshot_serialization_with_activities(self):
        """Ensure proper JSON serialization."""
        activities = [
            {
                "activity_id": "a1",
                "name": "Task 1",
                "status": "completed",
                "progress": 1.0,
            }
        ]
        event = StateSnapshotEvent(
            state={"component": "VocabGrid", "props": {"words": []}},
            activities=activities,
        )
        data = event.model_dump()

        assert "activities" in data
        assert data["activities"][0]["activity_id"] == "a1"
        assert data["type"] == "aui_state_snapshot"
