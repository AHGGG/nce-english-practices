"""add device awareness to podcast progress

Revision ID: c0f6d3834159
Revises: 118505373969
Create Date: 2026-02-01 19:52:57.521756

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "c0f6d3834159"
down_revision: Union[str, Sequence[str], None] = "118505373969"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add new columns to user_episode_states
    op.add_column(
        "user_episode_states", sa.Column("device_id", sa.String(), nullable=True)
    )
    op.add_column(
        "user_episode_states", sa.Column("device_type", sa.String(), nullable=True)
    )
    op.add_column(
        "user_episode_states", sa.Column("last_synced_at", sa.DateTime(), nullable=True)
    )
    op.add_column(
        "user_episode_states",
        sa.Column("local_version", sa.Integer(), server_default="0"),
    )
    op.add_column(
        "user_episode_states",
        sa.Column("playback_rate", sa.Float(), server_default="1.0"),
    )

    # Create index for faster lookups
    op.create_index(
        "ix_user_episode_device",
        "user_episode_states",
        ["user_id", "episode_id", "device_id"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_user_episode_device", table_name="user_episode_states")
    op.drop_column("user_episode_states", "playback_rate")
    op.drop_column("user_episode_states", "local_version")
    op.drop_column("user_episode_states", "last_synced_at")
    op.drop_column("user_episode_states", "device_type")
    op.drop_column("user_episode_states", "device_id")
