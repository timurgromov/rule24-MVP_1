from datetime import datetime

from pydantic import BaseModel

from models.client_payment_link import ClientPaymentLinkStatus


class ClientPaymentLinkOut(BaseModel):
    id: int
    session_id: int
    client_id: int
    public_token: str
    status: ClientPaymentLinkStatus
    client_url_path: str
    created_at: datetime
    opened_at: datetime | None = None
    completed_at: datetime | None = None
    expired_at: datetime | None = None

    model_config = {"from_attributes": True}


class ClientPaymentLinkPublicOut(BaseModel):
    id: int
    public_token: str
    status: ClientPaymentLinkStatus
    session_id: int
    client_id: int
    client_name: str
    session_start_time: datetime
    session_duration_minutes: int
    session_price: str
    session_notes: str | None = None
    created_at: datetime
    opened_at: datetime | None = None
    completed_at: datetime | None = None
    expired_at: datetime | None = None
