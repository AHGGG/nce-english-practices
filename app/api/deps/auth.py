from typing import Optional

from fastapi import Depends

from app.api.routers.auth import (
    get_current_user as _get_current_user,
    get_current_user_id as _get_current_user_id,
    require_current_user as _require_current_user,
)
from app.models.orm import User


async def get_current_user(
    user: Optional[User] = Depends(_get_current_user),
) -> Optional[User]:
    return user


async def require_current_user(
    user: User = Depends(_require_current_user),
) -> User:
    return user


async def get_current_user_id(
    user_id: str = Depends(_get_current_user_id),
) -> str:
    return user_id
