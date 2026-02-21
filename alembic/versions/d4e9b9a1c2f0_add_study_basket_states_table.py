"""add_study_basket_states_table

Revision ID: d4e9b9a1c2f0
Revises: a1c4d8e9f2b1
Create Date: 2026-02-21 16:20:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d4e9b9a1c2f0"
down_revision: Union[str, Sequence[str], None] = "a1c4d8e9f2b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "study_basket_states",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("source_type", sa.Text(), nullable=False),
        sa.Column("content_id", sa.Text(), nullable=False),
        sa.Column("lookup_items", sa.JSON(), nullable=False),
        sa.Column("bookmarked_sentences", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "source_type",
            "content_id",
            name="uq_study_basket_scope",
        ),
    )
    op.create_index(
        "ix_study_basket_states_user_id",
        "study_basket_states",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "idx_study_basket_user_updated",
        "study_basket_states",
        ["user_id", "updated_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("idx_study_basket_user_updated", table_name="study_basket_states")
    op.drop_index("ix_study_basket_states_user_id", table_name="study_basket_states")
    op.drop_table("study_basket_states")
