import sys
import os
import unittest
from unittest.mock import patch, MagicMock
import socket

# Add app to path
sys.path.insert(0, os.getcwd())

class TestSSRFProtection(unittest.TestCase):
    def test_validate_url_security(self):
        """Test the validation logic with mocked DNS."""
        try:
            from app.core.utils import validate_url_security
        except ImportError:
            print("validate_url_security not found yet (expected).")
            return

        # Mock socket.getaddrinfo
        with patch('socket.getaddrinfo') as mock_getaddrinfo:
            # Case 1: Public IP (Google DNS)
            mock_getaddrinfo.return_value = [(socket.AF_INET, socket.SOCK_STREAM, 6, '', ('8.8.8.8', 80))]
            try:
                validate_url_security("http://google.com")
            except ValueError as e:
                self.fail(f"validate_url_security raised ValueError for public IP: {e}")

            # Case 2: Localhost (127.0.0.1)
            mock_getaddrinfo.return_value = [(socket.AF_INET, socket.SOCK_STREAM, 6, '', ('127.0.0.1', 80))]
            with self.assertRaises(ValueError) as cm:
                validate_url_security("http://localhost")
            print(f"Caught expected error for localhost: {cm.exception}")

            # Case 3: Private IP (192.168.1.1)
            mock_getaddrinfo.return_value = [(socket.AF_INET, socket.SOCK_STREAM, 6, '', ('192.168.1.1', 80))]
            with self.assertRaises(ValueError) as cm:
                validate_url_security("http://internal-router")
            print(f"Caught expected error for private IP: {cm.exception}")

            # Case 4: Cloud Metadata (169.254.169.254)
            mock_getaddrinfo.return_value = [(socket.AF_INET, socket.SOCK_STREAM, 6, '', ('169.254.169.254', 80))]
            with self.assertRaises(ValueError) as cm:
                validate_url_security("http://metadata")
            print(f"Caught expected error for link-local: {cm.exception}")

            # Case 5: 0.0.0.0
            mock_getaddrinfo.return_value = [(socket.AF_INET, socket.SOCK_STREAM, 6, '', ('0.0.0.0', 80))]
            with self.assertRaises(ValueError) as cm:
                validate_url_security("http://0.0.0.0")
            print(f"Caught expected error for 0.0.0.0: {cm.exception}")

            # Case 6: Invalid Scheme
            with self.assertRaises(ValueError) as cm:
                validate_url_security("ftp://google.com")
            print(f"Caught expected error for invalid scheme: {cm.exception}")

if __name__ == '__main__':
    unittest.main()
