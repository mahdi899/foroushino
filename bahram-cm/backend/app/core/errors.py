"""Typed domain errors with HTTP mapping.

We never raise raw `HTTPException` from services. Services raise typed errors;
the exception handlers in `main.py` map them to HTTP responses with consistent,
RTL-friendly Persian error messages plus stable English error codes that
clients can switch on.
"""

from __future__ import annotations

from typing import Any


class DomainError(Exception):
    """Base class for all business-logic errors."""

    code: str = "domain_error"
    status: int = 400
    message_fa: str = "خطایی رخ داده است."

    def __init__(
        self,
        message_fa: str | None = None,
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.message_fa = message_fa or self.message_fa
        self.details = details or {}
        super().__init__(self.message_fa)


# ---------- Auth ----------


class PrivateAccessDenied(DomainError):
    code = "private_access_denied"
    status = 403
    message_fa = "این اپ خصوصی است."


class OTPInvalid(DomainError):
    code = "otp_invalid"
    status = 400
    message_fa = "کد وارد شده صحیح نیست."


class OTPExpired(DomainError):
    code = "otp_expired"
    status = 400
    message_fa = "کد منقضی شده است."


class OTPRateLimited(DomainError):
    code = "otp_rate_limited"
    status = 429
    message_fa = "لطفاً کمی صبر کن و دوباره تلاش کن."


class TooManyDevices(DomainError):
    code = "too_many_devices"
    status = 409
    message_fa = "این حساب در حال حاضر روی چند دستگاه فعال است."


class TokenInvalid(DomainError):
    code = "token_invalid"
    status = 401
    message_fa = "نشست شما منقضی شده است."


class TierRequired(DomainError):
    code = "tier_required"
    status = 403
    message_fa = "این بخش فقط برای اعضای حلقه‌ی درونی است."


# ---------- Academy ----------


class ChapterLocked(DomainError):
    code = "chapter_locked"
    status = 423
    message_fa = "این فصل هنوز باز نشده است."


class LessonNotFound(DomainError):
    code = "lesson_not_found"
    status = 404
    message_fa = "این درس پیدا نشد."


# ---------- Voice ----------


class VoiceNotPublished(DomainError):
    code = "voice_not_published"
    status = 404
    message_fa = "پیامی برای امروز هنوز منتشر نشده است."


# ---------- Generic ----------


class NotFound(DomainError):
    code = "not_found"
    status = 404
    message_fa = "موردی پیدا نشد."


class Conflict(DomainError):
    code = "conflict"
    status = 409
    message_fa = "این عملیات با وضعیت فعلی سازگار نیست."


class ValidationFailed(DomainError):
    code = "validation_failed"
    status = 422
    message_fa = "اطلاعات ارسالی معتبر نیست."


class RateLimited(DomainError):
    code = "rate_limited"
    status = 429
    message_fa = "تعداد درخواست‌ها بیش از حد مجاز است."
