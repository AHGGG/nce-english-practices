import json
import re
import socket
import ipaddress
from urllib.parse import urlparse
from typing import Dict, List, Union, Any
from fastapi import HTTPException

# Safe pattern: Alphanumeric, common punctuation, safe symbols.
# Allows: ( ) [ ] - good for text content
# Blocks: < > { } - potential HTML/JS/Template injection vectors
SAFE_INPUT_PATTERN = r'^[\w\s\.,!?\'\";:()\-&%+=/@$*\[\]#~]+$'


def validate_input(
    text: str,
    field_name: str = "Input",
    pattern: str = SAFE_INPUT_PATTERN,
    max_length: int = 1000,
) -> str:
    """
    Validates that the input text matches the safe pattern and length limits.
    Raises HTTPException(400) if validation fails.
    """
    if not text:
        return text

    if len(text) > max_length:
        raise HTTPException(
            status_code=400, detail=f"{field_name} exceeds maximum length of {max_length}"
        )

    if not re.match(pattern, text):
        raise HTTPException(status_code=400, detail=f"{field_name} contains invalid characters")

    return text


def validate_url_security(url: str) -> None:
    """
    Validates that a URL does not resolve to a private or loopback IP address (SSRF protection).
    Raises ValueError if the URL is unsafe.
    """
    try:
        parsed = urlparse(url)
        hostname = parsed.hostname
        if not hostname:
            raise ValueError("Invalid URL: No hostname found")

        # Get all addresses (IPv4 and IPv6)
        # Note: This is blocking, so caller should run in threadpool if async
        addr_info = socket.getaddrinfo(hostname, None)

        for family, type, proto, canonname, sockaddr in addr_info:
            ip_str = sockaddr[0]
            try:
                ip = ipaddress.ip_address(ip_str)
            except ValueError:
                continue

            if ip.is_private or ip.is_loopback or ip.is_link_local:
                raise ValueError(f"Access to private/local IP {ip_str} is forbidden")
            # Also block unspecified addresses (0.0.0.0)
            if ip.is_unspecified:
                raise ValueError(f"Access to unspecified IP {ip_str} is forbidden")

    except socket.gaierror:
        # DNS resolution failed. We pass here because the subsequent HTTP request
        # will likely also fail to resolve, effectively blocking it.
        # Blocking here would prevent valid transient DNS failures from being retried by the client.
        pass
    except ValueError:
        raise
    except Exception as e:
        # Default fail-closed for other errors
        raise ValueError(f"URL validation failed: {str(e)}")


def parse_llm_json(content: str) -> Union[Dict[str, Any], List[Any]]:
    """
    Parses JSON from an LLM response, handling markdown code blocks.
    """
    cleaned = content.strip()

    # Remove markdown code blocks if present
    # regex matches ```json ... ``` or just ``` ... ```
    # flags=re.DOTALL matches across newlines
    match = re.search(r"```(?:json)?\s*(.*?)```", cleaned, re.DOTALL)
    if match:
        cleaned = match.group(1).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        # Fallback: sometimes there's extra text before/after the JSON but no code blocks.
        # Try to find the first { or [ and the last } or ]
        try:
            # Find start/end
            start_idx = cleaned.find("{")
            list_start_idx = cleaned.find("[")

            # If both found, take the earlier one, but ignore if -1
            if list_start_idx != -1 and (start_idx == -1 or list_start_idx < start_idx):
                start_idx = list_start_idx
                end_char = "]"
            else:
                end_char = "}"

            if start_idx != -1:
                end_idx = cleaned.rfind(end_char)
                if end_idx != -1 and end_idx > start_idx:
                    candidate = cleaned[start_idx : end_idx + 1]
                    return json.loads(candidate)
        except json.JSONDecodeError:
            pass

        # Re-raise original error if fallback fails
        raise RuntimeError(
            f"Failed to parse LLM JSON: {e}. Content snippet: {cleaned[:100]}..."
        ) from e
