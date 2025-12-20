import os
import re
import yaml
import argparse
from pathlib import Path
from typing import List, Dict, Optional

def parse_spec(file_path: Path) -> Optional[Dict]:
    """Extracts and parses OpenAPI or AsyncAPI YAML from a markdown file."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception:
        return None

    # Match either OpenAPI or AsyncAPI
    match = re.search(r"## (?:OpenAPI|AsyncAPI) Specification\s+```yaml\n(.*?)\n```", content, re.DOTALL)
    
    if not match:
        return None
    
    yaml_content = match.group(1)
    try:
        spec = yaml.safe_load(yaml_content)
        return spec
    except yaml.YAMLError:
        return None

def analyze_directory(base_path: Path, provider_name: Path) -> List[Dict]:
    endpoints = []
    
    if not base_path.exists():
        return []

    for root, _, files in os.walk(base_path):
        for file in files:
            if file.endswith(".md") and file != "README.md":
                file_path = Path(root) / file
                spec = parse_spec(file_path)
                
                if spec:
                    # Handle OpenAPI 'paths'
                    if "paths" in spec:
                        paths = spec.get("paths", {})
                        for path, methods in paths.items():
                            for method, details in methods.items():
                                if method.lower() not in ["get", "post", "put", "delete", "patch"]:
                                    continue
                                
                                endpoint_info = {
                                    "provider": provider_name,
                                    "file": str(file_path.relative_to(base_path.parent)),
                                    "match_path": str(file_path),
                                    "path": path,
                                    "method": method.upper(),
                                    "summary": details.get("summary", "No summary"),
                                    "description": details.get("description", "No description"),
                                    "operationId": details.get("operationId", "N/A"),
                                    "spec": details
                                }
                                endpoints.append(endpoint_info)
                    
                    # Handle AsyncAPI 'channels'
                    if "channels" in spec:
                        channels = spec.get("channels", {})
                        for channel_name, channel_details in channels.items():
                            # AsyncAPI doesn't have methods like GET/POST, but has publish/subscribe
                            # We'll treat the channel itself as the endpoint
                            
                            summary = channel_details.get("description", "AsyncAPI Channel")
                            # Check for publish/subscribe to get more details
                            ops = []
                            if "publish" in channel_details: ops.append("PUB")
                            if "subscribe" in channel_details: ops.append("SUB")
                            method = "WS" if not ops else f"WS:{','.join(ops)}"

                            endpoint_info = {
                                "provider": provider_name,
                                "file": str(file_path.relative_to(base_path.parent)),
                                "match_path": str(file_path),
                                "path": channel_name,
                                "method": method,
                                "summary": summary,
                                "description": channel_details.get("description", ""),
                                "operationId": "async-channel",
                                "spec": channel_details
                            }
                            endpoints.append(endpoint_info)
    return endpoints

def main():
    parser = argparse.ArgumentParser(description="Query Voice API Documentation")
    parser.add_argument("query", nargs="?", help="Search term (endpoint path, summary, or description)")
    parser.add_argument("-p", "--provider", choices=["elevenlabs", "deepgram"], help="Filter by provider")
    parser.add_argument("-m", "--method", help="Filter by HTTP Method (GET, POST, etc.)")
    parser.add_argument("-d", "--details", action="store_true", help="Show full OpenAPI spec in output")
    parser.add_argument("-c", "--compact", action="store_true", help="Show compact list (Directory Mode)")
    
    args = parser.parse_args()

    # Setup paths
    # Assuming this script is run from project root or scripts dir
    # We try to find the docs/voice directory
    project_root = Path(__file__).parent.parent
    docs_base = project_root / "docs" / "voice"
    
    if not docs_base.exists():
        # Fallback if running from scripts dir directly without project root context
        docs_base = Path("../docs/voice")
    
    if not docs_base.exists():
        print(f"Error: Could not find docs/voice directory at {docs_base.resolve()}")
        return

    all_endpoints = []
    
    # Collect endpoints based on provider filter
    if not args.provider or args.provider == "elevenlabs":
        all_endpoints.extend(analyze_directory(docs_base / "elevenlabs", "ElevenLabs"))
    
    if not args.provider or args.provider == "deepgram":
        all_endpoints.extend(analyze_directory(docs_base / "deepgram", "Deepgram"))

    # Sort by provider then path
    all_endpoints.sort(key=lambda x: (x['provider'], x['path']))

    # Filter results
    results = []
    query = args.query.lower() if args.query else None
    method_filter = args.method.upper() if args.method else None
    
    for ep in all_endpoints:
        if method_filter and ep["method"] != method_filter:
            continue
            
        if query:
            # Search in path, summary, description, operationId, AND file path
            corpus = f"{ep['path']} {ep['summary']} {ep['description']} {ep['operationId']} {ep['file']}".lower()
            if query not in corpus:
                continue
        
        results.append(ep)

    # Display results
    print(f"\nFound {len(results)} matches:\n")
    
    for ep in results:
        if args.compact:
            # Compact directory mode: [Provider] Method Path - Summary
            print(f"[{ep['provider']}] [{ep['method']}] {ep['path']} - {ep['summary']}")
        else:
            print(f"[{ep['provider']}] [{ep['method']}] {ep['path']}")
            print(f"  Summary: {ep['summary']}")
            print(f"  Source:  {ep['file']}")
            
            if args.details:
                print("  --- Spec ---")
                print(yaml.dump(ep['spec'], default_flow_style=False))
                print("  ------------")
            else:
                print("-" * 60)

if __name__ == "__main__":
    main()
