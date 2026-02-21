"""add_listening_mode_to_podcast_sessions

Revision ID: a1c4d8e9f2b1
Revises: fc69483661a7
Create Date: 2026-02-21 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1c4d8e9f2b1"
down_revision: Union[str, Sequence[str], None] = "fc69483661a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "podcast_listening_sessions",
        sa.Column(
            "listening_mode",
            sa.String(),
            nullable=False,
            server_default="normal",
        ),
    )


def downgrade() -> None:
    op.drop_column("podcast_listening_sessions", "listening_mode")
