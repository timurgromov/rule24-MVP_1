"""sessions module refactor

Revision ID: 20260312_0002
Revises: 20260312_0001
Create Date: 2026-03-12 01:40:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "20260312_0002"
down_revision: Union[str, None] = "20260312_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

new_session_status = postgresql.ENUM(
    "scheduled",
    "completed",
    "cancelled",
    name="session_status_new",
)
old_session_status_tmp = postgresql.ENUM(
    "scheduled",
    "cancelled",
    "completed",
    "late_cancelled",
    "no_show",
    "paid",
    name="session_status_old",
)


def upgrade() -> None:
    bind = op.get_bind()
    new_session_status.create(bind, checkfirst=True)

    op.add_column(
        "sessions",
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute("UPDATE sessions SET start_time = scheduled_at")
    op.alter_column("sessions", "start_time", nullable=False)

    op.add_column(
        "sessions",
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="60"),
    )
    op.add_column("sessions", sa.Column("notes", sa.Text(), nullable=True))

    op.execute(
        """
        ALTER TABLE sessions
        ALTER COLUMN status
        TYPE session_status_new
        USING (
            CASE status::text
                WHEN 'completed' THEN 'completed'
                WHEN 'cancelled' THEN 'cancelled'
                ELSE 'scheduled'
            END
        )::session_status_new
        """
    )

    op.execute("DROP TYPE session_status")
    op.execute("ALTER TYPE session_status_new RENAME TO session_status")

    op.drop_column("sessions", "scheduled_at")
    op.drop_column("sessions", "price")


def downgrade() -> None:
    bind = op.get_bind()
    old_session_status_tmp.create(bind, checkfirst=True)

    op.add_column(
        "sessions",
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute("UPDATE sessions SET scheduled_at = start_time")
    op.alter_column("sessions", "scheduled_at", nullable=False)

    op.add_column(
        "sessions",
        sa.Column("price", sa.Numeric(10, 2), nullable=False, server_default="0"),
    )

    op.execute(
        """
        ALTER TABLE sessions
        ALTER COLUMN status
        TYPE session_status_old
        USING (
            CASE status::text
                WHEN 'completed' THEN 'completed'
                WHEN 'cancelled' THEN 'cancelled'
                ELSE 'scheduled'
            END
        )::session_status_old
        """
    )

    op.execute("DROP TYPE session_status")
    op.execute("ALTER TYPE session_status_old RENAME TO session_status")

    op.drop_column("sessions", "notes")
    op.drop_column("sessions", "duration_minutes")
    op.drop_column("sessions", "start_time")
