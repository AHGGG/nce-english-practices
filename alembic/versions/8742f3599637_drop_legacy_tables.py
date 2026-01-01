"""drop_legacy_tables

Revision ID: 8742f3599637
Revises: c6f72c1affd5
Create Date: 2026-01-01 22:24:10.848357

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8742f3599637'
down_revision: Union[str, Sequence[str], None] = 'c6f72c1affd5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Drop unused legacy tables."""
    # Drop tables in correct order (foreign keys first)
    op.drop_table('srs_schedule')
    op.drop_table('review_notes')
    op.drop_table('chat_sessions')
    op.drop_table('coach_sessions')
    op.drop_table('user_memories')
    op.drop_table('user_progress')
    op.drop_table('sessions')  # SessionLog table


def downgrade() -> None:
    """Recreate legacy tables (not recommended)."""
    # Create sessions table
    op.create_table('sessions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('topic', sa.Text(), nullable=False),
        sa.Column('vocab_json', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_sessions_topic', 'sessions', ['topic'])

    # Create chat_sessions table
    op.create_table('chat_sessions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('mission_data', sa.JSON(), nullable=False),
        sa.Column('history', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create coach_sessions table
    op.create_table('coach_sessions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.Text(), nullable=False),
        sa.Column('started_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.Column('ended_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('summary', sa.JSON(), nullable=True),
        sa.Column('message_count', sa.Integer(), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create user_memories table
    op.create_table('user_memories',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Text(), nullable=False),
        sa.Column('key', sa.Text(), nullable=False),
        sa.Column('value', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_user_memories_user_id', 'user_memories', ['user_id'])
    op.create_index('ix_user_memories_key', 'user_memories', ['key'])

    # Create user_progress table
    op.create_table('user_progress',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Text(), nullable=False),
        sa.Column('topic', sa.Text(), nullable=False),
        sa.Column('mastery_level', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('last_practiced', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.Column('practice_count', sa.Integer(), nullable=False, server_default='1'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_progress_user_topic', 'user_progress', ['user_id', 'topic'])

    # Create review_notes table
    op.create_table('review_notes',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('original_sentence', sa.Text(), nullable=True),
        sa.Column('better_sentence', sa.Text(), nullable=True),
        sa.Column('note_type', sa.Text(), nullable=False, server_default='grammar'),
        sa.Column('tags', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create srs_schedule table
    op.create_table('srs_schedule',
        sa.Column('note_id', sa.Integer(), nullable=False),
        sa.Column('next_review_at', sa.TIMESTAMP(), nullable=False),
        sa.Column('interval_days', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('ease_factor', sa.Integer(), nullable=False),
        sa.Column('repetitions', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['note_id'], ['review_notes.id'], ),
        sa.PrimaryKeyConstraint('note_id')
    )
    op.create_index('ix_srs_schedule_next_review_at', 'srs_schedule', ['next_review_at'])

