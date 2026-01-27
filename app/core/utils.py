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


def validate_url_security(url: str) -> str:
    """
    Validates that a URL does not point to a private, loopback, or reserved IP address.
    Prevents SSRF attacks.
    """
    try:
        parsed = urlparse(url)
    except Exception:
         raise ValueError("Invalid URL format")

    if parsed.scheme not in ('http', 'https'):
        raise ValueError("Invalid URL scheme (only http/https allowed)")

    hostname = parsed.hostname
    if not hostname:
        raise ValueError("Invalid URL: no hostname")

    try:
        # Resolve to IP
        # use getaddrinfo to support IPv4 and IPv6
        # proto=socket.IPPROTO_TCP ensures we only get TCP results (common for HTTP)
        addr_info = socket.getaddrinfo(hostname, None, proto=socket.IPPROTO_TCP)

        for _, _, _, _, sockaddr in addr_info:
            ip = sockaddr[0]
            # Strip scope_id for IPv6 if present (e.g., fe80::1%lo0)
            if '%' in ip:
                ip = ip.split('%')[0]

            ip_obj = ipaddress.ip_address(ip)

            if (ip_obj.is_private or
                ip_obj.is_loopback or
                ip_obj.is_reserved or
                ip_obj.is_link_local or
                ip_obj.is_multicast):
                 raise ValueError(f"Access to private/local IP {ip} is forbidden")

            # Explicit check for 0.0.0.0 (unspecified) if not covered by is_reserved/private depending on python version/OS
            if str(ip_obj) == "0.0.0.0":
                raise ValueError(f"Access to 0.0.0.0 is forbidden")

    except socket.gaierror:
        raise ValueError(f"Failed to resolve hostname: {hostname}")
    except ValueError as e:
        # Re-raise our own ValueErrors
        raise e
    except Exception as e:
         raise ValueError(f"URL validation failed: {str(e)}")

    return url


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
