"""Public lead capture models (academy applications + newsletter subscribers)."""

from __future__ import annotations

from sqlalchemy import Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IdMixin, TimestampMixin


class Lead(Base, IdMixin, TimestampMixin):
    """A top-of-funnel academy application from the public website."""

    __tablename__ = "leads"
    __table_args__ = (Index("ix_leads_status_created", "status", "created_at"),)

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    email: Mapped[str] = mapped_column(String(160), nullable=False)
    role: Mapped[str | None] = mapped_column(String(120), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(
        String(60), nullable=False, server_default="web_apply"
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="new",
        comment="new | contacted | qualified | converted | archived",
    )


class NewsletterSubscriber(Base, IdMixin, TimestampMixin):
    """A newsletter signup. `status` supports a double opt-in flow."""

    __tablename__ = "newsletter_subscribers"

    email: Mapped[str] = mapped_column(String(160), nullable=False, unique=True)
    source: Mapped[str] = mapped_column(
        String(60), nullable=False, server_default="web_newsletter"
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="pending",
        comment="pending | confirmed | unsubscribed",
    )
    confirm_token: Mapped[str | None] = mapped_column(String(64), nullable=True)
