"""add session outcome confirmation fields

Revision ID: 20260313_0005
Revises: 20260312_0004
Create Date: 2026-03-13 02:10:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "20260313_0005"
down_revision: Union[str, None] = "20260312_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

session_outcome_type = postgresql.ENUM(
    "completed",
    "late_cancellation",
    "no_show",
    name="session_outcome_type",
)


def upgrade() -> None:
    bind = op.get_bind()
    session_outcome_type.create(bind, checkfirst=True)

    op.add_column(
        "sessions",
        sa.Column("outcome_confirmed", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.alter_column("sessions", "outcome_confirmed", server_default=None)

    op.add_column(
        "sessions",
        sa.Column("outcome_type", session_outcome_type, nullable=True),
    )


def downgrade() -> None:
    bind = op.get_bind()

    op.drop_column("sessions", "outcome_type")
    op.drop_column("sessions", "outcome_confirmed")

    session_outcome_type.drop(bind, checkfirst=True)
