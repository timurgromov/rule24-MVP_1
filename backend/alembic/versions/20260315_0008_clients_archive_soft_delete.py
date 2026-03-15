"""add archived_at to clients for soft delete

Revision ID: 20260315_0008
Revises: 20260315_0007
Create Date: 2026-03-15 22:25:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260315_0008"
down_revision: Union[str, None] = "20260315_0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "clients",
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("clients", "archived_at")
