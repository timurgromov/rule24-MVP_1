from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.deps import get_current_user
from db.session import get_db
from models.client import Client
from models.session import Session as AppointmentSession
from models.session import SessionStatus
from models.user import User
from schemas.session import SessionCancelOut, SessionCreate, SessionOut, SessionUpdate
from services.cancellation_rule_service import get_or_create_cancellation_rule

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _get_owned_client_or_404(db: Session, user_id: int, client_id: int) -> Client:
    client = db.scalar(select(Client).where(Client.id == client_id, Client.user_id == user_id))
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    return client


def _get_owned_session_or_404(
    db: Session, user_id: int, session_id: int
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


def _hours_before_start(start_time: datetime) -> float:
    now = datetime.now(timezone.utc)
    value = start_time
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return (value - now).total_seconds() / 3600


@router.post("", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SessionOut:
    _get_owned_client_or_404(db, current_user.id, payload.client_id)

    new_session = AppointmentSession(
        user_id=current_user.id,
        client_id=payload.client_id,
        start_time=payload.start_time,
        duration_minutes=payload.duration_minutes,
        price=payload.price,
        status=SessionStatus(payload.status),
        notes=payload.notes,
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return SessionOut.model_validate(new_session)


@router.get("", response_model=list[SessionOut])
def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SessionOut]:
    sessions = db.scalars(
        select(AppointmentSession)
        .where(AppointmentSession.user_id == current_user.id)
        .order_by(AppointmentSession.start_time.desc())
    ).all()
    return [SessionOut.model_validate(item) for item in sessions]


@router.get("/{session_id}", response_model=SessionOut)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SessionOut:
    current_session = _get_owned_session_or_404(db, current_user.id, session_id)
    return SessionOut.model_validate(current_session)


@router.put("/{session_id}", response_model=SessionOut)
def update_session(
    session_id: int,
    payload: SessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SessionOut:
    current_session = _get_owned_session_or_404(db, current_user.id, session_id)

    update_data = payload.model_dump(exclude_unset=True)
    if "client_id" in update_data:
        _get_owned_client_or_404(db, current_user.id, update_data["client_id"])

    if "price" in update_data and update_data["price"] is not None:
        if current_session.status in {SessionStatus.completed, SessionStatus.cancelled}:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot change price for completed or cancelled session",
            )

    if "status" in update_data and update_data["status"] is not None:
        update_data["status"] = SessionStatus(update_data["status"])

    for field, value in update_data.items():
        setattr(current_session, field, value)

    db.commit()
    db.refresh(current_session)
    return SessionOut.model_validate(current_session)


@router.post("/{session_id}/cancel", response_model=SessionCancelOut)
def cancel_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SessionCancelOut:
    current_session = _get_owned_session_or_404(db, current_user.id, session_id)

    if current_session.status == SessionStatus.cancelled:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Session already cancelled",
        )

    if current_session.status == SessionStatus.completed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Completed session cannot be cancelled",
        )

    rule = get_or_create_cancellation_rule(db, current_user.id)
    hours_before_start = _hours_before_start(current_session.start_time)
    is_late_cancellation = hours_before_start < rule.hours_before

    current_session.status = SessionStatus.cancelled
    db.commit()
    db.refresh(current_session)

    return SessionCancelOut(
        session=SessionOut.model_validate(current_session),
        cancellation_window_hours=rule.hours_before,
        hours_before_start=round(hours_before_start, 2),
        is_late_cancellation=is_late_cancellation,
        charge_amount=current_session.price if is_late_cancellation else None,
    )
