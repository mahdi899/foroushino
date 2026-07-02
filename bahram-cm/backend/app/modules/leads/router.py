"""Public lead routes (unauthenticated, rate-limited)."""

from __future__ import annotations

from fastapi import APIRouter, Request, status

from app.core.dependencies import DbDep
from app.modules.leads.schemas import (
    LeadApplyIn,
    LeadOut,
    NewsletterIn,
    NewsletterOut,
)
from app.modules.leads.service import LeadsService

router = APIRouter(prefix="/leads", tags=["leads"])


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post(
    "/apply",
    response_model=LeadOut,
    status_code=status.HTTP_201_CREATED,
    summary="درخواست ورود به آکادمی (عمومی)",
)
async def apply(payload: LeadApplyIn, request: Request, db: DbDep) -> LeadOut:
    return await LeadsService(db).submit_apply(data=payload, ip=_client_ip(request))


@router.post(
    "/newsletter",
    response_model=NewsletterOut,
    status_code=status.HTTP_201_CREATED,
    summary="عضویت در خبرنامه (عمومی)",
)
async def newsletter(
    payload: NewsletterIn, request: Request, db: DbDep
) -> NewsletterOut:
    return await LeadsService(db).subscribe_newsletter(
        data=payload, ip=_client_ip(request)
    )
