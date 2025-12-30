import logging
from fastapi import APIRouter, HTTPException
from typing import List
from pydantic import BaseModel
from app.models.negotiation_schemas import NegotiationRequest, NegotiationResponse, ContextRequest, ContextResponse
from app.services.negotiation_service import negotiation_service
from app.services.content_feeder import content_feeder, FeedContent
from app.services.proficiency_service import proficiency_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/negotiation", tags=["negotiation"])

class WordProficiencyResponse(BaseModel):
    word: str
    exposure_count: int
    huh_count: int
    difficulty_score: float
    status: str

@router.post("/interact", response_model=NegotiationResponse)
async def interact(request: NegotiationRequest):
    """
    Handle user interaction in the Recursive Negotiation Loop.
    User sends intention (CONTINUE / HUH), and Server returns the next step and audio.
    """
    try:
        response = await negotiation_service.handle_request(request)
        return response
    except Exception as e:
        # In production log this
        logger.exception("Negotiation Error")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/next-content", response_model=FeedContent)
async def get_next_content(
    word: str = None, 
    book: str = None,
    book_start: int = None,
    book_end: int = None,
    exclude: str = None,
    rss_url: str = None,
    epub_file: str = None,
    article_idx: int = None,
    sentence_idx: int = None
):
    """
    Get the next piece of content from the content feeder.
    
    Args:
        word: Optional specific word to look up.
        book: Optional book code (e.g. 'cet4', 'coca') to select words from.
        book_start: Optional min sequence number (inclusive)
        book_end: Optional max sequence number (inclusive)
        exclude: Optional word to exclude (for SKIP functionality)
        rss_url: Optional RSS feed URL (for Reading Mode)
        epub_file: Optional EPUB filename (for EPUB Mode)
        article_idx: Optional article index for sequential reading
        sentence_idx: Optional sentence index within article
        
    Returns:
        FeedContent with a real dictionary example.
    """
    try:
        content = await content_feeder.get_next_content(
            word, 
            source_book=book,
            min_sequence=book_start,
            max_sequence=book_end,
            exclude_word=exclude,
            rss_url=rss_url,
            epub_file=epub_file,
            article_idx=article_idx,
            sentence_idx=sentence_idx
        )
        if content:
            return content
        raise HTTPException(status_code=404, detail="No content available")
    except Exception as e:
        logger.exception("ContentFeeder Error")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/difficult-words", response_model=List[WordProficiencyResponse])
async def get_difficult_words(limit: int = 20):
    """
    Get the user's most difficult words (highest HUH? rate).
    
    Returns:
        List of words sorted by difficulty score.
    """
    try:
        words = await proficiency_service.get_difficult_words(limit=limit)
        return [
            WordProficiencyResponse(
                word=w.word,
                exposure_count=w.exposure_count,
                huh_count=w.huh_count,
                difficulty_score=w.difficulty_score,
                status=w.status
            )
            for w in words
        ]
    except Exception as e:
        logger.exception("Proficiency Error")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/word-examples")
async def get_word_examples(word: str):
    """
    Get ALL examples for a word, grouped by sense.
    
    Args:
        word: The word to look up.
        
    Returns:
        WordExampleSet with all senses and examples.
    """
    from app.models.word_example_schemas import WordExampleSet
    
    try:
        result = content_feeder.get_all_examples(word)
        if result:
            return result
        raise HTTPException(status_code=404, detail=f"No examples found for '{word}'")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("WordExamples Error")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/context", response_model=ContextResponse)
async def generate_context(request: ContextRequest):
    """
    Generate a micro-scenario for a given word/example.
    """
    from app.models.negotiation_schemas import ContextResponse
    try:
        scenario = await negotiation_service.generate_micro_scenario(
            word=request.word,
            definition=request.definition,
            target_sentence=request.target_sentence
        )
        return ContextResponse(scenario=scenario)
    except Exception as e:
        logger.exception("Context Generation Error")
        raise HTTPException(status_code=500, detail=str(e))
