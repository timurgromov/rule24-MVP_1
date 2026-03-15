from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base
from models.mixins import TimestampMixin


class Client(TimestampMixin, Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="clients")
    payment_methods: Mapped[list["PaymentMethod"]] = relationship(
        back_populates="client"
    )
    sessions: Mapped[list["Session"]] = relationship(back_populates="client")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="client")
    client_payment_links: Mapped[list["ClientPaymentLink"]] = relationship(
        back_populates="client"
    )
