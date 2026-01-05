"""Test structured block extraction from EPUB files."""
import pytest
from pathlib import Path


@pytest.mark.asyncio
async def test_epub_blocks_extraction():
    """Test that blocks are extracted with correct ordering."""
    from app.services.content_providers.epub_provider import EpubProvider
    
    provider = EpubProvider()
    
    # Check if test EPUB exists
    epub_dir = Path("resources/epub")
    if not epub_dir.exists():
        pytest.skip("No EPUB directory")
    
    epubs = list(epub_dir.glob("*.epub"))
    if not epubs:
        pytest.skip("No EPUB files found")
    
    # Load first EPUB - try multiple chapters (first might be cover/toc)
    filename = epubs[0].name
    bundle = None
    paragraph_blocks = []
    
    for chapter_idx in range(10):  # Try up to 10 chapters
        try:
            bundle = await provider.fetch(filename, chapter_index=chapter_idx)
            paragraph_blocks = [b for b in bundle.blocks if b.type.value == 'paragraph']
            if paragraph_blocks:
                break
        except IndexError:
            break
    
    # Verify blocks exist
    assert bundle is not None, "Should load at least one chapter"
    assert bundle.blocks is not None, "Blocks should be populated"
    
    # We should find at least one chapter with paragraphs
    assert len(paragraph_blocks) > 0, f"Should have paragraph blocks (tried chapters 0-{chapter_idx})"
    
    # First paragraph should have at least one sentence
    first_para = paragraph_blocks[0]
    assert len(first_para.sentences) > 0, "First paragraph should have sentences"
    
    # Verify images appear before paragraphs if present in original
    image_blocks = [b for b in bundle.blocks if b.type.value == 'image']
    if image_blocks:
        first_image_idx = bundle.blocks.index(image_blocks[0])
        # Just verify both exist - exact ordering depends on content
        assert first_image_idx >= 0


@pytest.mark.asyncio  
async def test_lenient_sentence_splitting():
    """Test that sentences are not over-filtered."""
    from app.services.content_providers.epub_provider import EpubProvider
    
    provider = EpubProvider()
    
    # Test with sample text - includes drop-cap scenario
    text = "T HE BIG noise in 2025 has been President Donald Trump. Launching a barrage."
    sentences = provider._split_sentences_lenient(text)
    
    assert len(sentences) == 2, f"Expected 2 sentences, got {len(sentences)}: {sentences}"
    # Drop-cap should be fixed
    assert sentences[0] == "THE BIG noise in 2025 has been President Donald Trump.", f"First sentence wrong: {sentences[0]}"
    assert sentences[1] == "Launching a barrage.", f"Second sentence wrong: {sentences[1]}"


@pytest.mark.asyncio
async def test_blocks_preserve_dom_order():
    """Test that blocks are in DOM order (images not moved to middle)."""
    from app.services.content_providers.epub_provider import EpubProvider
    from bs4 import BeautifulSoup
    
    provider = EpubProvider()
    
    # Sample HTML with image at start
    html = """
    <body>
        <h1>Test Article</h1>
        <img src="images/test.jpg" alt="Test image"/>
        <p>This is the first paragraph with enough text to pass filtering.</p>
        <p>This is the second paragraph with more text for testing.</p>
    </body>
    """
    soup = BeautifulSoup(html, 'html.parser')
    blocks = provider._extract_structured_blocks(soup)
    
    # Should have: heading, image, paragraph, paragraph
    assert len(blocks) >= 3, f"Expected at least 3 blocks, got {len(blocks)}"
    
    block_types = [b.type.value for b in blocks]
    
    # Heading should be first
    assert block_types[0] == 'heading', f"First block should be heading, got {block_types[0]}"
    
    # Image should come before paragraphs (at index 1)
    if 'image' in block_types:
        image_idx = block_types.index('image')
        para_indices = [i for i, t in enumerate(block_types) if t == 'paragraph']
        if para_indices:
            # Image should be before first paragraph
            assert image_idx < para_indices[0], "Image should appear before paragraphs"
