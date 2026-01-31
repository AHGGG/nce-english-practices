import pytest
from unittest.mock import patch, MagicMock
from app.core.utils import validate_url_security

def test_validate_url_security_valid_public_ip():
    with patch("socket.getaddrinfo") as mock_getaddrinfo:
        # 8.8.8.8 is Google Public DNS
        mock_getaddrinfo.return_value = [
            (2, 1, 6, '', ('8.8.8.8', 80))
        ]
        validate_url_security("http://google.com")

def test_validate_url_security_private_ip():
    with patch("socket.getaddrinfo") as mock_getaddrinfo:
        # 192.168.1.1 is Private
        mock_getaddrinfo.return_value = [
            (2, 1, 6, '', ('192.168.1.1', 80))
        ]
        with pytest.raises(ValueError, match="Access to private/local IP"):
            validate_url_security("http://internal-router")

def test_validate_url_security_loopback_ip():
    with patch("socket.getaddrinfo") as mock_getaddrinfo:
        # 127.0.0.1 is Loopback
        mock_getaddrinfo.return_value = [
            (2, 1, 6, '', ('127.0.0.1', 80))
        ]
        with pytest.raises(ValueError, match="Access to private/local IP"):
            validate_url_security("http://localhost")

def test_validate_url_security_unspecified_ip():
    with patch("socket.getaddrinfo") as mock_getaddrinfo:
        # 0.0.0.0 is Unspecified
        mock_getaddrinfo.return_value = [
            (2, 1, 6, '', ('0.0.0.0', 80))
        ]
        # 0.0.0.0 is considered private/reserved
        with pytest.raises(ValueError, match="Access to private/local IP"):
            validate_url_security("http://0.0.0.0")

def test_validate_url_security_ipv6_loopback():
    with patch("socket.getaddrinfo") as mock_getaddrinfo:
        # ::1 is Loopback
        mock_getaddrinfo.return_value = [
            (10, 1, 6, '', ('::1', 80, 0, 0))
        ]
        with pytest.raises(ValueError, match="Access to private/local IP"):
            validate_url_security("http://localhost")

def test_validate_url_security_mixed_ips():
    # If one IP is private, it should block (fail closed)
    with patch("socket.getaddrinfo") as mock_getaddrinfo:
        mock_getaddrinfo.return_value = [
            (2, 1, 6, '', ('8.8.8.8', 80)),
            (2, 1, 6, '', ('127.0.0.1', 80))
        ]
        with pytest.raises(ValueError, match="Access to private/local IP"):
            validate_url_security("http://mixed-dns-entry")

def test_validate_url_security_dns_failure():
    # Should pass if DNS fails (let HTTP client handle/fail)
    with patch("socket.getaddrinfo") as mock_getaddrinfo:
        import socket
        mock_getaddrinfo.side_effect = socket.gaierror
        validate_url_security("http://nonexistent-domain.com")
