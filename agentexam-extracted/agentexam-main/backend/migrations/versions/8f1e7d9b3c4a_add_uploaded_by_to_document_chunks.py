"""Add uploaded_by to document_chunks

Revision ID: 8f1e7d9b3c4a
Revises: 2e36b0e1ddca
Create Date: 2026-08-22 12:36:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f1e7d9b3c4a'
down_revision: Union[str, Sequence[str], None] = '2e36b0e1ddca'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'document_chunks',
        sa.Column('uploaded_by', sa.UUID(), nullable=True)
    )
    op.create_foreign_key(
        'fk_document_chunks_uploaded_by_user',
        'document_chunks',
        'user',
        ['uploaded_by'],
        ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_document_chunks_uploaded_by_user', 'document_chunks', type_='foreignkey')
    op.drop_column('document_chunks', 'uploaded_by')
