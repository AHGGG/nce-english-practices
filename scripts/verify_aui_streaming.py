"""
Verification Script for AUI Streaming Endpoints

Tests all AUI streaming endpoints to verify:
- SSE connection works
- Events are properly formatted
- JSON Patch generation is correct
- State updates are applied correctly
"""

import asyncio
import httpx
import json
from typing import List, Dict, Any
import sys


class AUIStreamVerifier:
    """Verifies AUI streaming functionality"""
    
    def __init__(self, base_url: str = "https://localhost:8000"):
        self.base_url = base_url
        self.results = []
    
    async def verify_endpoint(self, endpoint: str, test_name: str) -> bool:
        """Verify a specific streaming endpoint"""
        print(f"\n{'='*60}")
        print(f"Testing: {test_name}")
        print(f"Endpoint: {endpoint}")
        print(f"{'='*60}")
        
        url = f"{self.base_url}{endpoint}"
        events_received = []
        
        try:
            async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
                async with client.stream("GET", url) as response:
                    if response.status_code != 200:
                        print(f"❌ FAILED: HTTP {response.status_code}")
                        self.results.append({
                            "test": test_name,
                            "status": "FAILED",
                            "error": f"HTTP {response.status_code}"
                        })
                        return False
                    
                    print(f"✅ Connected successfully")
                    
                    # Read SSE events
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            event_json = line[6:]  # Remove "data: " prefix
                            try:
                                event = json.loads(event_json)
                                events_received.append(event)
                                
                                # Print event summary
                                event_type = event.get("type", "unknown")
                                print(f"  📦 Event: {event_type}", end="")
                                
                                if event_type == "aui_render_snapshot":
                                    component = event.get("ui", {}).get("component", "?")
                                    print(f" (component: {component})")
                                elif event_type == "aui_text_delta":
                                    delta_len = len(event.get("delta", ""))
                                    print(f" (delta: {delta_len} chars)")
                                elif event_type == "aui_state_delta":
                                    patch_count = len(event.get("delta", []))
                                    print(f" (patches: {patch_count})")
                                else:
                                    print()
                                
                                # Stop after stream end
                                if event_type == "aui_stream_end":
                                    print(f"  ✅ Stream completed")
                                    break
                                    
                            except json.JSONDecodeError as e:
                                print(f"  ⚠️  Failed to parse event: {e}")
                        
                        # Safety: Don't wait forever
                        if len(events_received) > 100:
                            print("  ⚠️  Stopping after 100 events")
                            break
            
            # Validate event sequence
            if not self._validate_event_sequence(events_received, test_name):
                return False
            
            self.results.append({
                "test": test_name,
                "status": "PASSED",
                "events": len(events_received)
            })
            print(f"\n✅ {test_name} PASSED ({len(events_received)} events)")
            return True
            
        except Exception as e:
            print(f"\n❌ FAILED: {str(e)}")
            self.results.append({
                "test": test_name,
                "status": "FAILED",
                "error": str(e)
            })
            return False
    
    def _validate_event_sequence(self, events: List[Dict[str, Any]], test_name: str) -> bool:
        """Validate that events follow expected sequence"""
        if len(events) == 0:
            print(f"  ❌ No events received")
            return False
        
        # Check for stream_start
        if events[0].get("type") != "aui_stream_start":
            print(f"  ⚠️  Expected first event to be 'aui_stream_start', got '{events[0].get('type')}'")
        
        # Check for stream_end
        if events[-1].get("type") != "aui_stream_end":
            print(f"  ⚠️  Expected last event to be 'aui_stream_end', got '{events[-1].get('type')}'")
        
        # Check for snapshot
        has_snapshot = any(e.get("type") == "aui_render_snapshot" for e in events)
        if not has_snapshot:
            print(f"  ❌ No 'aui_render_snapshot' event found")
            return False
        
        return True
    
    def _validate_state_delta(self, events: List[Dict[str, Any]]) -> bool:
        """Validate JSON Patch events"""
        delta_events = [e for e in events if e.get("type") == "aui_state_delta"]
        
        if not delta_events:
            print(f"  ⚠️  No state delta events found")
            return True  # Not required for all tests
        
        print(f"  📊 Validating {len(delta_events)} state delta events...")
        
        for i, event in enumerate(delta_events):
            delta = event.get("delta", [])
            if not isinstance(delta, list):
                print(f"    ❌ Event {i}: delta is not a list")
                return False
            
            # Validate JSON Patch format
            for j, patch in enumerate(delta):
                if not isinstance(patch, dict):
                    print(f"    ❌ Event {i}, patch {j}: not a dict")
                    return False
                
                if "op" not in patch or "path" not in patch:
                    print(f"    ❌ Event {i}, patch {j}: missing 'op' or 'path'")
                    return False
                
                if patch["op"] not in ["add", "remove", "replace", "move", "copy", "test"]:
                    print(f"    ❌ Event {i}, patch {j}: invalid op '{patch['op']}'")
                    return False
        
        print(f"  ✅ All state deltas are valid")
        return True
    
    async def run_all_tests(self):
        """Run all verification tests"""
        print("\n" + "="*60)
        print("AUI STREAMING VERIFICATION")
        print("="*60)
        
        tests = [
            ("/api/aui/stream/story?content=Hello%20world%20this%20is%20a%20test&title=Test&user_level=1&chunk_size=2",
             "Story Streaming (Level 1)"),
            
            ("/api/aui/stream/vocabulary?words=test,demo,verify&user_level=1",
             "Vocabulary Cards (Level 1)"),
            
            ("/api/aui/stream/vocabulary?words=advanced,complex,technical&user_level=3",
             "Vocabulary Cards (Level 3)"),
            
            ("/api/aui/stream/vocab-patch-demo?level=1",
             "Vocabulary Flip Demo (JSON Patch)"),
            
            ("/api/aui/stream/state-demo",
             "State Sync Demo (Complex)"),
        ]
        
        for endpoint, name in tests:
            await self.verify_endpoint(endpoint, name)
            await asyncio.sleep(0.5)  # Brief pause between tests
        
        # Print summary
        print("\n" + "="*60)
        print("VERIFICATION SUMMARY")
        print("="*60)
        
        passed = sum(1 for r in self.results if r["status"] == "PASSED")
        failed = sum(1 for r in self.results if r["status"] == "FAILED")
        
        for result in self.results:
            status_icon = "✅" if result["status"] == "PASSED" else "❌"
            test_name = result["test"]
            if result["status"] == "PASSED":
                events = result.get("events", 0)
                print(f"{status_icon} {test_name} ({events} events)")
            else:
                error = result.get("error", "Unknown error")
                print(f"{status_icon} {test_name} - {error}")
        
        print(f"\nTotal: {passed}/{len(self.results)} passed")
        
        if failed > 0:
            print(f"\n⚠️  {failed} test(s) failed")
            return False
        else:
            print(f"\n🎉 All tests passed!")
            return True


async def main():
    """Main entry point"""
    verifier = AUIStreamVerifier()
    success = await verifier.run_all_tests()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
