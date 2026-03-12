"""initial schema

Revision ID: 20260312_0001
Revises: 
Create Date: 2026-03-12 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "20260312_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

session_status = postgresql.ENUM(
    "scheduled",
    "cancelled",
    "completed",
    "late_cancelled",
    "no_show",
    "paid",
    name="session_status",
)
transaction_status = postgresql.ENUM(
    "pending",
    "paid",
    "failed",
    "refunded",
    name="transaction_status",
)
subscription_status = postgresql.ENUM(
    "trial",
    "active",
    "cancelled",
    "expired",
    name="subscription_status",
)
session_status_column = postgresql.ENUM(
    "scheduled",
    "cancelled",
    "completed",
    "late_cancelled",
    "no_show",
    "paid",
    name="session_status",
    create_type=False,
)
transaction_status_column = postgresql.ENUM(
    "pending",
    "paid",
    "failed",
    "refunded",
    name="transaction_status",
    create_type=False,
)
subscription_status_column = postgresql.ENUM(
    "trial",
    "active",
    "cancelled",
    "expired",
    name="subscription_status",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    session_status.create(bind, checkfirst=True)
    transaction_status.create(bind, checkfirst=True)
    subscription_status.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("subscription_status", sa.String(length=50), nullable=True),
        sa.Column("subscription_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "cancellation_rules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("hours_before", sa.Integer(), nullable=False, server_default="24"),
        sa.Column("penalty_amount", sa.Numeric(10, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("plan", sa.String(length=64), nullable=False),
        sa.Column("status", subscription_status_column, nullable=False),
        sa.Column("trial_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", session_status_column, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "payment_methods",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("yookassa_payment_method_id", sa.String(length=255), nullable=False),
        sa.Column("card_last4", sa.String(length=4), nullable=True),
        sa.Column("card_brand", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_payment_methods_yookassa_payment_method_id",
        "payment_methods",
        ["yookassa_payment_method_id"],
        unique=False,
    )

    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", transaction_status_column, nullable=False),
        sa.Column("yookassa_payment_id", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_transactions_yookassa_payment_id",
        "transactions",
        ["yookassa_payment_id"],
        unique=False,
    )

    op.create_table(
        "webhook_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_id", sa.String(length=255), nullable=False),
        sa.Column("event_type", sa.String(length=128), nullable=False),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column("processed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_webhook_events_event_id", "webhook_events", ["event_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_webhook_events_event_id", table_name="webhook_events")
    op.drop_table("webhook_events")

    op.drop_index("ix_transactions_yookassa_payment_id", table_name="transactions")
    op.drop_table("transactions")

    op.drop_index(
        "ix_payment_methods_yookassa_payment_method_id",
        table_name="payment_methods",
    )
    op.drop_table("payment_methods")

    op.drop_table("sessions")
    op.drop_table("subscriptions")
    op.drop_table("cancellation_rules")
    op.drop_table("clients")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    bind = op.get_bind()
    subscription_status.drop(bind, checkfirst=True)
    transaction_status.drop(bind, checkfirst=True)
    session_status.drop(bind, checkfirst=True)
