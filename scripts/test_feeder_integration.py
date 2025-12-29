import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from app.services.content_feeder import content_feeder

async def main():
    print("=== Testing ContentFeeder Integration ===\n")

    # 1. Test RSS Integration
    print("--- 1. Testing RSS via ContentFeeder ---")
    rss_url = "https://www.economist.com/the-world-this-week/rss.xml"
    try:
        content = await content_feeder.get_next_content(
            rss_url=rss_url,
            article_idx=0,
            sentence_idx=0
        )
        if content:
            print(f"✅ Success!")
            print(f"Text: {content.text}")
            print(f"Title: {content.article_title}")
            print(f"Source Type: {content.source_type}")
            print(f"Has Next: {content.has_next}")
        else:
            print("❌ Failed: Returned None")
    except Exception as e:
        print(f"❌ Error: {e}")
    print()
    
    # 2. Test Pagination (Next Sentence)
    print("--- 2. Testing Pagination (Next Sentence) ---")
    try:
        content = await content_feeder.get_next_content(
            rss_url=rss_url,
            article_idx=0,
            sentence_idx=1
        )
        if content:
            print(f"✅ Success (Sentence 1)!")
            print(f"Text: {content.text}")
        else:
            print("❌ Failed: Returned None")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
