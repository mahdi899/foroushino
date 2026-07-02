"""Public marketing leads: academy applications + newsletter signups.

This module exposes UNAUTHENTICATED endpoints consumed by the public marketing
website (`web/`). Unlike `application` (which gates Tier 2 access for logged-in
users), these capture top-of-funnel leads from anonymous visitors, with IP-based
rate limiting to deter abuse.
"""
