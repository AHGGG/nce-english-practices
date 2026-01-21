import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from app.services.auth import authenticate_user, get_password_hash, DUMMY_HASH, verify_password
from app.models.orm import User
from sqlalchemy import select, update

@pytest.mark.asyncio
async def test_auth_locking(db_session):
    """
    Test that account locking works correctly after 5 failed attempts.
    """
    # Create test user
    email = "test_locking@example.com"
    password = "correctpassword"

    user = User(
        email=email,
        hashed_password=get_password_hash(password),
        username="test_locking",
        failed_login_attempts=0,
        locked_until=None
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    # Attempt 1-5: Failures
    for i in range(1, 6):
        result = await authenticate_user(db_session, email, "wrongpassword")
        assert result is None

        # Verify attempt count incremented
        # Need to refresh from DB to see changes made by service
        # Note: authenticate_user commits its changes, but we share the session?
        # If authenticate_user commits, it might expire objects.
        # We need to re-fetch or refresh.
        await db_session.refresh(user)
        assert user.failed_login_attempts == i

        if i < 5:
            assert user.locked_until is None

    # After 5th attempt, should be locked
    assert user.locked_until is not None
    # Check it's roughly 15 mins in future
    now = datetime.now(timezone.utc)
    expected_unlock = now + timedelta(minutes=15)

    # Handle offset-naive vs offset-aware comparison
    locked_until = user.locked_until
    if locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)

    # Allow 1 minute variance
    assert expected_unlock - timedelta(minutes=1) < locked_until < expected_unlock + timedelta(minutes=1)

    # Attempt 6: Still locked, even if password correct?
    # authenticate_user returns None if locked
    # But wait, authenticate_user checks lock *inside*.

    # Try with CORRECT password while locked
    result = await authenticate_user(db_session, email, password)
    assert result is None # Should be blocked

    # Verify attempts didn't reset
    await db_session.refresh(user)
    assert user.failed_login_attempts == 5 # Should stay same or increment? Logic says: if locked, return None.
    # My code: if locked, verify password (mitigation) then return None.
    # It does NOT increment attempts if already locked in the check block.

    # Manually unlock
    user.locked_until = None
    user.failed_login_attempts = 0 # authenticate_user resets this on success
    await db_session.commit()

    # Try success
    result = await authenticate_user(db_session, email, password)
    assert result is not None
    assert result.email == email

@pytest.mark.asyncio
async def test_timing_mitigation_constant(db_session):
    """
    Verify DUMMY_HASH is valid and works.
    """
    assert DUMMY_HASH.startswith("$2b$")
    # Verify it handles a password check (should return False)
    assert not verify_password("wrong", DUMMY_HASH)
