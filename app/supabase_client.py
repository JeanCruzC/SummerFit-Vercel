"""Supabase client helper."""
from functools import lru_cache

from supabase import Client, create_client

from app.config import get_supabase_key, get_supabase_url


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """Create and memoize a Supabase client."""
    url = get_supabase_url()
    key = get_supabase_key()
    return create_client(url, key)
