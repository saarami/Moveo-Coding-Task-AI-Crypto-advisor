"""decouple feedback from daily_content

Revision ID: a8f3c1b0d924
Revises: 7e926063c2cd
Create Date: 2026-05-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a8f3c1b0d924'
down_revision: Union[str, None] = '7e926063c2cd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Drop old unique constraint that included daily_content_id
    op.drop_constraint('uq_feedback_vote', 'feedback', type_='unique')

    # 2. Drop index on daily_content_id before removing the column
    op.drop_index('ix_feedback_daily_content_id', table_name='feedback')

    # 3. Drop daily_content_id column (PostgreSQL drops its FK constraint automatically)
    op.drop_column('feedback', 'daily_content_id')

    # 4. Add content_snapshot column (nullable Text, matching project style for JSON storage)
    op.add_column('feedback', sa.Column('content_snapshot', sa.Text(), nullable=True))

    # 5. Deduplicate rows: keep only the most recent row per (user_id, section_type, content_item_id)
    #    Required before adding the new unique constraint.
    op.execute("""
        DELETE FROM feedback
        WHERE id NOT IN (
            SELECT MAX(id)
            FROM feedback
            GROUP BY user_id, section_type, content_item_id
        )
    """)

    # 6. Add new unique constraint — feedback is now independent of daily_content
    op.create_unique_constraint(
        'uq_feedback_user_section_item',
        'feedback',
        ['user_id', 'section_type', 'content_item_id'],
    )


def downgrade() -> None:
    # NOTE: This downgrade is schema-reversible only — data integrity is NOT fully
    # restored. daily_content_id is added back as a nullable column with no foreign
    # key (the original values no longer exist). Because PostgreSQL treats NULLs as
    # distinct in unique constraints, uq_feedback_vote cannot actually enforce
    # one-vote-per-section after the downgrade. The app will be runnable but the
    # original deduplication guarantee will not hold until daily_content_id values
    # are manually backfilled.

    # Drop new constraint
    op.drop_constraint('uq_feedback_user_section_item', 'feedback', type_='unique')

    # Drop content_snapshot column
    op.drop_column('feedback', 'content_snapshot')

    # Add daily_content_id back as nullable int (no FK — historical values are lost)
    op.add_column('feedback', sa.Column('daily_content_id', sa.Integer(), nullable=True))
    op.create_index('ix_feedback_daily_content_id', 'feedback', ['daily_content_id'], unique=False)

    # Restore old unique constraint structure (NULL != NULL in PostgreSQL unique
    # constraints, so this will not raise errors, but see note above)
    op.create_unique_constraint(
        'uq_feedback_vote',
        'feedback',
        ['user_id', 'daily_content_id', 'section_type', 'content_item_id'],
    )
