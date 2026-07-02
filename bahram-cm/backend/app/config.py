"""Application configuration for the Bahram CM marketing API."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEV_LOCALHOST_CORS_REGEX = r"https?://(localhost|127\.0\.0\.1)(:\d+)?$"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_env: Literal["development", "staging", "production", "test"] = "development"
    app_name: str = "Bahram CM API"
    app_debug: bool = True
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    app_base_url: str = "http://localhost:8000"
    api_prefix: str = "/api/v1"

    secret_key: str = Field(min_length=32, default="change-me-please-32-characters-min-32")

    database_url: str = "mysql+aiomysql://bahram:bahram@localhost:3306/bahram_cm"
    database_url_sync: str = "mysql+pymysql://bahram:bahram@localhost:3306/bahram_cm"
    database_pool_size: int = 10
    database_max_overflow: int = 5
    database_echo: bool = False

    redis_url: str = "redis://localhost:6379/0"

    cors_origins: str = "http://localhost:3000"
    cors_origin_regex: str | None = None

    @field_validator("cors_origin_regex", mode="before")
    @classmethod
    def _blank_cors_regex(cls, v: object) -> str | None:
        if v is None:
            return None
        s = str(v).strip()
        return s or None

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def effective_cors_origin_regex(self) -> str | None:
        if self.cors_origin_regex:
            return self.cors_origin_regex
        if self.app_env in ("development", "test"):
            return _DEV_LOCALHOST_CORS_REGEX
        return None

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
