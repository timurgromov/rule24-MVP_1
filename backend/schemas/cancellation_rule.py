from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class CancellationRuleUpdate(BaseModel):
    hours_before: int = Field(ge=1, le=168, example=24)
    # Kept for backward compatibility; penalty is derived from session.price.
    penalty_amount: Decimal | None = Field(
        default=None,
        description="Legacy field. Not used as primary charge source.",
        json_schema_extra={"example": None},
    )


class CancellationRuleOut(BaseModel):
    id: int
    user_id: int
    hours_before: int
    penalty_amount: Decimal | None = Field(
        description="Legacy field. Not used as primary charge source.",
        json_schema_extra={"example": "1000.00"},
    )
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
