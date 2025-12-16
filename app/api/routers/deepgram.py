from fastapi import APIRouter, HTTPException, Depends
from app.services.deepgram_service import deepgram_service

router = APIRouter(prefix="/api/deepgram", tags=["deepgram"])

@router.get("/token")
async def get_deepgram_token():
    """
    Get a temporary API key for the Deepgram Browser SDK.
    """
    try:
        token_data = await deepgram_service.get_temp_token()
        return token_data
    except Exception as e:
        print(f"Error generating token: {e}")
        # In case of error (e.g., invalid master key), we return 500
        raise HTTPException(status_code=500, detail="Could not generate Deepgram token.")
