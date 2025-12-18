import asyncio
from app.models.schemas import VerbEntry
from app.generators.theme import ThemeVocabulary, DEFAULT_VERBS

def test_verb_entry():
    print("Testing VerbEntry...")
    v = VerbEntry("go", "went", "gone")
    print(f"Created: {v}")
    print(f"Vars: {vars(v)}")
    assert vars(v)["base"] == "go"

def test_theme_vocabulary():
    print("Testing ThemeVocabulary...")
    # Mock payload
    payload = {
        "topic": "test",
        "slots": {"subject": ["I"]},
        "verbs": [{"base": "eat", "past": "ate", "participle": "eaten"}]
    }
    vocab = ThemeVocabulary.from_payload(payload)
    print(f"Vocab: {vocab}")
    
    serialized = vocab.serialize()
    print(f"Serialized: {serialized}")
    assert serialized["verbs"][0]["base"] == "eat"

if __name__ == "__main__":
    test_verb_entry()
    test_theme_vocabulary()
    print("Verification Passed!")
