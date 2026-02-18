from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class ParsedSourceId:
    source_type: str
    item_id: str
    unit_index: int


def parse_source_id(source_id: str) -> Optional[ParsedSourceId]:
    parts = (source_id or "").split(":")
    if len(parts) < 3:
        return None

    source_type, item_id, unit_index_raw = parts[0], parts[1], parts[2]
    if not source_type or not item_id:
        return None

    try:
        return ParsedSourceId(
            source_type=source_type,
            item_id=item_id,
            unit_index=int(unit_index_raw),
        )
    except (TypeError, ValueError):
        return None


def parse_epub_source_id(source_id: str) -> Optional[tuple[str, int]]:
    parsed = parse_source_id(source_id)
    if not parsed or parsed.source_type != "epub":
        return None
    return parsed.item_id, parsed.unit_index
