"""Single import point for ORM models used by this API."""

from __future__ import annotations

from app.modules.leads import models as _leads  # noqa: F401

from app.db.base import Base

__all__ = ["Base"]
