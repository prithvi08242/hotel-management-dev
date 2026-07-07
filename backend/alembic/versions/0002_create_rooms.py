"""create rooms table

Revision ID: 0002_create_rooms
Revises: 0001_create_users
Create Date: 2026-07-07

"""

from alembic import op
import sqlalchemy as sa

revision = "0002_create_rooms"
down_revision = "0001_create_users"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "rooms",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("room_number", sa.String, unique=True, nullable=False),
        sa.Column("room_type", sa.String, nullable=False),
        sa.Column("price_per_night", sa.Numeric(10, 2), nullable=False),
        sa.Column("max_occupancy", sa.Integer, nullable=False),
        sa.Column("is_available", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("description", sa.String, nullable=True),
    )


def downgrade():
    op.drop_table("rooms")
