from google.genai import types


def inspect_type(name, obj):
    print(f"\n{'=' * 20}\nInspecting: {name}\n{'=' * 20}")

    # 1. Pydantic V2
    if hasattr(obj, "model_fields"):
        print(f"[Pydantic V2] Fields for {name}:")
        try:
            for field_name, field_info in obj.model_fields.items():
                print(f"  - {field_name}: {field_info.annotation}")
            return
        except Exception as e:
            print(f"  Error reading model_fields: {e}")

    # 2. Pydantic V1
    if hasattr(obj, "__fields__"):
        print(f"[Pydantic V1] Fields for {name}:")
        try:
            for field_name, field_info in obj.__fields__.items():
                print(f"  - {field_name}: {field_info.type_}")
            return
        except Exception as e:
            print(f"  Error reading __fields__: {e}")

    # 3. TypedDict or Dataclass (Annotations)
    if hasattr(obj, "__annotations__"):
        print(f"[Annotations] Fields for {name}:")
        try:
            for field_name, field_type in obj.__annotations__.items():
                print(f"  - {field_name}: {field_type}")
            return
        except Exception as e:
            print(f"  Error reading __annotations__: {e}")

    # 4. Fallback: Dir
    print(f"[Dir] Attributes for {name}:")
    useful_attrs = [a for a in dir(obj) if not a.startswith("_")]
    print(f"  {useful_attrs}")


print("Scanning google.genai.types...")

# Specific types of interest
target_types = [
    "LiveConnectConfig",
    "GenerateContentConfig",
    "AudioTranscriptionConfig",
    "ServerContent",
    "LiveServerContent",
    "UserContent",
    "ModelContent",
    "Transcription",
    "InputTranscription",  # Guessing names?
]

for t_name in target_types:
    if hasattr(types, t_name):
        inspect_type(t_name, getattr(types, t_name))
    else:
        print(f"\nSkipping {t_name} (Not found)")

print("\nScanning for any 'Transcription' types...")
for name in dir(types):
    if "Transcription" in name:
        inspect_type(name, getattr(types, name))
