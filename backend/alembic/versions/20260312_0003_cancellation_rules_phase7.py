"""phase7 cancellation rules

Revision ID: 20260312_0003
Revises: 20260312_0002
Create Date: 2026-03-12 02:20:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260312_0003"
down_revision: Union[str, None] = "20260312_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO cancellation_rules (user_id, hours_before, created_at, updated_at)
        SELECT users.id, 24, NOW(), NOW()
        FROM users
        LEFT JOIN cancellation_rules ON cancellation_rules.user_id = users.id
        WHERE cancellation_rules.id IS NULL
        """
    )

    op.execute(
        """
        DELETE FROM cancellation_rules older
        USING cancellation_rules newer
        WHERE older.user_id = newer.user_id
          AND older.id < newer.id
        """
    )

    op.create_index(
        "ix_cancellation_rules_user_id",
        "cancellation_rules",
        ["user_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_cancellation_rules_user_id", table_name="cancellation_rules")
