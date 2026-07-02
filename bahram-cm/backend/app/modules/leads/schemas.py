"""Public lead schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LeadApplyIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    phone: str = Field(..., min_length=6, max_length=32)
    email: EmailStr
    role: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=4000)
    source: str = Field(default="web_apply", max_length=60)


class LeadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: str
    created_at: datetime


class NewsletterIn(BaseModel):
    email: EmailStr
    source: str = Field(default="web_newsletter", max_length=60)


class NewsletterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    status: str
    created_at: datetime
