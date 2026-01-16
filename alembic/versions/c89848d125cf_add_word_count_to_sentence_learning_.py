"""add_word_count_to_sentence_learning_record

Revision ID: c89848d125cf
Revises: 9c5d07931690
Create Date: 2026-01-02 17:06:33.733188

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c89848d125cf"
down_revision: Union[str, Sequence[str], None] = "9c5d07931690"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add word_count column to sentence_learning_records."""
    op.add_column(
        "sentence_learning_records",
        sa.Column("word_count", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    """Remove word_count column from sentence_learning_records."""
    op.drop_column("sentence_learning_records", "word_count")
