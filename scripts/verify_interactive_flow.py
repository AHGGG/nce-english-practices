import asyncio
import httpx
import json

BASE_URL = "http://127.0.0.1:8000"


async def verify_interactive_flow():
    print(f"Connecting to stream at {BASE_URL}/api/aui/demo/stream/interactive...")

    session_id = None

    async with httpx.AsyncClient(timeout=30.0) as client:
        async with client.stream(
            "GET", f"{BASE_URL}/api/aui/demo/stream/interactive"
        ) as response:
            print("Stream connected. Listening for events...")

            async for line in response.aiter_lines():
                if not line.startswith("data: "):
                    continue

                event_data = json.loads(line[6:])
                event_type = event_data.get("type")

                if event_type == "aui_stream_start":
                    session_id = event_data["session_id"]
                    print(f"✅ Stream Started. Session ID: {session_id}")

                elif event_type == "aui_render_snapshot":
                    intention = event_data.get("intention")
                    print(f"📷 Snapshot received: {intention}")

                elif event_type == "aui_state_delta":
                    print("🔄 State Delta received")
                    # Check if we are in waiting state
                    # Ideally we parse the delta, but for verify we can infer from timing or console logs
                    # But wait, we need to know WHEN to send input.
                    # The demo sends a state delta that changes status to "waiting_input"

                    # Hack: The server waits for 60s. We can just send input after seeing the first delta
                    # which transitions from 'processing' to 'waiting_input'.

                    if session_id:
                        print(">> Detecting pause... Sending INPUT in 1 second...")
                        await asyncio.sleep(1.0)

                        input_payload = {
                            "session_id": session_id,
                            "action": "confirm",
                            "payload": {"verifier": "script"},
                        }

                        print(
                            f">> Sending POST /api/aui/input for session {session_id}"
                        )
                        # Use a separate request (not the stream one)
                        r = await client.post(
                            f"{BASE_URL}/api/aui/input", json=input_payload
                        )
                        print(f">> Input response: {r.status_code} {r.json()}")
                        assert r.status_code == 200
                        print("✅ Input accepted!")

                elif event_type == "aui_stream_end":
                    print("🏁 Stream Ended")
                    break


if __name__ == "__main__":
    try:
        asyncio.run(verify_interactive_flow())
        print("\n🎉 Verification SUCCESS")
    except Exception as e:
        print(f"\n❌ Verification FAILED: {e}")
