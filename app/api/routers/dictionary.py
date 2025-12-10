from fastapi import APIRouter, Response, HTTPException
from pydantic import BaseModel
import os
import mimetypes
from app.services.dictionary import dict_manager
from app.services.llm import llm_service
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
    full_path = os.path.join(r"resources/dictionaries", file_path)
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
        return {"results": [], "error": str(e)}

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
         return {"explanation": f"AI Error: {str(e)}"}
