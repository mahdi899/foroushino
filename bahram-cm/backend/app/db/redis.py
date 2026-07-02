"""Async Redis client (single connection pool)."""

from __future__ import annotations

import redis.asyncio as redis

from app.config import get_settings

_settings = get_settings()

redis_client: redis.Redis = redis.from_url(
    _settings.redis_url,
    encoding="utf-8",
    decode_responses=True,
    max_connections=64,
)


async def ping() -> bool:
    try:
        return bool(await redis_client.ping())
    except Exception:
        return False
