import unittest
from unittest.mock import patch, AsyncMock
import socket
import sys
import os
import asyncio

# Add app to path
sys.path.insert(0, os.getcwd())

class TestSSRFProtection(unittest.TestCase):
    def test_validate_url_security_private_ip(self):
        try:
            from app.core.utils import validate_url_security
        except ImportError:
            self.fail("validate_url_security not implemented yet")

        # Mock getaddrinfo to return 127.0.0.1
        with patch('socket.getaddrinfo') as mock_getaddrinfo:
            # (family, type, proto, canonname, sockaddr)
            mock_getaddrinfo.return_value = [
                (socket.AF_INET, socket.SOCK_STREAM, 6, '', ('127.0.0.1', 80))
            ]

            with self.assertRaises(ValueError) as cm:
                validate_url_security("http://malicious.local/foo")
            self.assertIn("Private IP address rejected", str(cm.exception))

    def test_validate_url_security_public_ip(self):
        try:
            from app.core.utils import validate_url_security
        except ImportError:
            self.fail("validate_url_security not implemented yet")

        # Mock getaddrinfo to return 8.8.8.8
        with patch('socket.getaddrinfo') as mock_getaddrinfo:
            mock_getaddrinfo.return_value = [
                (socket.AF_INET, socket.SOCK_STREAM, 6, '', ('8.8.8.8', 80))
            ]

            # Should not raise
            validate_url_security("http://google.com")

    def test_podcast_service_ssrf_integration(self):
        """Verify that PodcastService.parse_feed calls validation."""
        from app.services.podcast_service import PodcastService

        # Mock validate_url_security to fail
        # Note: PodcastService calls it in asyncio.to_thread, so standard mock should work
        # if we patch where it is imported IN THE SERVICE module

        with patch('app.services.podcast_service.validate_url_security', side_effect=ValueError("Blocked by SSRF")):
            service = PodcastService()

            async def run_test():
                with self.assertRaises(ValueError) as cm:
                    await service.parse_feed("http://localhost/feed.xml")
                self.assertIn("Blocked by SSRF", str(cm.exception))

            asyncio.run(run_test())

if __name__ == '__main__':
    unittest.main()
