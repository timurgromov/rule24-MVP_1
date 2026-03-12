from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class CardAttachmentInitOut(BaseModel):
    payment_id: str
    confirmation_url: str | None


class PenaltyChargeOut(BaseModel):
    transaction_id: int
    session_id: int
    amount: Decimal = Field(
        description="Derived from session.price for late cancellation.",
        json_schema_extra={"example": "3000.00"},
    )
    status: str
    yookassa_payment_id: str | None
    created_at: datetime
