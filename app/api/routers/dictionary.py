from fastapi import APIRouter, Response, HTTPException, Query
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
import os
from pathlib import Path
import mimetypes
from app.services.dictionary import dict_manager
from app.services.llm import llm_service
from app.services.collins_parser import collins_parser
from app.models.collins_schemas import CollinsWord
from app.config import MODEL_NAME
import logging

logger = logging.getLogger(__name__)

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
    # Security: Prevent path traversal
    base_dir = Path("resources/dictionaries").resolve()
    # If base_dir doesn't exist (e.g. in test envs), we might still want to proceed safely
    # but resolve() usually handles non-existent paths by making them absolute.
    # To be safe, let's assume if it exists we check against it, otherwise we check strict path containment.

    # Note: resolve() on non-existent paths on Linux works fine.

    requested_path = (base_dir / file_path).resolve()

    if not requested_path.is_relative_to(base_dir):
        # Log this security event?
        logger.warning(f"Potential path traversal attempt: {file_path}")
        raise HTTPException(status_code=403, detail="Access denied")

    # 1. Check disk
    if requested_path.exists() and requested_path.is_file():
        media_type, _ = mimetypes.guess_type(requested_path)
        with open(requested_path, "rb") as f:
            content = f.read()
        return Response(
            content=content, media_type=media_type or "application/octet-stream"
        )

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
        return {"results": results}
    except Exception:
        logger.exception("Dict Lookup Error")
        return {"results": [], "error": "Internal Dictionary Error"}


@router.post("/api/dictionary/context")
async def api_dict_context(payload: DictionaryContextRequest):
    try:
        from fastapi.concurrency import run_in_threadpool

        if not llm_service.sync_client:
            return {"explanation": "AI client is not configured (API Key missing)."}

        prompt = f"""
        You are an English tutor. Analyze the following word/phrase in the context of the sentence.

        Word: "{payload.word}"
        Sentence: "{payload.sentence}"

        1. Provide a brief explanation of the meaning in this context (in Chinese, max 2 sentences).
        2. Determine if this word/phrase is suitable for visual illustration (concrete nouns, action verbs, physical descriptions).
           - Suitable: deforestation, sprint, glossy, stumble, volcano
           - Unsuitable: democracy, however, realize, very, abstract concepts, grammar words
        3. If suitable, write a specific English image prompt (max 50 words) to visualize it. If NOT suitable, "image_prompt" should be null.

        Return strictly valid JSON:
        {{
            "explanation": "中文解释...",
            "needs_image": true/false,
            "image_prompt": "A detailed illustration of..." (or null)
        }}
        """

        response = await run_in_threadpool(
            lambda: llm_service.sync_client.chat.completions.create(
                model=MODEL_NAME,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                response_format={"type": "json_object"},  # Force JSON if supported by model
            )
        )
        content = (
            response.choices[0].message.content.strip()
            if response.choices
            else ""
        )
        
        # Parse JSON
        import json
        try:
            data = json.loads(content)
            return {
                "explanation": data.get("explanation", content),
                "needs_image": data.get("needs_image", False),
                "image_prompt": data.get("image_prompt"),
            }
        except json.JSONDecodeError:
            # Fallback if model returns raw text despite instructions
            return {
                "explanation": content,
                "needs_image": False,
                "image_prompt": None
            }
    except Exception:
        logger.exception("AI Error")
        return {"explanation": "An error occurred while generating explanation."}


@router.get("/api/dictionary/collins/{word}", response_model=CollinsWord)
async def get_collins_word(
    word: str,
    include_raw_html: bool = Query(False, description="Include raw HTML for debugging"),
):
    """
    Get structured dictionary data for a word from Collins COBUILD.

    Returns parsed data including:
    - Headword, pronunciations (UK/US IPA), audio URLs
    - Word frequency (1-5)
    - Inflections (forms like simmers, simmered, etc.)
    - Senses with definitions, examples, translations
    - Synonyms, phrasal verbs

    If the word is a cross-reference (e.g., "unequivocally" -> "unequivocal"),
    automatically follows the reference and returns the base word's definition.

    Example: GET /api/dictionary/collins/simmer
    """
    return await _get_collins_word_internal(word, include_raw_html, _recursion_depth=0)


async def _get_collins_word_internal(
    word: str,
    include_raw_html: bool = False,
    _recursion_depth: int = 0,
) -> CollinsWord:
    """
    Internal helper for get_collins_word with recursion depth tracking.
    
    Args:
        word: Word to look up
        include_raw_html: Whether to include raw HTML
        _recursion_depth: Current recursion depth (prevents infinite loops)
    """
    MAX_CROSS_REF_DEPTH = 2  # Allow max 2 levels of cross-references
    
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
        parsed = collins_parser.parse(
            collins_html, word, include_raw_html=include_raw_html
        )

        # Check if this is a cross-reference with no actual senses
        if parsed.found and parsed.entry and len(parsed.entry.senses) == 0 and _recursion_depth < MAX_CROSS_REF_DEPTH:
            # Try to extract cross-reference target
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(collins_html, "lxml")
            cross_ref = collins_parser._extract_cross_reference(soup)
            
            if cross_ref and cross_ref.lower() != word.lower():
                logger.info(f"Collins cross-reference: '{word}' -> '{cross_ref}' (depth={_recursion_depth})")
                # Recursively look up the referenced word
                ref_parsed = await _get_collins_word_internal(
                    cross_ref,
                    include_raw_html,
                    _recursion_depth=_recursion_depth + 1
                )
                
                if ref_parsed.found and ref_parsed.entry and len(ref_parsed.entry.senses) > 0:
                    # Return the referenced word's entry but keep original word
                    return CollinsWord(
                        word=word,
                        found=True,
                        entry=ref_parsed.entry,
                        raw_html=collins_html if include_raw_html else None,
                    )

        return parsed

    except Exception:
        logger.exception("Collins Lookup Error")
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
    include_raw_html: bool = Query(False, description="Include raw HTML for debugging"),
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
            parsed = ldoce_parser.parse(
                ldoce_html, word, include_raw_html=include_raw_html
            )

        # Cache the result
        if len(_ldoce_cache) >= _ldoce_cache_max_size:
            # Simple eviction: clear half
            keys_to_remove = list(_ldoce_cache.keys())[: _ldoce_cache_max_size // 2]
            for k in keys_to_remove:
                del _ldoce_cache[k]
        _ldoce_cache[cache_key] = parsed

        return parsed

    except Exception:
        logger.exception("LDOCE Lookup Error")
        return LDOCEWord(word=word, found=False)


@router.get("/api/dictionary/{source}/{word}")
async def get_dictionary_word(
    source: Literal["collins", "ldoce"],
    word: str,
    include_raw_html: bool = Query(False, description="Include raw HTML for debugging"),
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
