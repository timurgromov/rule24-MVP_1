from __future__ import annotations

import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base
from models.mixins import TimestampMixin


class SessionStatus(str, enum.Enum):
    scheduled = "scheduled"
    completed = "completed"
    cancelled = "cancelled"


class SessionOutcomeType(str, enum.Enum):
    completed = "completed"
    late_cancellation = "late_cancellation"
    no_show = "no_show"


class Session(TimestampMixin, Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"))
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[SessionStatus] = mapped_column(
        Enum(SessionStatus, name="session_status"), default=SessionStatus.scheduled
    )
    outcome_confirmed: Mapped[bool] = mapped_column(default=False, nullable=False)
    outcome_type: Mapped[SessionOutcomeType | None] = mapped_column(
        Enum(SessionOutcomeType, name="session_outcome_type"),
        nullable=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship(back_populates="sessions")
    client: Mapped["Client"] = relationship(back_populates="sessions")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="session")
    client_payment_links: Mapped[list["ClientPaymentLink"]] = relationship(
        back_populates="session"
    )
