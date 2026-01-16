"""drop_attempts_and_user_goals_tables

Revision ID: 9c5d07931690
Revises: 8742f3599637
Create Date: 2026-01-02 16:26:42.759973

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9c5d07931690"
down_revision: Union[str, Sequence[str], None] = "8742f3599637"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Drop legacy attempts and user_goals tables."""
    op.drop_table("attempts")
    op.drop_table("user_goals")


def downgrade() -> None:
    """Recreate attempts and user_goals tables."""
    op.create_table(
        "attempts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("activity_type", sa.Text(), nullable=False),
        sa.Column("topic", sa.Text(), nullable=True),
        sa.Column("tense", sa.Text(), nullable=True),
        sa.Column("input_data", sa.JSON(), nullable=False),
        sa.Column("user_response", sa.JSON(), nullable=False),
        sa.Column("is_pass", sa.Boolean(), nullable=False),
        sa.Column("xp_earned", sa.Integer(), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=False),
        sa.Column(
            "created_at", sa.TIMESTAMP(), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_attempts_activity_type", "attempts", ["activity_type"])
    op.create_index("ix_attempts_created_at", "attempts", ["created_at"])

    op.create_table(
        "user_goals",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("goal_type", sa.Text(), nullable=False),
        sa.Column("target_value", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at", sa.TIMESTAMP(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.TIMESTAMP(), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_user_goals_user", "user_goals", ["user_id"])
