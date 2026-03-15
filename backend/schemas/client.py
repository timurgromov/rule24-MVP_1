from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class ClientCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=32)
    notes: str | None = None


class ClientUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=32)
    notes: str | None = None


class ClientOut(BaseModel):
    id: int
    user_id: int
    name: str
    email: EmailStr | None
    phone: str | None
    notes: str | None
    has_saved_payment_method: bool = False
    card_last4: str | None = None
    card_brand: str | None = None
    payment_method_bound_at: datetime | None = None
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
