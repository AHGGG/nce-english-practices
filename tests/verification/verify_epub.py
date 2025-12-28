"""Verify EPUB parsing works correctly."""
import sys
sys.path.insert(0, '.')

from app.services.epub_service import epub_service

def main():
    # List available EPUBs
    print("=== Available EPUBs ===")
    epubs = epub_service.list_available_epubs()
    print(f"Found: {epubs}")
    
    if not epubs:
        print("No EPUB files found!")
        return
    
    # Load the first one
    print(f"\n=== Loading: {epubs[0]} ===")
    success = epub_service.load_epub(epubs[0])
    if not success:
        print("Failed to load EPUB!")
        return
    
    # Show stats
    print(f"\n=== Stats ===")
    print(f"Total articles: {epub_service.get_article_count()}")
    
    # Show first 5 article titles
    print(f"\n=== First 5 Article Titles ===")
    for i, title in enumerate(epub_service.get_article_titles()[:5]):
        print(f"  {i}: {title[:60]}...")
    
    # Test sequential content
    print(f"\n=== Sequential Content (Article 0, Sentence 0) ===")
    content = epub_service.get_sequential_content(0, 0)
    if content:
        print(f"Title: {content['title'][:50]}...")
        print(f"Text: {content['text'][:100]}...")
        print(f"Total sentences: {content['total_sentences']}")
        print(f"Raw content length: {len(content['raw_content'])} chars")
    else:
        print("No content returned!")
    
    # Test a few more articles
    print(f"\n=== Article 2, Sentence 0 ===")
    content = epub_service.get_sequential_content(2, 0)
    if content:
        print(f"Title: {content['title'][:50]}...")
        print(f"Text: {content['text'][:100]}...")
    
    print("\n=== EPUB verification complete! ===")

if __name__ == "__main__":
    main()
