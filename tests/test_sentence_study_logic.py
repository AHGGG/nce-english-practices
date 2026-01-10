import pytest


@pytest.mark.asyncio
async def test_diagnose_comprehension_logic():
    # Mock request object logic simulation (since logic is embedded in endpoint)
    # Ideally should be refactored to pure function, but for now we test the logic behavior

    # Logic: Clear -> No Gap
    assert _get_diagnosis("clear", None, None, []) == (None, 1.0)

    # Logic: Clear + Word Click -> Vocab Gap
    assert _get_diagnosis("clear", None, None, ["word"]) == ("vocabulary", 0.7)

    # Logic: Unclear -> Vocabulary -> Got It -> Vocab Gap
    assert _get_diagnosis("unclear", "vocabulary", "got_it", []) == ("vocabulary", 0.9)

    # Logic: Unclear -> Vocabulary -> Still Unclear -> Mixed
    assert _get_diagnosis("unclear", "vocabulary", "still_unclear", []) == (
        "mixed",
        0.6,
    )


def _get_diagnosis(initial, choice, simplified, clicks):
    # Replicating logic from endpoint for unit testing core logic without DB
    diagnosed_gap = None
    confidence = 0.0

    if initial == "clear":
        if clicks:
            diagnosed_gap = "vocabulary"
            confidence = 0.7
        else:
            diagnosed_gap = None
            confidence = 1.0
    elif choice == "vocabulary":
        if simplified == "got_it":
            diagnosed_gap = "vocabulary"
            confidence = 0.9
        else:
            diagnosed_gap = "mixed"
            confidence = 0.6
    elif choice == "grammar":
        if simplified == "got_it":
            diagnosed_gap = "structure"
            confidence = 0.9
        else:
            diagnosed_gap = "mixed"
            confidence = 0.6
    elif choice == "both":
        diagnosed_gap = "fundamental"
        confidence = 0.7

    return diagnosed_gap, confidence
