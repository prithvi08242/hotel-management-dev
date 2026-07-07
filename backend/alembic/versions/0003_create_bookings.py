"""create bookings table

Revision ID: 0003_create_bookings
Revises: 0002_create_rooms
Create Date: 2026-07-07

"""

from alembic import op
import sqlalchemy as sa

revision = "0003_create_bookings"
down_revision = "0002_create_rooms"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "bookings",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("room_id", sa.Integer, sa.ForeignKey("rooms.id"), nullable=False),
        sa.Column("check_in", sa.Date, nullable=False),
        sa.Column("check_out", sa.Date, nullable=False),
        sa.Column("status", sa.String, nullable=False, server_default="confirmed"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
    )


def downgrade():
    op.drop_table("bookings")
