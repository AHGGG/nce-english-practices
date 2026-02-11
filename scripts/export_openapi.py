import sys
import os
import json
import contextlib

# Add project root to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    # Redirect stdout to suppress logs during import
    with contextlib.redirect_stdout(open(os.devnull, "w")):
        from app.main import app

    # Get OpenAPI schema
    openapi_schema = app.openapi()

    # Print to stdout (now restored)
    print(json.dumps(openapi_schema, indent=2))

except Exception as e:
    print(f"Error exporting OpenAPI schema: {e}", file=sys.stderr)
    sys.exit(1)
