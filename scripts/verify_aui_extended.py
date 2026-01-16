"""
Verification script for AUI Extended Events
Tests Activity Progress, Tool Call, and Run Lifecycle endpoints
"""

import asyncio
import httpx
import json
from typing import List, Dict
from datetime import datetime


BASE_URL = "http://localhost:8000"


class AUIExtendedVerifier:
    def __init__(self):
        self.results: List[Dict] = []

    def log(self, message: str, status: str = "INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] [{status}] {message}")

    async def test_activity_progress(self):
        """Test Activity Progress endpoint"""
        self.log("Testing Activity Progress endpoint...", "TEST")
        url = f"{BASE_URL}/api/aui/demo/stream/activity?task=Test%20Task&steps=3"

        events = []
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                async with client.stream("GET", url) as response:
                    if response.status_code != 200:
                        self.log(f"Failed: HTTP {response.status_code}", "ERROR")
                        return False

                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data = json.loads(line[6:])
                            events.append(data)
                            event_type = data.get("type")
                            self.log(f"  Received: {event_type}", "EVENT")

                            # Detailed logging for activity events
                            if event_type == "aui_activity_snapshot":
                                self.log(
                                    f"    Snapshot: {data.get('name')} - {data.get('status')} - {data.get('progress') * 100:.0f}%",
                                    "DATA",
                                )
                            elif event_type == "aui_activity_delta":
                                self.log(
                                    f"    Delta: {len(data.get('delta', []))} operations",
                                    "DATA",
                                )

            # Verify we got expected events
            event_types = [e["type"] for e in events]
            # expected = [
            #     "aui_stream_start",
            #     "aui_activity_snapshot",
            #     "aui_activity_delta",
            #     "aui_stream_end",
            # ]

            if (
                event_types[0] == "aui_stream_start"
                and "aui_activity_snapshot" in event_types
            ):
                self.log("✅ Activity Progress endpoint working correctly", "PASS")
                return True
            else:
                self.log(f"❌ Unexpected event sequence: {event_types}", "FAIL")
                return False
        except Exception as e:
            self.log(f"❌ Exception: {str(e)}", "ERROR")
            return False

    async def test_tool_call(self):
        """Test Tool Call endpoint"""
        self.log("Testing Tool Call endpoint...", "TEST")
        url = f"{BASE_URL}/api/aui/demo/stream/tool-call?tool=search&query=test"

        events = []
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                async with client.stream("GET", url) as response:
                    if response.status_code != 200:
                        self.log(f"Failed: HTTP {response.status_code}", "ERROR")
                        return False

                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data = json.loads(line[6:])
                            events.append(data)
                            event_type = data.get("type")
                            self.log(f"  Received: {event_type}", "EVENT")

                            if event_type == "aui_tool_call_start":
                                self.log(f"    Tool: {data.get('tool_name')}", "DATA")
                            elif event_type == "aui_tool_call_result":
                                result = data.get("result", {})
                                self.log(
                                    f"    Result: {result.get('count', 0)} items",
                                    "DATA",
                                )

            # Verify complete tool call lifecycle
            event_types = [e["type"] for e in events]
            required = [
                "aui_tool_call_start",
                "aui_tool_call_args",
                "aui_tool_call_end",
                "aui_tool_call_result",
            ]

            has_all = all(et in event_types for et in required)
            if has_all:
                self.log("✅ Tool Call endpoint working correctly", "PASS")
                return True
            else:
                missing = [et for et in required if et not in event_types]
                self.log(f"❌ Missing events: {missing}", "FAIL")
                return False
        except Exception as e:
            self.log(f"❌ Exception: {str(e)}", "ERROR")
            return False

    async def test_agent_run_success(self):
        """Test Agent Run endpoint (success case)"""
        self.log("Testing Agent Run endpoint (success)...", "TEST")
        url = f"{BASE_URL}/api/aui/demo/stream/agent-run?task=Test%20Task&fail=false"

        events = []
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                async with client.stream("GET", url) as response:
                    if response.status_code != 200:
                        self.log(f"Failed: HTTP {response.status_code}", "ERROR")
                        return False

                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data = json.loads(line[6:])
                            events.append(data)
                            event_type = data.get("type")
                            self.log(f"  Received: {event_type}", "EVENT")

                            if event_type == "aui_run_started":
                                self.log(f"    Run ID: {data.get('run_id')}", "DATA")
                            elif event_type == "aui_run_finished":
                                self.log(
                                    f"    Duration: {data.get('duration_ms', 0):.0f}ms",
                                    "DATA",
                                )

            # Verify run lifecycle
            event_types = [e["type"] for e in events]

            if "aui_run_started" in event_types and "aui_run_finished" in event_types:
                self.log("✅ Agent Run (success) endpoint working correctly", "PASS")
                return True
            else:
                self.log(f"❌ Unexpected events: {event_types}", "FAIL")
                return False
        except Exception as e:
            self.log(f"❌ Exception: {str(e)}", "ERROR")
            return False

    async def test_agent_run_failure(self):
        """Test Agent Run endpoint (failure case)"""
        self.log("Testing Agent Run endpoint (failure)...", "TEST")
        url = f"{BASE_URL}/api/aui/demo/stream/agent-run?task=Test%20Task&fail=true"

        events = []
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                async with client.stream("GET", url) as response:
                    if response.status_code != 200:
                        self.log(f"Failed: HTTP {response.status_code}", "ERROR")
                        return False

                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data = json.loads(line[6:])
                            events.append(data)
                            event_type = data.get("type")
                            self.log(f"  Received: {event_type}", "EVENT")

                            if event_type == "aui_run_error":
                                self.log(
                                    f"    Error: {data.get('error_message')}", "DATA"
                                )

            # Verify error path
            event_types = [e["type"] for e in events]

            if "aui_run_started" in event_types and "aui_run_error" in event_types:
                self.log("✅ Agent Run (failure) endpoint working correctly", "PASS")
                return True
            else:
                self.log(f"❌ Unexpected events: {event_types}", "FAIL")
                return False
        except Exception as e:
            self.log(f"❌ Exception: {str(e)}", "ERROR")
            return False

    async def run_all_tests(self):
        """Run all verification tests"""
        print("\n" + "=" * 60)
        print("AUI Extended Events Verification")
        print("=" * 60 + "\n")

        tests = [
            ("Activity Progress", self.test_activity_progress),
            ("Tool Call", self.test_tool_call),
            ("Agent Run (Success)", self.test_agent_run_success),
            ("Agent Run (Failure)", self.test_agent_run_failure),
        ]

        results = {}
        for name, test_fn in tests:
            print(f"\n--- {name} ---")
            result = await test_fn()
            results[name] = result
            print()

        # Summary
        print("\n" + "=" * 60)
        print("Summary")
        print("=" * 60)
        passed = sum(1 for v in results.values() if v)
        total = len(results)

        for name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status}  {name}")

        print(f"\nTotal: {passed}/{total} tests passed")
        print("=" * 60 + "\n")

        return passed == total


async def main():
    verifier = AUIExtendedVerifier()
    success = await verifier.run_all_tests()

    if success:
        print("✅ All tests passed!")
        return 0
    else:
        print(
            "❌ Some tests failed. Check the server is running at http://localhost:8000"
        )
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
