"""add_phrase_clicks_and_voice_sessions

Revision ID: 3f9d128aa4e1
Revises: c89848d125cf
Create Date: 2026-01-02 17:15:XX

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3f9d128aa4e1'
down_revision: Union[str, Sequence[str], None] = 'c89848d125cf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add phrase_clicks column and create voice_sessions table."""
    # Add phrase_clicks to sentence_learning_records
    op.add_column('sentence_learning_records',
                  sa.Column('phrase_clicks', sa.JSON(), nullable=False, server_default='[]'))
    
    # Create voice_sessions table
    op.create_table(
        'voice_sessions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Text(), nullable=False, server_default='default_user'),
        sa.Column('started_at', sa.TIMESTAMP(), server_default=sa.func.now(), nullable=False),
        sa.Column('ended_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('total_active_seconds', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('source_type', sa.Text(), nullable=True),
        sa.Column('source_id', sa.Text(), nullable=True),
        sa.Column('word_lookup_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('words_looked_up', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('got_it_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('example_navigation_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('audio_play_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_vs_user_started', 'voice_sessions', ['user_id', 'started_at'])


def downgrade() -> None:
    """Remove phrase_clicks column and drop voice_sessions table."""
    op.drop_index('idx_vs_user_started', 'voice_sessions')
    op.drop_table('voice_sessions')
    op.drop_column('sentence_learning_records', 'phrase_clicks')
