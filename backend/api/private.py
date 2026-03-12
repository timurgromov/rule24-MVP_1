from fastapi import APIRouter, Depends

from api.deps import get_current_user
from models.user import User

router = APIRouter(prefix="/private", tags=["private"])


@router.get("/ping")
def private_ping(current_user: User = Depends(get_current_user)) -> dict[str, str]:
    return {"status": "ok", "user": current_user.email}
