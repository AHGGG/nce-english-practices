"""add_unique_constraint_for_review_item_scope

Revision ID: e6a1c9d4b2f7
Revises: d4e9b9a1c2f0
Create Date: 2026-02-21 17:40:00.000000

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "e6a1c9d4b2f7"
down_revision: Union[str, Sequence[str], None] = "d4e9b9a1c2f0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Keep one row per (user_id, source_id, sentence_index) before adding constraint.
    op.execute(
        """
        DELETE FROM review_items a
        USING review_items b
        WHERE a.id > b.id
          AND a.user_id = b.user_id
          AND a.source_id = b.source_id
          AND a.sentence_index = b.sentence_index;
        """
    )

    op.create_unique_constraint(
        "uq_review_item_user_source_sentence",
        "review_items",
        ["user_id", "source_id", "sentence_index"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_review_item_user_source_sentence",
        "review_items",
        type_="unique",
    )
