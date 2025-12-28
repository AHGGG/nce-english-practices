import asyncio
import sys
import os

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from app.services.rss_service import rss_service

async def main():
    test_url = "https://plink.anyfeeder.com/weixin/Economist_fans"
    print(f"Fetching feed from: {test_url}")
    
    try:
        # Test 1: Fetch Feed
        feed = await rss_service.fetch_feed(test_url)
        if not feed or not feed.entries:
            print("❌ Failed to fetch feed or no entries found.")
            return

        print(f"✅ Feed fetched successfully. Title: {feed.feed.get('title', 'Unknown')}")
        print(f"Entries count: {len(feed.entries)}")
        
        # Test 2: Extract Sentences from first entry
        first_entry = feed.entries[0]
        print(f"\nAnalyzing first entry: {first_entry.title}")
        
        content_text = first_entry.title + ". " + first_entry.get('summary', '')
        if 'content' in first_entry:
            for content_block in first_entry.content:
                content_text += " " + content_block.value
                
        sentences = rss_service.extract_sentences(content_text)
        print(f"Found {len(sentences)} candidates.")
        if sentences:
            print("Sample sentences:")
            for i, s in enumerate(sentences[:3]):
                print(f"  {i+1}. {s}")
        
        # Test 3: Get Random Content
        print("\nTesting get_random_content()...")
        content = await rss_service.get_random_content(test_url)
        if content:
            print("✅ Random content retrieved:")
            print(f"  Title: {content['title']}")
            print(f"  Text: {content['text']}")
            print(f"  Link: {content['link']}")
        else:
            print("❌ Failed to get random content.")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
