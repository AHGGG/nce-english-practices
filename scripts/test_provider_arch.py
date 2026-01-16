import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from app.services.content_service import content_service
from app.models.content_schemas import SourceType


async def main():
    print("=== Testing Content Provider Architecture ===\n")

    # 1. Test Plain Text
    print("--- 1. Testing PlainTextProvider ---")
    try:
        bundle = await content_service.get_content(
            SourceType.PLAIN_TEXT,
            text="Hello world. This is a test sentence. It works great!",
            title="Manual Test",
        )
        print(f"✅ Success! ID: {bundle.id}")
        print(f"Title: {bundle.title}")
        print(f"Sentences: {len(bundle.sentences)}")
        print(f"Sample: {bundle.sentences[0].text}")
    except Exception as e:
        print(f"❌ Failed: {e}")
    print()

    # 2. Test RSS Provider (Economist latest) - may fail if network issue
    print("--- 2. Testing RssProvider (The Economist) ---")
    rss_url = "https://www.economist.com/the-world-this-week/rss.xml"
    try:
        print(f"Fetching from: {rss_url}...")
        bundle = await content_service.get_content(
            SourceType.RSS, url=rss_url, article_index=0
        )
        print(f"✅ Success! ID: {bundle.id}")
        print(f"Title: {bundle.title}")
        print(f"Sentences: {len(bundle.sentences)}")
        if bundle.sentences:
            print(f"Sample: {bundle.sentences[0].text}")
    except Exception as e:
        print(f"❌ Failed (Network/Parse): {e}")
    print()

    # 3. Test Podcast Provider (NPR Up First)
    print("--- 3. Testing PodcastProvider (NPR Up First) ---")
    podcast_url = "https://feeds.npr.org/510318/podcast.xml"
    try:
        print(f"Fetching from: {podcast_url}...")
        bundle = await content_service.get_content(
            SourceType.PODCAST, feed_url=podcast_url, episode_index=0
        )
        print(f"✅ Success! ID: {bundle.id}")
        print(f"Title: {bundle.title}")
        print(f"Audio URL: {bundle.audio_url}")
        print(f"Sentences (Show Notes): {len(bundle.sentences)}")
    except Exception as e:
        print(f"❌ Failed (Network/Parse): {e}")


if __name__ == "__main__":
    asyncio.run(main())
