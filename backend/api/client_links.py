import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.deps import get_current_user
from db.session import get_db
from models.client_payment_link import ClientPaymentLink, ClientPaymentLinkStatus
from models.session import Session as AppointmentSession
from models.user import User
from schemas.client_payment_link import ClientPaymentLinkOut

router = APIRouter(prefix="/client-links", tags=["client-links"])


def _get_owned_session_or_404(db: Session, user_id: int, session_id: int) -> AppointmentSession:
    current_session = db.scalar(
        select(AppointmentSession).where(
            AppointmentSession.id == session_id,
            AppointmentSession.user_id == user_id,
        )
    )
    if current_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    return current_session


def _generate_public_token(db: Session) -> str:
    while True:
        token = secrets.token_urlsafe(24)
        exists = db.scalar(
            select(ClientPaymentLink.id).where(ClientPaymentLink.public_token == token)
        )
        if exists is None:
            return token


@router.post(
    "/sessions/{session_id}",
    response_model=ClientPaymentLinkOut,
    status_code=status.HTTP_201_CREATED,
    summary="Generate client payment link for a session",
)
def create_client_payment_link(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClientPaymentLinkOut:
    current_session = _get_owned_session_or_404(db, current_user.id, session_id)

    link = ClientPaymentLink(
        session_id=current_session.id,
        client_id=current_session.client_id,
        public_token=_generate_public_token(db),
        status=ClientPaymentLinkStatus.created,
    )
    db.add(link)
    db.commit()
    db.refresh(link)

    return ClientPaymentLinkOut(
        id=link.id,
        session_id=link.session_id,
        client_id=link.client_id,
        public_token=link.public_token,
        status=link.status,
        client_url_path=f"/pay/{link.public_token}",
        created_at=link.created_at,
        opened_at=link.opened_at,
        completed_at=link.completed_at,
        expired_at=link.expired_at,
    )


@router.get(
    "/sessions/{session_id}/latest",
    response_model=ClientPaymentLinkOut,
    summary="Get latest client payment link for a session",
)
def get_latest_client_payment_link(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClientPaymentLinkOut:
    current_session = _get_owned_session_or_404(db, current_user.id, session_id)

    link = db.scalar(
        select(ClientPaymentLink)
        .where(ClientPaymentLink.session_id == current_session.id)
        .order_by(ClientPaymentLink.created_at.desc())
    )
    if link is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client link not found",
        )

    return ClientPaymentLinkOut(
        id=link.id,
        session_id=link.session_id,
        client_id=link.client_id,
        public_token=link.public_token,
        status=link.status,
        client_url_path=f"/pay/{link.public_token}",
        created_at=link.created_at,
        opened_at=link.opened_at,
        completed_at=link.completed_at,
        expired_at=link.expired_at,
    )
