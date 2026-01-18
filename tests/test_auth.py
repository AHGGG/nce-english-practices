"""
Tests for authentication system.
"""
import pytest
from app.services.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token,
)


def test_password_hashing():
    """Test password hashing and verification."""
    password = "testpassword123"
    hashed = get_password_hash(password)
    
    # Hash should not be the same as password
    assert hashed != password
    
    # Verification should work
    assert verify_password(password, hashed) is True
    
    # Wrong password should fail
    assert verify_password("wrongpassword", hashed) is False


def test_access_token_creation():
    """Test access token creation and verification."""
    # JWT sub claim must be a string
    data = {"sub": "1", "email": "test@example.com", "role": "user"}
    
    token, expiry = create_access_token(data)
    
    # Token should be a string
    assert isinstance(token, str)
    assert len(token) > 0
    
    # Should be verifiable as access token
    token_data = verify_token(token, expected_type="access")
    assert token_data is not None
    assert token_data.user_id == 1
    assert token_data.email == "test@example.com"
    assert token_data.role == "user"
    
    # Should fail verification as refresh token
    assert verify_token(token, expected_type="refresh") is None


def test_refresh_token_creation():
    """Test refresh token creation and verification."""
    # JWT sub claim must be a string
    data = {"sub": "2", "email": "test2@example.com", "role": "admin"}
    
    token, expiry = create_refresh_token(data)
    
    # Should be verifiable as refresh token
    token_data = verify_token(token, expected_type="refresh")
    assert token_data is not None
    assert token_data.user_id == 2
    assert token_data.email == "test2@example.com"
    assert token_data.role == "admin"
    
    # Should fail verification as access token
    assert verify_token(token, expected_type="access") is None


def test_invalid_token():
    """Test that invalid tokens are rejected."""
    # Gibberish token
    assert verify_token("notavalidtoken") is None
    
    # Empty token
    assert verify_token("") is None
