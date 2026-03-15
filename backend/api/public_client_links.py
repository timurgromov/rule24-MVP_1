from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from db.session import get_db
from models.client_payment_link import ClientPaymentLink, ClientPaymentLinkStatus
from models.client import Client
from models.session import Session as AppointmentSession
from schemas.client_payment_link import ClientPaymentLinkPublicOut

router = APIRouter(prefix="/public/client-links", tags=["public-client-links"])


@router.get(
    "/{public_token}",
    response_model=ClientPaymentLinkPublicOut,
    summary="Get public client payment link context",
)
def get_public_client_link(
    public_token: str,
    db: Session = Depends(get_db),
) -> ClientPaymentLinkPublicOut:
    link = db.scalar(
        select(ClientPaymentLink).where(ClientPaymentLink.public_token == public_token)
    )
    if link is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client link not found",
        )

    if link.expired_at is not None and link.expired_at <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Client link expired",
        )

    if link.status == ClientPaymentLinkStatus.expired:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Client link expired",
        )

    session = db.get(AppointmentSession, link.session_id)
    client = db.get(Client, link.client_id)
    if session is None or client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client link context not found",
        )

    return ClientPaymentLinkPublicOut(
        id=link.id,
        public_token=link.public_token,
        status=link.status,
        session_id=link.session_id,
        client_id=link.client_id,
        client_name=client.name,
        session_start_time=session.start_time,
        session_duration_minutes=session.duration_minutes,
        session_price=str(session.price),
        session_notes=session.notes,
        created_at=link.created_at,
        opened_at=link.opened_at,
        completed_at=link.completed_at,
        expired_at=link.expired_at,
    )
