"""Bahram CM — marketing site API (leads + newsletter)."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from starlette.responses import JSONResponse

from app.config import get_settings
from app.core.errors import DomainError
from app.core.logging import configure_logging
from app.db import models_registry  # noqa: F401
from app.db.redis import ping as redis_ping
from app.modules.leads.router import router as leads_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    log = structlog.get_logger("main")
    if not await redis_ping():
        log.warning("redis.unreachable", url=settings.redis_url)
    log.info("app.startup", env=settings.app_env, prefix=settings.api_prefix)
    yield
    log.info("app.shutdown")


def create_app() -> FastAPI:
    app = FastAPI(
        title=f"{settings.app_name}",
        version="0.1.0",
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
        docs_url=f"{settings.api_prefix}/docs",
        redoc_url=f"{settings.api_prefix}/redoc",
        openapi_url=f"{settings.api_prefix}/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_origin_regex=settings.effective_cors_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(DomainError)
    async def handle_domain_error(_req: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status,
            content={
                "error": {
                    "code": exc.code,
                    "message_fa": exc.message_fa,
                    "details": exc.details,
                }
            },
        )

    @app.get("/healthz", tags=["meta"])
    async def healthz() -> dict[str, Any]:
        return {"status": "ok", "version": app.version}

    app.include_router(leads_router, prefix=settings.api_prefix)
    return app


app = create_app()
