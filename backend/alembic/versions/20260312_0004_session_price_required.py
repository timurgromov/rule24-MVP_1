"""add session price as required field

Revision ID: 20260312_0004
Revises: 20260312_0003
Create Date: 2026-03-12 03:20:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260312_0004"
down_revision: Union[str, None] = "20260312_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "sessions",
        sa.Column("price", sa.Numeric(10, 2), nullable=False, server_default="0"),
    )
    op.alter_column("sessions", "price", server_default=None)


def downgrade() -> None:
    op.drop_column("sessions", "price")
