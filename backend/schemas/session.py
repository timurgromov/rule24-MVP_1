from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

from schemas.transaction import TransactionOut

SessionStatusValue = Literal["scheduled", "completed", "cancelled"]
SessionOutcomeValue = Literal["completed", "late_cancellation", "no_show"]


class SessionCreate(BaseModel):
    client_id: int = Field(example=1)
    start_time: datetime = Field(example="2026-03-20T10:00:00Z")
    duration_minutes: int = Field(gt=0, le=720, example=60)
    price: Decimal = Field(
        gt=0,
        description="Full session price in RUB. Used as late-cancellation charge source.",
        json_schema_extra={"example": "3000.00"},
    )
    status: SessionStatusValue = "scheduled"
    notes: str | None = None


class SessionUpdate(BaseModel):
    client_id: int | None = None
    start_time: datetime | None = None
    duration_minutes: int | None = Field(default=None, gt=0, le=720)
    price: Decimal | None = Field(
        default=None,
        gt=0,
        description="Session price in RUB.",
        json_schema_extra={"example": "3500.00"},
    )
    status: SessionStatusValue | None = None
    notes: str | None = None


class SessionOut(BaseModel):
    id: int
    user_id: int
    client_id: int
    start_time: datetime
    duration_minutes: int
    price: Decimal = Field(
        description="Session price in RUB.",
        json_schema_extra={"example": "3000.00"},
    )
    status: SessionStatusValue
    outcome_confirmed: bool = Field(
        description="Therapist-confirmed real-world session outcome flag.",
        json_schema_extra={"example": False},
    )
    outcome_type: SessionOutcomeValue | None = Field(
        default=None,
        description="Therapist-confirmed real-world outcome. Separate from payment state.",
        json_schema_extra={"example": "completed"},
    )
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SessionCancelOut(BaseModel):
    session: SessionOut
    cancellation_window_hours: int
    hours_before_start: float
    is_late_cancellation: bool
    charge_amount: Decimal | None = Field(
        description="Late cancellation charge amount. Equals full session price when applicable.",
        json_schema_extra={"example": "3000.00"},
    )
    penalty_transaction: TransactionOut | None = None
    penalty_error: str | None = Field(
        default=None,
        description="Controlled error when late-cancellation penalty could not be started.",
    )


class SessionOutcomeConfirmIn(BaseModel):
    outcome_type: SessionOutcomeValue = Field(
        description="Therapist-confirmed real-world outcome for the session.",
        json_schema_extra={"example": "late_cancellation"},
    )
