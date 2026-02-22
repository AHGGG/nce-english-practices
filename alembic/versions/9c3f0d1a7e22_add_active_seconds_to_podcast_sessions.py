"""add_active_seconds_to_podcast_sessions

Revision ID: 9c3f0d1a7e22
Revises: e6a1c9d4b2f7
Create Date: 2026-02-22 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9c3f0d1a7e22"
down_revision: Union[str, Sequence[str], None] = "e6a1c9d4b2f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "podcast_listening_sessions",
        sa.Column(
            "total_active_seconds",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    op.drop_column("podcast_listening_sessions", "total_active_seconds")
