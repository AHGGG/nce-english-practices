from fastapi import APIRouter, Response, HTTPException, Query
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
import os
import mimetypes
from app.services.dictionary import dict_manager
from app.services.llm import llm_service
from app.services.collins_parser import collins_parser
from app.models.collins_schemas import CollinsWord
from app.config import MODEL_NAME

router = APIRouter()

class DictionaryLookupRequest(BaseModel):
    word: str

class DictionaryContextRequest(BaseModel):
    word: str
    sentence: str

@router.get("/dict-assets/{file_path:path}")
async def get_dict_asset(file_path: str):
    """
    Unified endpoint for dictionary assets (CSS, JS, Images).
    """
    # 1. Check disk
    base_dir = os.path.abspath(r"resources/dictionaries")
    full_path = os.path.abspath(os.path.join(base_dir, file_path))

    # Prevent path traversal
    if os.path.commonpath([base_dir, full_path]) != base_dir:
        raise HTTPException(status_code=403, detail="Access denied")

    if os.path.exists(full_path) and os.path.isfile(full_path):
        media_type, _ = mimetypes.guess_type(full_path)
        with open(full_path, "rb") as f:
            content = f.read()
        return Response(content=content, media_type=media_type or "application/octet-stream")

    # 2. Check MDD (Fallback)
    filename = os.path.basename(file_path)

    # Try exact match first
    content, media_type = dict_manager.get_resource(file_path)
    if content:
        return Response(content=content, media_type=media_type)

    # Try basename match
    if filename != file_path:
        content, media_type = dict_manager.get_resource(filename)
        if content:
             return Response(content=content, media_type=media_type)

    raise HTTPException(status_code=404, detail="Asset not found")

@router.get("/dict/resource")
def get_resource_legacy(path: str):
    content, media_type = dict_manager.get_resource(path)
    if not content:
        raise HTTPException(status_code=404, detail="Resource not found")

    return Response(content=content, media_type=media_type)

@router.post("/api/dictionary/lookup")
async def api_dict_lookup(payload: DictionaryLookupRequest):
    try:
        from fastapi.concurrency import run_in_threadpool
        results = await run_in_threadpool(dict_manager.lookup, payload.word)
        return {
            "results": results
        }
    except Exception as e:
        print(f"Dict Lookup Error: {e}")
        return {"results": [], "error": "Internal Dictionary Error"}

@router.post("/api/dictionary/context")
async def api_dict_context(payload: DictionaryContextRequest):
    try:
        from fastapi.concurrency import run_in_threadpool

        if not llm_service.sync_client:
            return {"explanation": "AI client is not configured (API Key missing)."}

        prompt = f"""
        Explain the meaning of the word "{payload.word}" in the context of this sentence:
        "{payload.sentence}"

        Keep it brief (max 2 sentences). Explain the nuance or usage.
        """

        response = await run_in_threadpool(
            lambda: llm_service.sync_client.chat.completions.create(
                model=MODEL_NAME,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3
            )
        )
        explanation = response.choices[0].message.content.strip() if response.choices else "Could not generate explanation."

        return {"explanation": explanation}
    except Exception as e:
         print(f"AI Error: {e}")
         return {"explanation": "An error occurred while generating explanation."}


@router.get("/api/dictionary/collins/{word}", response_model=CollinsWord)
async def get_collins_word(
    word: str,
    include_raw_html: bool = Query(False, description="Include raw HTML for debugging")
):
    """
    Get structured dictionary data for a word from Collins COBUILD.
    
    Returns parsed data including:
    - Headword, pronunciations (UK/US IPA), audio URLs
    - Word frequency (1-5)
    - Inflections (forms like simmers, simmered, etc.)
    - Senses with definitions, examples, translations
    - Synonyms, phrasal verbs
    
    Example: GET /api/dictionary/collins/simmer
    """
    try:
        # Lookup in dictionary (runs in threadpool as it may be slow)
        results = await run_in_threadpool(dict_manager.lookup, word)
        
        # Find Collins dictionary result
        collins_html = None
        for result in results:
            if "collins" in result.get("dictionary", "").lower():
                collins_html = result.get("definition", "")
                break
        
        if not collins_html:
            return CollinsWord(word=word, found=False)
        
        # Parse the HTML
        parsed = collins_parser.parse(collins_html, word, include_raw_html=include_raw_html)
        return parsed
        
    except Exception as e:
        print(f"Collins Lookup Error: {e}")
        return CollinsWord(word=word, found=False)


