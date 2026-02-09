"""remove_story_table_and_context_story_id

Revision ID: b3d7e1d37e4e
Revises: 9c5d07931690
Create Date: 2026-02-09 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b3d7e1d37e4e"
down_revision: Union[str, Sequence[str], None] = "f5fe1073f488"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Drop stories table and context_resources.story_id column."""
    # Drop foreign key first
    try:
        op.drop_constraint(
            "context_resources_story_id_fkey", "context_resources", type_="foreignkey"
        )
    except Exception:
        # If constraint doesn't exist, proceed
        pass

    # Drop column
    op.drop_column("context_resources", "story_id")

    # Drop table
    op.drop_table("stories")


def downgrade() -> None:
    """Recreate stories table and context_resources.story_id column."""
    # Create stories table
    op.create_table(
        "stories",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("topic", sa.Text(), nullable=False),
        sa.Column("target_tense", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("highlights", sa.JSON(), nullable=False),
        sa.Column("grammar_notes", sa.JSON(), nullable=False),
        sa.Column(
            "created_at", sa.TIMESTAMP(), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_story_topic_tense", "stories", ["topic", "target_tense"])

    # Add column back
    op.add_column(
        "context_resources", sa.Column("story_id", sa.Integer(), nullable=True)
    )
    op.create_foreign_key(
        "context_resources_story_id_fkey",
        "context_resources",
        "stories",
        ["story_id"],
        ["id"],
    )
