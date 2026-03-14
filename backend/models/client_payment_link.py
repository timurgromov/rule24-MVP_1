from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base
from models.mixins import TimestampMixin


class ClientPaymentLinkStatus(str, enum.Enum):
    created = "created"
    opened = "opened"
    completed = "completed"
    expired = "expired"


class ClientPaymentLink(TimestampMixin, Base):
    __tablename__ = "client_payment_links"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("sessions.id", ondelete="CASCADE"), index=True
    )
    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), index=True
    )
    public_token: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    status: Mapped[ClientPaymentLinkStatus] = mapped_column(
        Enum(ClientPaymentLinkStatus, name="client_payment_link_status"),
        default=ClientPaymentLinkStatus.created,
        nullable=False,
    )
    opened_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    session: Mapped["Session"] = relationship(back_populates="client_payment_links")
    client: Mapped["Client"] = relationship(back_populates="client_payment_links")
