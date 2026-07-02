"""Public marketing leads + newsletter subscribers.

Revision ID: 20260702_0001
Revises:
Create Date: 2026-07-02
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260702_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "leads",
        sa.Column("id", sa.BigInteger(), autoincrement=True, primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("phone", sa.String(32), nullable=False),
        sa.Column("email", sa.String(160), nullable=False),
        sa.Column("role", sa.String(120), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("source", sa.String(60), nullable=False, server_default="web_apply"),
        sa.Column("status", sa.String(20), nullable=False, server_default="new"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_leads_status_created", "leads", ["status", "created_at"])

    op.create_table(
        "newsletter_subscribers",
        sa.Column("id", sa.BigInteger(), autoincrement=True, primary_key=True),
        sa.Column("email", sa.String(160), nullable=False),
        sa.Column(
            "source",
            sa.String(60),
            nullable=False,
            server_default="web_newsletter",
        ),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("confirm_token", sa.String(64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("email", name="uq_newsletter_subscribers_email"),
    )


def downgrade() -> None:
    op.drop_table("newsletter_subscribers")
    op.drop_index("ix_leads_status_created", table_name="leads")
    op.drop_table("leads")
