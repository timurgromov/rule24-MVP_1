from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class TransactionOut(BaseModel):
    id: int
    client_id: int
    session_id: int
    amount: Decimal = Field(
        description="Transaction amount in RUB.",
        json_schema_extra={"example": "3000.00"},
    )
    status: str
    yookassa_payment_id: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
