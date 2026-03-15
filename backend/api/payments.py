from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.deps import get_current_user
from db.session import get_db
from models.client import Client
from models.session import Session as AppointmentSession
from models.session import SessionStatus
from models.transaction import Transaction
from models.user import User
from schemas.payment import CardAttachmentInitOut, PenaltyChargeOut
from schemas.transaction import TransactionOut
from services.payment_service import create_card_attachment_payment, create_penalty_charge

router = APIRouter(prefix="/payments", tags=["payments"])


def _get_owned_client_or_404(db: Session, user_id: int, client_id: int) -> Client:
    client = db.scalar(
        select(Client).where(
            Client.id == client_id,
            Client.user_id == user_id,
            Client.archived_at.is_(None),
        )
    )
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    return client


def _get_owned_session_or_404(
    db: Session,
    user_id: int,
    session_id: int,
) -> AppointmentSession:
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


@router.post(
    "/clients/{client_id}/attach-card",
    response_model=CardAttachmentInitOut,
    summary="Initialize card attachment in YooKassa",
    description="Creates provider-side payment flow to save payment method reference only.",
)
def init_card_attachment(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CardAttachmentInitOut:
    client = _get_owned_client_or_404(db, current_user.id, client_id)

    try:
        payment = create_card_attachment_payment(db, current_user.id, client)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    confirmation = payment.get("confirmation") or {}
    return CardAttachmentInitOut(
        payment_id=payment.get("id", ""),
        confirmation_url=confirmation.get("confirmation_url"),
    )


@router.post(
    "/sessions/{session_id}/penalty-charge",
    response_model=PenaltyChargeOut,
    summary="Request late-cancellation penalty charge",
    description="Charge amount is derived from session.price and operation is idempotent per session.",
)
def request_penalty_charge(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PenaltyChargeOut:
    current_session = _get_owned_session_or_404(db, current_user.id, session_id)

    if current_session.status != SessionStatus.cancelled:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Session must be cancelled before charging penalty",
        )

    try:
        transaction = create_penalty_charge(db, current_user.id, current_session)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    return PenaltyChargeOut(
        transaction_id=transaction.id,
        session_id=transaction.session_id,
        amount=transaction.amount,
        status=transaction.status.value,
        yookassa_payment_id=transaction.yookassa_payment_id,
        created_at=transaction.created_at,
    )


@router.get(
    "/transactions",
    response_model=list[TransactionOut],
    summary="List current user's transactions",
)
def list_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TransactionOut]:
    transactions = db.scalars(
        select(Transaction)
        .join(AppointmentSession, AppointmentSession.id == Transaction.session_id)
        .where(AppointmentSession.user_id == current_user.id)
        .order_by(Transaction.created_at.desc())
    ).all()
    return [TransactionOut.model_validate(item) for item in transactions]