# Import LDOCE parser and schemas
from app.services.ldoce_parser import ldoce_parser
from app.models.ldoce_schemas import LDOCEWord
from typing import Literal, Union

# ========== LDOCE RESULT CACHE ==========
# Cache parsed LDOCEWord results to avoid expensive re-parsing.
# High-frequency words like "on" take 10+ seconds to parse due to 2MB+ HTML.
# Cache dramatically improves repeated lookups.
_ldoce_cache: dict = {}
_ldoce_cache_max_size = 500


@router.get("/api/dictionary/ldoce/{word}", response_model=LDOCEWord)
async def get_ldoce_word(
    word: str,
    include_raw_html: bool = Query(False, description="Include raw HTML for debugging")
):
    """
    Get structured dictionary data for a word from Longman LDOCE.
    
    Returns parsed data including:
    - Headword, pronunciations (BrE/AmE), audio URLs
    - Multiple entries (verb, noun, etc.)
    - Senses with definitions, examples, translations
    - Collocations, phrasal verbs
    
    Example: GET /api/dictionary/ldoce/simmer
    """
    # Check cache first
    cache_key = (word.lower(), include_raw_html)
    if cache_key in _ldoce_cache:
        return _ldoce_cache[cache_key]
    
    try:
        # Lookup in dictionary
        results = await run_in_threadpool(dict_manager.lookup, word)
        
        # Find LDOCE dictionary result
        ldoce_html = None
        for result in results:
            dict_name = result.get("dictionary", "").upper()
            if "LDOCE" in dict_name or "LONGMAN" in dict_name:
                ldoce_html = result.get("definition", "")
                break
        
        if not ldoce_html:
            parsed = LDOCEWord(word=word, found=False)
        else:
            # Parse the HTML
            parsed = ldoce_parser.parse(ldoce_html, word, include_raw_html=include_raw_html)
        
        # Cache the result
        if len(_ldoce_cache) >= _ldoce_cache_max_size:
            # Simple eviction: clear half
            keys_to_remove = list(_ldoce_cache.keys())[:_ldoce_cache_max_size // 2]
            for k in keys_to_remove:
                del _ldoce_cache[k]
        _ldoce_cache[cache_key] = parsed
        
        return parsed
        
    except Exception as e:
        print(f"LDOCE Lookup Error: {e}")
        return LDOCEWord(word=word, found=False)


@router.get("/api/dictionary/{source}/{word}")
async def get_dictionary_word(
    source: Literal["collins", "ldoce"],
    word: str,
    include_raw_html: bool = Query(False, description="Include raw HTML for debugging")
) -> Union[CollinsWord, LDOCEWord]:
    """
    Unified dictionary lookup endpoint.
    
    Args:
        source: Dictionary source - "collins" or "ldoce"
        word: Word to lookup
        include_raw_html: Include raw HTML for debugging
    
    Returns:
        Structured dictionary data from the specified source.
    
    Examples:
        GET /api/dictionary/collins/simmer
        GET /api/dictionary/ldoce/simmer
    """
    if source == "collins":
        return await get_collins_word(word, include_raw_html)
    elif source == "ldoce":
        return await get_ldoce_word(word, include_raw_html)
    else:
        # This shouldn't happen due to Literal type validation
        return CollinsWord(word=word, found=False)

