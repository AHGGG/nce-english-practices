from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import json
import asyncio

router = APIRouter()



# ============================================================
# Reading Mode API Endpoints (Phase 2)
# ============================================================

from app.services.content_service import content_service
from app.models.content_schemas import SourceType
import os
from pathlib import Path


@router.get("/api/reading/epub/books")
def list_epub_books():
    """
    List all available EPUB books in the resources directory.
    """
    try:
        from app.services.content_providers.epub_provider import EpubProvider
        
        books = []
        epub_dir = EpubProvider.EPUB_DIR
        
        if epub_dir.exists():
            for f in epub_dir.glob("*.epub"):
                books.append({
                    "filename": f.name,
                    "title": f.stem.replace(".", " ").replace("_", " ").replace("-", " ").title(),
                    "size_bytes": f.stat().st_size
                })
        
        return {"books": books}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/reading/epub/list")
def list_epub_articles(filename: str):
    """
    List all articles/chapters in an EPUB file.
    
    Returns: List of articles with titles and metadata.
    """
    try:
        # Import epub provider directly to access metadata
        from app.services.content_providers.epub_provider import EpubProvider
        provider = EpubProvider()
        
        # Load the EPUB
        if not provider._load_epub(filename):
            raise HTTPException(status_code=404, detail=f"EPUB not found: {filename}")
        
        # Return article list with metadata
        articles = []
        for i, article in enumerate(provider._cached_articles):
            full_text = article.get("full_text", "")
            # Use sentence extraction to filter out TOC/navigation pages
            # These have text but no proper sentences
            sentences = provider._extract_sentences(full_text)
            if len(sentences) < 3:
                continue
                
            articles.append({
                "index": i,
                "title": article.get("title", f"Chapter {i+1}"),
                "preview": sentences[0] if sentences else full_text[:200] + "...",
                "source_id": f"epub:{filename}:{i}",
                "sentence_count": len(sentences)
            })
        
        return {
            "filename": filename,
            "total_articles": len(articles),
            "articles": articles
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/reading/article")
async def get_article_content(
    source_id: str,
    include_sentences: bool = True,
    book_code: Optional[str] = None,
    min_sequence: Optional[int] = None,
    max_sequence: Optional[int] = None
):
    """
    Get full article content by source_id.
    
    Args:
        source_id: Format "epub:{filename}:{chapter_index}"
        include_sentences: Whether to include sentence segmentation
        book_code: Optional word book code (e.g., 'coca20000', 'cet4')
        min_sequence: Optional min sequence for highlights
        max_sequence: Optional max sequence for highlights
        
    Returns: Article with title, full_text, sentences, highlights, and images.
    """
    try:
        # Parse source_id
        parts = source_id.split(":")
        if len(parts) < 3 or parts[0] != "epub":
            raise HTTPException(status_code=400, detail="Invalid source_id format. Expected: epub:{filename}:{index}")
        
        filename = parts[1]
        chapter_index = int(parts[2])
        
        # Use ContentService to fetch
        bundle = await content_service.get_content(
            SourceType.EPUB,
            filename=filename,
            chapter_index=chapter_index
        )
        
        result = {
            "id": bundle.id,
            "title": bundle.title,
            "full_text": bundle.full_text,
            "metadata": bundle.metadata,
            "highlights": [],
            "images": [
                {
                    "path": img.path,
                    "sentence_index": img.sentence_index,
                    "alt": img.alt,
                    "caption": img.caption
                }
                for img in bundle.images
            ]
        }
        
        # Identify highlights if book_code provided
        if book_code:
            try:
                from app.services.word_list_service import word_list_service
                highlights = await word_list_service.identify_words_in_text(
                    text=bundle.full_text,
                    book_code=book_code,
                    user_id="default_user",
                    min_sequence=min_sequence,
                    max_sequence=max_sequence
                )
                result["highlights"] = highlights
            except Exception as e:
                print(f"Highlight identification failed: {e}")
                # Continue without highlights
        
        if include_sentences:
            result["sentences"] = [
                {"index": i, "text": s.text}
                for i, s in enumerate(bundle.sentences)
            ]
            result["sentence_count"] = len(bundle.sentences)
        
        return result
        
    except (IndexError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/reading/epub/image")
def get_epub_image(filename: str, image_path: str):
    """
    Serve an image from an EPUB file.
    
    Args:
        filename: EPUB filename (e.g., 'TheEconomist.2025.12.27.epub')
        image_path: Path to image within the EPUB
        
    Returns: Binary image data with appropriate Content-Type
    """
    try:
        from app.services.content_providers.epub_provider import EpubProvider
        provider = EpubProvider()
        
        result = provider.get_image(filename, image_path)
        if result is None:
            raise HTTPException(status_code=404, detail=f"Image not found: {image_path}")
        
        image_data, content_type = result
        return Response(
            content=image_data,
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=86400"  # Cache for 24 hours
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

