from fastapi import APIRouter, Depends, Query, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.services.image_generation import image_service

router = APIRouter(tags=["images"])

class GenerateImageRequest(BaseModel):
    word: str
    sentence: str
    image_prompt: str

@router.get("/api/generated-images/{word}")
async def get_generated_image(
    word: str,
    context_hash: str = Query(..., description="Context hash of the sentence"),
    db: AsyncSession = Depends(get_db)
):
    """Get cached image by word and context hash."""
    image = await image_service.get_cached(word, context_hash, db)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    return Response(content=image.image_data, media_type=image.mime_type)

@router.post("/api/generated-images/generate")
async def generate_image(
    request: GenerateImageRequest,
    db: AsyncSession = Depends(get_db)
):
    """Generate or retrieve cached image."""
    try:
        # This will verify or generate and cache the image
        await image_service.get_or_generate_image(
            request.word, request.sentence, request.image_prompt, db
        )
        # Return URL to fetch the image
        context_hash = image_service.get_context_hash(request.sentence)
        # Note: The frontend will access it via /api/generated-images/...
        return {
            "image_url": f"/api/generated-images/{request.word}?context_hash={context_hash}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
