import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.auth import authenticate_user, DUMMY_HASH

@pytest.mark.asyncio
async def test_authenticate_user_not_found_timing_fix():
    """
    Verify that authenticate_user calls verify_password with DUMMY_HASH
    when user is not found.
    """
    mock_db = AsyncMock()

    # Mock get_user_by_email to return None (User not found)
    with patch("app.services.auth.get_user_by_email", return_value=None) as mock_get_user:
        # Mock verify_password to verify it's called
        with patch("app.services.auth.verify_password") as mock_verify:

            result = await authenticate_user(mock_db, "nonexistent@example.com", "password")

            assert result is None

            # Verify verify_password was called with DUMMY_HASH
            mock_verify.assert_called_once_with("password", DUMMY_HASH)

@pytest.mark.asyncio
async def test_authenticate_user_found_wrong_password():
    """
    Verify that authenticate_user calls verify_password with user's hash
    when user is found but password is wrong.
    """
    mock_db = AsyncMock()
    mock_user = MagicMock()
    mock_user.hashed_password = "real_hash"

    with patch("app.services.auth.get_user_by_email", return_value=mock_user):
        with patch("app.services.auth.verify_password", return_value=False) as mock_verify:

            result = await authenticate_user(mock_db, "user@example.com", "wrong_password")

            assert result is None

            # Verify verify_password was called with real hash
            mock_verify.assert_called_once_with("wrong_password", "real_hash")
