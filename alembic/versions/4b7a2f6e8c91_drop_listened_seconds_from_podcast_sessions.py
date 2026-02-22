"""drop_listened_seconds_from_podcast_sessions

Revision ID: 4b7a2f6e8c91
Revises: 9c3f0d1a7e22
Create Date: 2026-02-22 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "4b7a2f6e8c91"
down_revision: Union[str, Sequence[str], None] = "9c3f0d1a7e22"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Preserve historical sessions created before active-time tracking:
    # if active is still 0 but listened has value, migrate listened -> active.
    op.execute(
        """
        UPDATE podcast_listening_sessions
        SET total_active_seconds = total_listened_seconds
        WHERE total_active_seconds = 0
          AND total_listened_seconds > 0
        """
    )
    op.drop_column("podcast_listening_sessions", "total_listened_seconds")


def downgrade() -> None:
    op.add_column(
        "podcast_listening_sessions",
        sa.Column(
            "total_listened_seconds",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.execute(
        """
        UPDATE podcast_listening_sessions
        SET total_listened_seconds = total_active_seconds
        WHERE total_active_seconds > 0
        """
    )
