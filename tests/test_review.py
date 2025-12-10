import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from app.services.review import process_review_result
from app.db_models import SRSSchedule

@pytest.mark.asyncio
async def test_review_first_success():
    with patch("app.services.review.AsyncSessionLocal") as mock_session_cls:
        # Mock Session
        mock_session = AsyncMock()
        mock_session_cls.return_value.__aenter__.return_value = mock_session

        # Mock DB Result
        mock_schedule = SRSSchedule(
            note_id=1,
            interval_days=0,
            ease_factor=2.5,
            repetitions=0
        )
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_schedule
        mock_session.execute.return_value = mock_result

        with patch("app.services.review.update_srs_schedule", new_callable=AsyncMock) as mock_update:
            result = await process_review_result(note_id=1, quality=4)

            assert result is not None
            mock_update.assert_called_once()
            args, _ = mock_update.call_args
            # args: note_id, next_due, new_interval, new_ease, new_reps
            assert args[0] == 1
            assert args[2] == 1 # interval 1
            assert args[4] == 1 # reps 1

@pytest.mark.asyncio
async def test_review_second_success():
    with patch("app.services.review.AsyncSessionLocal") as mock_session_cls:
        mock_session = AsyncMock()
        mock_session_cls.return_value.__aenter__.return_value = mock_session

        mock_schedule = SRSSchedule(
            note_id=1,
            interval_days=1,
            ease_factor=2.5,
            repetitions=1
        )
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_schedule
        mock_session.execute.return_value = mock_result

        with patch("app.services.review.update_srs_schedule", new_callable=AsyncMock) as mock_update:
            await process_review_result(note_id=1, quality=4)

            args, _ = mock_update.call_args
            assert args[2] == 6 # interval 6
            assert args[4] == 2

@pytest.mark.asyncio
async def test_review_failure():
    with patch("app.services.review.AsyncSessionLocal") as mock_session_cls:
        mock_session = AsyncMock()
        mock_session_cls.return_value.__aenter__.return_value = mock_session

        mock_schedule = SRSSchedule(
            note_id=1,
            interval_days=10,
            ease_factor=2.5,
            repetitions=5
        )
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_schedule
        mock_session.execute.return_value = mock_result

        with patch("app.services.review.update_srs_schedule", new_callable=AsyncMock) as mock_update:
            await process_review_result(note_id=1, quality=2)

            args, _ = mock_update.call_args
            assert args[2] == 1 # interval reset
            assert args[4] == 0 # reps reset

@pytest.mark.asyncio
async def test_review_not_found():
    with patch("app.services.review.AsyncSessionLocal") as mock_session_cls:
        mock_session = AsyncMock()
        mock_session_cls.return_value.__aenter__.return_value = mock_session

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result

        result = await process_review_result(note_id=999, quality=4)
        assert result is None
