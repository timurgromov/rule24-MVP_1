from __future__ import annotations

from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base
from models.mixins import TimestampMixin


class CancellationRule(TimestampMixin, Base):
    __tablename__ = "cancellation_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    hours_before: Mapped[int] = mapped_column(default=24, nullable=False)
    penalty_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)

    user: Mapped["User"] = relationship(back_populates="cancellation_rules")
