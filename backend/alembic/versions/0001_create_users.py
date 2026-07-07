"""create users table

Revision ID: 0001_create_users
Revises:
Create Date: 2026-07-07

"""

from alembic import op
import sqlalchemy as sa

revision = "0001_create_users"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("email", sa.String, unique=True, nullable=False, index=True),
        sa.Column("password", sa.String, nullable=False),
        sa.Column("full_name", sa.String, nullable=False),
        sa.Column("role", sa.String, nullable=False),
    )


def downgrade():
    op.drop_table("users")
