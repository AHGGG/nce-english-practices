from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import require_current_user
from app.core.db import get_db
from app.models.orm import StudyBasketState, User
from app.models.study_basket_schemas import StudyBasketPayload, StudyBasketResponse

router = APIRouter(prefix="/api/study-basket", tags=["study-basket"])


@router.get("/{source_type}/{content_id}", response_model=StudyBasketResponse)
async def get_study_basket(
    source_type: Literal["podcast", "audiobook"],
    content_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    stmt = select(StudyBasketState).where(
        StudyBasketState.user_id == current_user.user_id_str,
        StudyBasketState.source_type == source_type,
        StudyBasketState.content_id == content_id,
    )
    result = await db.execute(stmt)
    state = result.scalar_one_or_none()

    if state is None:
        return StudyBasketResponse(
            source_type=source_type,
            content_id=content_id,
            lookup_items=[],
            bookmarked_sentences=[],
            updated_at=None,
        )

    return StudyBasketResponse(
        source_type=source_type,
        content_id=content_id,
        lookup_items=state.lookup_items or [],
        bookmarked_sentences=state.bookmarked_sentences or [],
        updated_at=state.updated_at,
    )


@router.put("/{source_type}/{content_id}", response_model=StudyBasketResponse)
async def save_study_basket(
    source_type: Literal["podcast", "audiobook"],
    content_id: str,
    payload: StudyBasketPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    stmt = select(StudyBasketState).where(
        StudyBasketState.user_id == current_user.user_id_str,
        StudyBasketState.source_type == source_type,
        StudyBasketState.content_id == content_id,
    )
    result = await db.execute(stmt)
    state = result.scalar_one_or_none()

    if state is None:
        state = StudyBasketState(
            user_id=current_user.user_id_str,
            source_type=source_type,
            content_id=content_id,
            lookup_items=[item.model_dump() for item in payload.lookup_items],
            bookmarked_sentences=[
                item.model_dump() for item in payload.bookmarked_sentences
            ],
        )
        db.add(state)
    else:
        state.lookup_items = [item.model_dump() for item in payload.lookup_items]
        state.bookmarked_sentences = [
            item.model_dump() for item in payload.bookmarked_sentences
        ]

    await db.commit()
    await db.refresh(state)

    return StudyBasketResponse(
        source_type=source_type,
        content_id=content_id,
        lookup_items=state.lookup_items or [],
        bookmarked_sentences=state.bookmarked_sentences or [],
        updated_at=state.updated_at,
    )
