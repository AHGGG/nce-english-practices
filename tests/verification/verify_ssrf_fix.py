import sys
import os
import unittest
import socket
from unittest.mock import patch
from fastapi import HTTPException

# Add app to path
sys.path.insert(0, os.getcwd())

from app.core.utils import validate_url_security

class TestSSRFSecurity(unittest.TestCase):
    def test_validate_url_success(self):
        """Test that a public IP is allowed."""
        with patch("socket.getaddrinfo") as mock_dns:
            # Simulate DNS returning a public IP (e.g., 8.8.8.8)
            mock_dns.return_value = [
                (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("8.8.8.8", 80))
            ]

            # Should not raise
            validate_url_security("http://google.com")

    def test_validate_url_private_ip(self):
        """Test that a private IP is blocked."""
        with patch("socket.getaddrinfo") as mock_dns:
            # Simulate DNS returning a private IP (e.g., 192.168.1.1)
            mock_dns.return_value = [
                (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("192.168.1.1", 80))
            ]

            with self.assertRaises(HTTPException) as cm:
                validate_url_security("http://internal-service")

            self.assertEqual(cm.exception.status_code, 400)
            self.assertIn("Blocked restricted IP", cm.exception.detail)

    def test_validate_url_loopback(self):
        """Test that loopback is blocked."""
        with patch("socket.getaddrinfo") as mock_dns:
            mock_dns.return_value = [
                (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 80))
            ]

            with self.assertRaises(HTTPException) as cm:
                validate_url_security("http://localhost")

            self.assertEqual(cm.exception.status_code, 400)

    def test_validate_url_ipv6_private(self):
        """Test that IPv6 unique local address is blocked."""
        with patch("socket.getaddrinfo") as mock_dns:
            # fc00::/7 is unique local (private)
            mock_dns.return_value = [
                (socket.AF_INET6, socket.SOCK_STREAM, 6, "", ("fc00::1", 80, 0, 0))
            ]

            with self.assertRaises(HTTPException) as cm:
                validate_url_security("http://ipv6-internal")

            self.assertEqual(cm.exception.status_code, 400)

    def test_validate_url_scheme(self):
        """Test that non-http/https schemes are blocked."""
        with self.assertRaises(HTTPException) as cm:
            validate_url_security("ftp://example.com")
        self.assertIn("Invalid URL scheme", cm.exception.detail)

if __name__ == "__main__":
    unittest.main()
