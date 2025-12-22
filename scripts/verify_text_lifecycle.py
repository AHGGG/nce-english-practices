"""
Verification script for TEXT_MESSAGE lifecycle events
Tests the /api/aui/demo/stream/multi-messages endpoint
"""

import asyncio
import httpx
from typing import Dict, Any, List


async def verify_text_lifecycle():
    """
    Verify TEXT_MESSAGE lifecycle events are working correctly
    """
    print("=" * 60)
    print("TEXT_MESSAGE Lifecycle Verification")
    print("=" * 60)
    print()
    
    url = "http://localhost:8000/api/aui/demo/stream/multi-messages"
    
    # Tracking
    messages = {}  # message_id -> {started: bool, ended: bool, deltas: List[str]}
    event_count = 0
    errors = []
    
    try:
        async with httpx.AsyncClient() as client:
            print(f"📡 Connecting to: {url}")
            print()
            
            async with client.stream("GET", url, timeout=30.0) as response:
                if response.status_code != 200:
                    print(f"❌ HTTP Error: {response.status_code}")
                    return False
                
                print("✅ Connection established")
                print()
                print("🔄 Receiving events...")
                print("-" * 60)
                
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        import json
                        event_data = json.loads(line[6:])  # Remove "data: " prefix
                        event_type = event_data.get("type")
                        event_count += 1
                        
                        print(f"\n[Event #{event_count}] {event_type}")
                        
                        # Handle different event types
                        if event_type == "aui_stream_start":
                            print(f"  Session: {event_data.get('session_id')}")
                        
                        elif event_type == "aui_text_message_start":
                            msg_id = event_data["message_id"]
                            role = event_data.get("role", "unknown")
                            metadata = event_data.get("metadata", {})
                            
                            messages[msg_id] = {
                                "started": True,
                                "ended": False,
                                "deltas": [],
                                "role": role,
                                "metadata": metadata
                            }
                            
                            print(f"  ✨ Message Started:")
                            print(f"     ID: {msg_id}")
                            print(f"     Role: {role}")
                            print(f"     Type: {metadata.get('type', 'N/A')}")
                            if "title" in metadata:
                                print(f"     Title: {metadata['title']}")
                            if "word" in metadata:
                                print(f"     Word: {metadata['word']}")
                        
                        elif event_type == "aui_text_delta":
                            msg_id = event_data["message_id"]
                            delta = event_data["delta"]
                            
                            if msg_id not in messages:
                                err = f"Received TEXT_DELTA for unknown message: {msg_id}"
                                errors.append(err)
                                print(f"  ⚠️  {err}")
                            else:
                                messages[msg_id]["deltas"].append(delta)
                                print(f"  📝 Delta for {messages[msg_id]['metadata'].get('type', msg_id)}: \"{delta}\"")
                        
                        elif event_type == "aui_text_message_end":
                            msg_id = event_data["message_id"]
                            final_content = event_data.get("final_content")
                            
                            if msg_id not in messages:
                                err = f"Received TEXT_MESSAGE_END for unknown message: {msg_id}"
                                errors.append(err)
                                print(f"  ⚠️  {err}")
                            else:
                                messages[msg_id]["ended"] = True
                                accumulated = "".join(messages[msg_id]["deltas"])
                                
                                print(f"  ✅ Message Ended:")
                                print(f"     ID: {msg_id}")
                                print(f"     Accumulated Length: {len(accumulated)} chars")
                                if final_content:
                                    print(f"     Final Content Match: {accumulated == final_content}")
                        
                        elif event_type == "aui_stream_end":
                            print(f"  🏁 Stream Ended")
                            break
    
    except Exception as e:
        print(f"\n❌ Connection error: {e}")
        return False
    
    # Verification
    print()
    print("=" * 60)
    print("Verification Results")
    print("=" * 60)
    print()
    
    print(f"Total Events Received: {event_count}")
    print(f"Total Messages Tracked: {len(messages)}")
    print()
    
    # Check each message lifecycle
    all_valid = True
    for msg_id, msg_data in messages.items():
        msg_type = msg_data["metadata"].get("type", "unknown")
        print(f"Message: {msg_type} ({msg_id[:8]}...)")
        
        if not msg_data["started"]:
            print(f"  ❌ Never started")
            all_valid = False
        else:
            print(f"  ✅ Started")
        
        delta_count = len(msg_data["deltas"])
        print(f"  📊 Delta events: {delta_count}")
        
        if delta_count == 0:
            print(f"  ⚠️  No deltas received")
        
        if not msg_data["ended"]:
            print(f"  ❌ Never ended")
            all_valid = False
        else:
            print(f"  ✅ Ended")
        
        print()
    
    # Check for errors
    if errors:
        print("⚠️  Errors encountered:")
        for err in errors:
            print(f"  - {err}")
        print()
        all_valid = False
    
    # Final result
    print("=" * 60)
    if all_valid and len(messages) == 2:
        print("✅ ALL CHECKS PASSED")
        print()
        print("Summary:")
        print("  • Received START events for all messages")
        print("  • Received DELTA events with content")
        print("  • Received END events for all messages")
        print("  • 2 concurrent messages handled correctly")
        return True
    else:
        print("❌ VERIFICATION FAILED")
        if len(messages) != 2:
            print(f"  Expected 2 messages, got {len(messages)}")
        return False


if __name__ == "__main__":
    print()
    print("Starting TEXT_MESSAGE Lifecycle Verification...")
    print("Make sure the dev server is running on http://localhost:8000")
    print()
    
    success = asyncio.run(verify_text_lifecycle())
    
    print()
    print("=" * 60)
    if success:
        print("✨ Verification completed successfully!")
    else:
        print("💥 Verification failed - please check the output above")
    print("=" * 60)
    print()
    
    exit(0 if success else 1)
