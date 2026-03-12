from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserOut(BaseModel):
    id: int
    email: EmailStr
    name: str
    subscription_status: str | None
    subscription_until: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
