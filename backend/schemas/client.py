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
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
