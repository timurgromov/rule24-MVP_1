from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from core.config import get_settings
from db.session import get_db
from services.payment_service import process_yookassa_webhook

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
settings = get_settings()


@router.post("/yookassa")
async def yookassa_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_webhook_secret: str | None = Header(default=None),
) -> dict[str, str]:
    if settings.yookassa_webhook_secret:
        if x_webhook_secret != settings.yookassa_webhook_secret:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook secret",
            )

    payload = await request.json()
    result = process_yookassa_webhook(db, payload)
    return {"status": result["status"]}
