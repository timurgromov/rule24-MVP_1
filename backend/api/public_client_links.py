from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from db.session import get_db
from models.client_payment_link import ClientPaymentLink, ClientPaymentLinkStatus
from models.client import Client
from models.session import Session as AppointmentSession
from schemas.payment import CardAttachmentInitOut
from schemas.client_payment_link import ClientPaymentLinkPublicOut
from services.payment_service import create_card_attachment_payment

router = APIRouter(prefix="/public/client-links", tags=["public-client-links"])


def _get_link_or_410(db: Session, public_token: str) -> ClientPaymentLink:
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
    return link


@router.get(
    "/{public_token}",
    response_model=ClientPaymentLinkPublicOut,
    summary="Get public client payment link context",
)
def get_public_client_link(
    public_token: str,
    db: Session = Depends(get_db),
) -> ClientPaymentLinkPublicOut:
    link = _get_link_or_410(db, public_token)

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


@router.post(
    "/{public_token}/attach-card",
    response_model=CardAttachmentInitOut,
    summary="Initialize card attachment via public client link",
)
def init_attach_card_by_public_link(
    public_token: str,
    db: Session = Depends(get_db),
) -> CardAttachmentInitOut:
    link = _get_link_or_410(db, public_token)

    session = db.get(AppointmentSession, link.session_id)
    client = db.get(Client, link.client_id)
    if session is None or client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client link context not found",
        )

    try:
        payment = create_card_attachment_payment(db, session.user_id, client)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    confirmation = payment.get("confirmation") or {}
    return CardAttachmentInitOut(
        payment_id=payment.get("id", ""),
        confirmation_url=confirmation.get("confirmation_url"),
    )
