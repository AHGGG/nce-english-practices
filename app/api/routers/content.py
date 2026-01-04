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
def list_epub_articles(filename: Optional[str] = None):
    """
    List all articles/chapters in an EPUB file.
    
    Args:
        filename: EPUB filename. If not provided, uses the first available EPUB.
    
    Returns: List of articles with titles and metadata.
    """
    try:
        # Import epub provider directly to access metadata
        from app.services.content_providers.epub_provider import EpubProvider
        provider = EpubProvider()
        
        # If no filename provided, use first available EPUB
        if not filename:
            epub_dir = EpubProvider.EPUB_DIR
            if epub_dir.exists():
                epub_files = list(epub_dir.glob("*.epub"))
                if epub_files:
                    filename = epub_files[0].name
                else:
                    return {"filename": None, "total_articles": 0, "articles": []}
            else:
                return {"filename": None, "total_articles": 0, "articles": []}
        
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
    max_sequence: Optional[int] = None,
    user_id: str = "default_user"
):
    """
    Get full article content by source_id.
    
    Args:
        source_id: Format "epub:{filename}:{chapter_index}"
        include_sentences: Whether to include sentence segmentation
        book_code: Optional word book code (e.g., 'coca20000', 'cet4')
        min_sequence: Optional min sequence for highlights
        max_sequence: Optional max sequence for highlights
        user_id: User ID for fetching study-based highlights
        
    Returns: Article with title, full_text, sentences, highlights, study_highlights, and images.
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
            "study_highlights": [],  # NEW: Words looked up during Sentence Study
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
        
        # Identify vocabulary highlights if book_code provided
        if book_code:
            try:
                from app.services.word_list_service import word_list_service
                highlights = await word_list_service.identify_words_in_text(
                    text=bundle.full_text,
                    book_code=book_code,
                    user_id=user_id,
                    min_sequence=min_sequence,
                    max_sequence=max_sequence
                )
                result["highlights"] = highlights
            except Exception as e:
                print(f"Highlight identification failed: {e}")
                # Continue without highlights
        
        # Fetch study-based highlights (words/phrases looked up during Sentence Study)
        try:
            from app.core.db import AsyncSessionLocal
            from sqlalchemy import select
            
            async with AsyncSessionLocal() as db:
                # Fetch all learning records for this article
                stmt = (
                    select(SentenceLearningRecord.word_clicks, SentenceLearningRecord.phrase_clicks)
                    .where(SentenceLearningRecord.user_id == user_id)
                    .where(SentenceLearningRecord.source_id == source_id)
                )
                records = await db.execute(stmt)
                
                # Extract all words and phrases from JSON arrays
                all_words = set()
                all_phrases = set()
                for row in records.fetchall():
                    word_clicks, phrase_clicks = row
                    if word_clicks:
                        all_words.update(word_clicks)
                    if phrase_clicks:
                        all_phrases.update(phrase_clicks)
                
                # Combine and return
                result["study_highlights"] = list(all_words | all_phrases)
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Study highlights fetch failed: {e}")
            # Continue without study highlights
        
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


# ============================================================
# Unified Article Status API (Cross-Mode Integration)
# ============================================================

from app.core.db import get_db
from sqlalchemy import select, func
from app.models.orm import ReadingSession, SentenceLearningRecord, ReviewItem


@router.get("/api/content/article-status")
async def get_article_status(
    filename: str,
    user_id: str = "default_user"
):
    """
    Get combined reading and study status for all articles in an EPUB.
    
    Returns unified status for each article:
    - reading_sessions: number of reading sessions
    - last_read: timestamp of last reading session
    - study_progress: { current_index, total, clear_count, unclear_count }
    - has_review_items: whether article has active review items
    - status: "new" | "read" | "in_progress" | "completed"
    """
    try:
        from app.services.content_providers.epub_provider import EpubProvider
        from app.core.db import AsyncSessionLocal
        provider = EpubProvider()
        
        # Load the EPUB to get articles
        if not provider._load_epub(filename):
            raise HTTPException(status_code=404, detail=f"EPUB not found: {filename}")
        
        async with AsyncSessionLocal() as db:
            articles = []
            
            for i, article in enumerate(provider._cached_articles):
                full_text = article.get("full_text", "")
                sentences = provider._extract_sentences(full_text)
                if len(sentences) < 3:
                    continue
                
                source_id = f"epub:{filename}:{i}"
                
                # Get reading session count
                reading_result = await db.execute(
                    select(func.count(ReadingSession.id))
                    .where(ReadingSession.user_id == user_id)
                    .where(ReadingSession.source_id == source_id)
                )
                reading_sessions = reading_result.scalar() or 0
                
                # Get last read time
                last_read_result = await db.execute(
                    select(ReadingSession.ended_at)
                    .where(ReadingSession.user_id == user_id)
                    .where(ReadingSession.source_id == source_id)
                    .order_by(ReadingSession.ended_at.desc())
                    .limit(1)
                )
                last_read = last_read_result.scalar()
                
                # Get study progress
                study_result = await db.execute(
                    select(
                        func.count(SentenceLearningRecord.id),
                        func.count(SentenceLearningRecord.id).filter(SentenceLearningRecord.initial_response == 'clear'),
                        func.count(SentenceLearningRecord.id).filter(SentenceLearningRecord.initial_response == 'unclear'),
                        func.max(SentenceLearningRecord.sentence_index)
                    )
                    .where(SentenceLearningRecord.user_id == user_id)
                    .where(SentenceLearningRecord.source_id == source_id)
                )
                study_row = study_result.one()
                studied_count = study_row[0] or 0
                clear_count = study_row[1] or 0
                unclear_count = study_row[2] or 0
                max_index = study_row[3]
                current_index = (max_index + 1) if max_index is not None else 0
                
                # Check for review items
                review_result = await db.execute(
                    select(func.count(ReviewItem.id))
                    .where(ReviewItem.user_id == user_id)
                    .where(ReviewItem.source_id == source_id)
                )
                review_count = review_result.scalar() or 0
                
                # Determine status
                total_sentences = len(sentences)
                if current_index >= total_sentences and studied_count > 0:
                    status = "completed"
                elif studied_count > 0:
                    status = "in_progress"
                elif reading_sessions > 0:
                    status = "read"
                else:
                    status = "new"
                
                articles.append({
                    "index": i,
                    "title": article.get("title", f"Chapter {i+1}"),
                    "source_id": source_id,
                    "sentence_count": total_sentences,
                    "reading_sessions": reading_sessions,
                    "last_read": last_read.isoformat() if last_read else None,
                    "study_progress": {
                        "current_index": current_index,
                        "total": total_sentences,
                        "studied_count": studied_count,
                        "clear_count": clear_count,
                        "unclear_count": unclear_count
                    },
                    "has_review_items": review_count > 0,
                    "status": status
                })
            
            return {
                "filename": filename,
                "user_id": user_id,
                "articles": articles
            }
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


