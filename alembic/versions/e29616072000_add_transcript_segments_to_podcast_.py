"""add_transcript_segments_to_podcast_episode

Revision ID: e29616072000
Revises: 59ec2718643d
Create Date: 2026-02-07 15:53:00.615588

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "e29616072000"
down_revision: Union[str, Sequence[str], None] = "59ec2718643d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "podcast_episodes", sa.Column("transcript_segments", sa.JSON(), nullable=True)
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("podcast_episodes", "transcript_segments")
