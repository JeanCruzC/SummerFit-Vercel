"""Configuration utilities for environment-driven settings."""
import os
from typing import Optional


def get_supabase_url() -> str:
    url = os.getenv("SUPABASE_URL", "").strip()
    if not url:
        raise ValueError("SUPABASE_URL is required to connect to Supabase")
    return url


def get_supabase_key() -> str:
    key = os.getenv("SUPABASE_KEY", "").strip()
    if not key:
        raise ValueError("SUPABASE_KEY is required to connect to Supabase")
    return key


def get_foods_api_url() -> Optional[str]:
    return os.getenv("FOODS_API_URL", "").strip() or None


def get_foods_api_key() -> Optional[str]:
    return os.getenv("FOODS_API_KEY", "").strip() or None


def get_foods_api_timeout() -> int:
    raw_timeout = os.getenv("FOODS_API_TIMEOUT_SECONDS", "").strip()
    if not raw_timeout:
        return 30
    try:
        timeout = int(raw_timeout)
    except ValueError as exc:  # pragma: no cover - defensive
        raise ValueError("FOODS_API_TIMEOUT_SECONDS must be an integer") from exc
    return max(timeout, 1)



