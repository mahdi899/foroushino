"""Public lead service: capture academy applications + newsletter signups.

IP-based rate limiting deters abuse on these unauthenticated endpoints. If Redis
is unreachable we fail open (allow), preferring lead capture over hard failure —
the website is the primary growth surface.
"""

from __future__ import annotations

import secrets

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import RateLimited
from app.db.redis import redis_client
from app.modules.leads.models import Lead, NewsletterSubscriber
from app.modules.leads.schemas import (
    LeadApplyIn,
    LeadOut,
    NewsletterIn,
    NewsletterOut,
)

log = structlog.get_logger("leads")

# Per-IP limits (sliding fixed-window).
_APPLY_LIMIT = 5
_APPLY_WINDOW_S = 3600
_NEWSLETTER_LIMIT = 10
_NEWSLETTER_WINDOW_S = 3600


async def _rate_limit(bucket: str, ip: str, limit: int, window_s: int) -> None:
    key = f"ratelimit:leads:{bucket}:{ip}"
    try:
        count = await redis_client.incr(key)
        if count == 1:
            await redis_client.expire(key, window_s)
        if count > limit:
            raise RateLimited("تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کن.")
    except RateLimited:
        raise
    except Exception:  # noqa: BLE001 — fail open if Redis is down
        log.warning("leads.ratelimit.unavailable", bucket=bucket)


class LeadsService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def submit_apply(self, *, data: LeadApplyIn, ip: str) -> LeadOut:
        await _rate_limit("apply", ip, _APPLY_LIMIT, _APPLY_WINDOW_S)
        row = Lead(
            name=data.name.strip(),
            phone=data.phone.strip(),
            email=str(data.email).strip().lower(),
            role=(data.role or None),
            notes=(data.notes or None),
            source=data.source,
            status="new",
        )
        self.db.add(row)
        await self.db.commit()
        await self.db.refresh(row)
        log.info("leads.apply.captured", lead_id=row.id, source=row.source)
        return LeadOut.model_validate(row)

    async def subscribe_newsletter(
        self, *, data: NewsletterIn, ip: str
    ) -> NewsletterOut:
        await _rate_limit(
            "newsletter", ip, _NEWSLETTER_LIMIT, _NEWSLETTER_WINDOW_S
        )
        email = str(data.email).strip().lower()
        existing = await self.db.scalar(
            select(NewsletterSubscriber).where(
                NewsletterSubscriber.email == email
            )
        )
        if existing is not None:
            # Idempotent: re-subscribe reactivates an unsubscribed address.
            if existing.status == "unsubscribed":
                existing.status = "pending"
                existing.confirm_token = secrets.token_urlsafe(24)
                await self.db.commit()
                await self.db.refresh(existing)
            return NewsletterOut.model_validate(existing)

        row = NewsletterSubscriber(
            email=email,
            source=data.source,
            status="pending",
            confirm_token=secrets.token_urlsafe(24),
        )
        self.db.add(row)
        await self.db.commit()
        await self.db.refresh(row)
        log.info("leads.newsletter.captured", subscriber_id=row.id)
        return NewsletterOut.model_validate(row)
