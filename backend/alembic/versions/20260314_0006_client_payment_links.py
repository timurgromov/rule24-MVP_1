"""add client payment links entity

Revision ID: 20260314_0006
Revises: 20260313_0005
Create Date: 2026-03-14 15:30:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "20260314_0006"
down_revision: Union[str, None] = "20260313_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

client_payment_link_status = postgresql.ENUM(
    "created",
    "opened",
    "completed",
    "expired",
    name="client_payment_link_status",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    client_payment_link_status.create(bind, checkfirst=True)

    op.create_table(
        "client_payment_links",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("public_token", sa.String(length=255), nullable=False),
        sa.Column("status", client_payment_link_status, nullable=False),
        sa.Column("opened_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expired_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_client_payment_links_client_id",
        "client_payment_links",
        ["client_id"],
        unique=False,
    )
    op.create_index(
        "ix_client_payment_links_public_token",
        "client_payment_links",
        ["public_token"],
        unique=True,
    )
    op.create_index(
        "ix_client_payment_links_session_id",
        "client_payment_links",
        ["session_id"],
        unique=False,
    )


def downgrade() -> None:
    bind = op.get_bind()

    op.drop_index("ix_client_payment_links_session_id", table_name="client_payment_links")
    op.drop_index("ix_client_payment_links_public_token", table_name="client_payment_links")
    op.drop_index("ix_client_payment_links_client_id", table_name="client_payment_links")
    op.drop_table("client_payment_links")

    client_payment_link_status.drop(bind, checkfirst=True)
