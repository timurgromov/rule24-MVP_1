from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from models.client import Client
from models.payment_method import PaymentMethod
from models.session import Session
from models.transaction import Transaction, TransactionStatus
from models.webhook_event import WebhookEvent
from services.cancellation_rule_service import get_or_create_cancellation_rule
from services.yookassa_service import YooKassaService


def _to_amount(value: Decimal) -> dict[str, str]:
    normalized = value.quantize(Decimal("0.01"))
    return {"value": str(normalized), "currency": "RUB"}


def _hours_before_start(start_time: datetime) -> float:
    now = datetime.now(timezone.utc)
    value = start_time
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return (value - now).total_seconds() / 3600


def create_card_attachment_payment(
    db: Session,
    user_id: int,
    client: Client,
) -> dict[str, Any]:
    yookassa = YooKassaService()

    payload = {
        "amount": {"value": "1.00", "currency": "RUB"},
        "capture": False,
        "confirmation": {
            "type": "redirect",
            "return_url": yookassa.settings.yookassa_return_url,
        },
        "save_payment_method": True,
        "description": "Rule24 card attachment",
        "metadata": {
            "purpose": "attach_payment_method",
            "user_id": str(user_id),
            "client_id": str(client.id),
        },
    }

    idempotence_key = f"client_{client.id}_attach_card"
    return yookassa.create_payment(payload, idempotence_key=idempotence_key)


def _get_latest_payment_method(
    db: Session,
    user_id: int,
    client_id: int,
) -> PaymentMethod | None:
    return db.scalar(
        select(PaymentMethod)
        .join(Client, Client.id == PaymentMethod.client_id)
        .where(PaymentMethod.client_id == client_id)
        .where(Client.user_id == user_id)
        .order_by(PaymentMethod.created_at.desc())
    )


def create_penalty_charge(
    db: Session,
    user_id: int,
    current_session: Session,
) -> Transaction:
    rule = get_or_create_cancellation_rule(db, user_id)

    payment_method = _get_latest_payment_method(db, user_id, current_session.client_id)
    if payment_method is None:
        raise ValueError("No saved payment method for client")

    hours_before = _hours_before_start(current_session.start_time)
    if hours_before >= rule.hours_before:
        raise ValueError("Cancellation is not late according to current rule")

    existing_transaction = db.scalar(
        select(Transaction).where(
            Transaction.session_id == current_session.id,
            Transaction.status.in_([TransactionStatus.pending, TransactionStatus.paid]),
        )
    )
    if existing_transaction is not None:
        return existing_transaction

    if current_session.price is None:
        raise ValueError("Session price is missing")

    yookassa = YooKassaService()
    if not yookassa.settings.yookassa_shop_id or not yookassa.settings.yookassa_secret_key:
        raise ValueError("YooKassa credentials are not configured")

    payment_payload = {
        "amount": _to_amount(current_session.price),
        "capture": True,
        "payment_method_id": payment_method.yookassa_payment_method_id,
        "description": f"Late cancellation penalty for session {current_session.id}",
        "metadata": {
            "purpose": "late_cancellation_penalty",
            "user_id": str(user_id),
            "client_id": str(current_session.client_id),
            "session_id": str(current_session.id),
        },
    }
    idempotence_key = f"session_{current_session.id}_penalty"
    payment_response = yookassa.create_payment(payment_payload, idempotence_key=idempotence_key)
    provider_payment_id = payment_response.get("id")

    if provider_payment_id:
        existing_by_provider_id = db.scalar(
            select(Transaction).where(Transaction.yookassa_payment_id == provider_payment_id)
        )
        if existing_by_provider_id is not None:
            return existing_by_provider_id

    transaction = Transaction(
        client_id=current_session.client_id,
        session_id=current_session.id,
        amount=current_session.price,
        status=TransactionStatus.pending,
        yookassa_payment_id=provider_payment_id,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


def _save_payment_method_reference(db: Session, payment_object: dict[str, Any]) -> None:
    metadata = payment_object.get("metadata") or {}
    if metadata.get("purpose") != "attach_payment_method":
        return

    client_id = metadata.get("client_id")
    user_id = metadata.get("user_id")
    if not client_id:
        return
    client = db.get(Client, int(client_id))
    if client is None:
        return
    if user_id and str(client.user_id) != str(user_id):
        return

    payment_method = payment_object.get("payment_method") or {}
    payment_method_id = payment_method.get("id")
    if not payment_method_id:
        return

    existing = db.scalar(
        select(PaymentMethod).where(
            PaymentMethod.client_id == client.id,
            PaymentMethod.yookassa_payment_method_id == payment_method_id,
        )
    )
    if existing is not None:
        return

    card_info = payment_method.get("card") or {}
    new_method = PaymentMethod(
        client_id=client.id,
        yookassa_payment_method_id=payment_method_id,
        card_last4=card_info.get("last4"),
        card_brand=card_info.get("card_type"),
    )
    db.add(new_method)


def _update_transaction_status(
    db: Session,
    payment_id: str,
    status_value: TransactionStatus,
) -> bool:
    transaction = db.scalar(
        select(Transaction).where(Transaction.yookassa_payment_id == payment_id)
    )
    if transaction is None:
        return False

    # Final states are immutable for webhook retries/order variance.
    if transaction.status in {TransactionStatus.paid, TransactionStatus.failed, TransactionStatus.refunded}:
        return False

    transaction.status = status_value
    return True


def process_yookassa_webhook(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    event_type = payload.get("event", "unknown")
    payment_object = payload.get("object") or {}
    payment_id = payment_object.get("id", "unknown")
    provider_event_id = payload.get("event_id") or payload.get("id")
    event_id = str(provider_event_id or f"{event_type}:{payment_id}")

    existing_event = db.scalar(select(WebhookEvent).where(WebhookEvent.event_id == event_id))
    if existing_event is not None:
        return {"status": "duplicate", "event_id": event_id}

    webhook_event = WebhookEvent(
        event_id=event_id,
        event_type=event_type,
        payload_json=payload,
        processed=False,
    )
    db.add(webhook_event)
    db.flush()

    if event_type == "payment.succeeded":
        _save_payment_method_reference(db, payment_object)
        if payment_id != "unknown":
            _update_transaction_status(db, payment_id, TransactionStatus.paid)
    elif event_type in {"payment.canceled", "payment.failed"}:
        if payment_id != "unknown":
            _update_transaction_status(db, payment_id, TransactionStatus.failed)

    webhook_event.processed = True
    db.commit()

    return {"status": "processed", "event_id": event_id}
