from typing import Optional


def parse_epub_source_id(source_id: str) -> Optional[tuple[str, int]]:
    parts = (source_id or "").split(":")
    if len(parts) < 3 or parts[0] != "epub":
        return None

    try:
        return parts[1], int(parts[2])
    except (TypeError, ValueError):
        return None
