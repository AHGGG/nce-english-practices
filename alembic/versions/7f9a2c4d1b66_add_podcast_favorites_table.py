"""add podcast favorites table

Revision ID: 7f9a2c4d1b66
Revises: b3d7e1d37e4e
Create Date: 2026-02-14 11:10:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7f9a2c4d1b66"
down_revision: Union[str, Sequence[str], None] = "b3d7e1d37e4e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "podcast_favorite_episodes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("episode_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["episode_id"], ["podcast_episodes.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id", "episode_id", name="uq_podcast_favorite_episode"
        ),
    )
    op.create_index(
        "idx_podcast_favorite_user_created",
        "podcast_favorite_episodes",
        ["user_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        "idx_podcast_favorite_user_created",
        table_name="podcast_favorite_episodes",
    )
    op.drop_table("podcast_favorite_episodes")
