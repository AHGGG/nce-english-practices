import sys
import os

sys.path.append(os.getcwd())

try:

    print("Import SUCCESS")
except Exception as e:
    print(f"Import FAILED: {e}")
    import traceback

    traceback.print_exc()
