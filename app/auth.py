"""Simple Supabase authentication and profile persistence helpers."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional
import logging

from supabase import Client, create_client

from app.config import get_supabase_key, get_supabase_url

logger = logging.getLogger(__name__)


@dataclass
class AuthResult:
    user_id: str
    email: str


def build_client() -> Optional[Client]:
    """Return a Supabase client or None when env vars are missing."""
    try:
        url = get_supabase_url()
        key = get_supabase_key()
    except Exception as e:
        logger.error(f"Error getting Supabase config: {e}")
        return None
    try:
        return create_client(url, key)
    except Exception as e:
        logger.error(f"Error creating Supabase client: {e}")
        return None


class AuthService:
    """Wraps Supabase Auth + profile persistence."""

    def __init__(self, client: Optional[Client] = None):
        self.client = client or build_client()

    def sign_in(self, email: str, password: str) -> Optional[AuthResult]:
        if not self.client:
            return None
        try:
            response = self.client.auth.sign_in_with_password({"email": email, "password": password})
            if response and response.user:
                return AuthResult(user_id=response.user.id, email=response.user.email or email)
        except Exception as e:
            logger.error(f"Sign in error: {e}")
            return None
        return None

    def sign_up(self, email: str, password: str) -> Optional[AuthResult]:
        if not self.client:
            return None
        try:
            response = self.client.auth.sign_up({"email": email, "password": password})
            if response and response.user:
                return AuthResult(user_id=response.user.id, email=response.user.email or email)
        except Exception as e:
            logger.error(f"Sign up error: {e}")
            return None
        return None

    def get_profile(self, user_id: str) -> Dict[str, Any]:
        default_profile = {
            "gender": "M",
            "age": 28,
            "height_cm": 175,
            "weight_kg": 78.0,
            "target_weight_kg": 72.0,
            "goal": "Definir",
            "activity_level": "Moderado",
            "diet_type": "Estándar",
        }
        if not self.client:
            return default_profile
        try:
            response = (
                self.client.table("profiles")
                .select("*")
                .eq("user_id", user_id)
                .order("updated_at", desc=True)
                .limit(1)
                .execute()
            )
            if response.data:
                saved = response.data[0]
                return {
                    "gender": saved.get("gender", "M"),
                    "age": saved.get("age", 28),
                    "height_cm": int(saved.get("height_cm", 175)),
                    "weight_kg": float(saved.get("weight_kg", 78.0)),
                    "target_weight_kg": float(saved.get("target_weight_kg", 72.0)),
                    "goal": saved.get("goal", "Definir"),
                    "activity_level": saved.get("activity_level", "Moderado"),
                    "diet_type": saved.get("diet_type", "Estándar"),
                }
        except Exception as e:
            logger.error(f"Error fetching profile: {e}")
            pass
        return default_profile

    def upsert_profile(self, user_id: str, profile: Dict[str, Any]) -> None:
        if not self.client:
            return
        payload = {
            "user_id": user_id,
            "gender": profile.get("gender"),
            "age": profile.get("age"),
            "height_cm": profile.get("height_cm"),
            "weight_kg": profile.get("weight_kg"),
            "target_weight_kg": profile.get("target_weight_kg"),
            "goal": profile.get("goal"),
            "activity_level": profile.get("activity_level"),
            "diet_type": profile.get("diet_type"),
        }
        try:
            self.client.table("profiles").upsert(payload, on_conflict="user_id").execute()
        except Exception as e:
            logger.error(f"Error upserting profile: {e}")
            pass
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional

import streamlit as st
from supabase import Client, create_client

from app.config import get_supabase_key, get_supabase_url
import logging

logger = logging.getLogger(__name__)


@dataclass
class AuthResult:
    user_id: str
    email: str
    demo_mode: bool = False


def build_client() -> Optional[Client]:
    """Return a Supabase client or None when env vars are missing."""
    try:
        url = get_supabase_url()
        key = get_supabase_key()
    except Exception as e:
        logger.error(f"Error getting Supabase config: {e}")
        return None
    try:
        return create_client(url, key)
    except Exception as e:
        logger.error(f"Error creating Supabase client: {e}")
        return None


class AuthService:
    """Wraps Supabase Auth + profile persistence with a graceful demo fallback."""

    def __init__(self, client: Optional[Client] = None):
        self.client = client or build_client()
        self.demo_mode = self.client is None

    def sign_in(self, email: str, password: str) -> Optional[AuthResult]:
        if self.demo_mode:
            return AuthResult(user_id="demo-user", email=email, demo_mode=True)
        try:
            response = self.client.auth.sign_in_with_password({"email": email, "password": password})
            if response and response.user:
                return AuthResult(user_id=response.user.id, email=response.user.email or email, demo_mode=False)
        except Exception as e:
            logger.error(f"Sign in error: {e}")
            return None
        return None

    def sign_up(self, email: str, password: str) -> Optional[AuthResult]:
        if self.demo_mode:
            return AuthResult(user_id="demo-user", email=email, demo_mode=True)
        try:
            response = self.client.auth.sign_up({"email": email, "password": password})
            if response and response.user:
                return AuthResult(user_id=response.user.id, email=response.user.email or email, demo_mode=False)
        except Exception as e:
            logger.error(f"Sign up error: {e}")
            return None
        return None

    def get_profile(self, user_id: str) -> Dict[str, Any]:
        default_profile = {
            "gender": "M",
            "age": 28,
            "height_cm": 175,
            "weight_kg": 78.0,
            "target_weight_kg": 72.0,
            "goal": "Definir",
            "activity_level": "Moderado",
            "diet_type": "Estándar",
        }
        if self.demo_mode:
            return st.session_state.get("demo_profile", default_profile.copy())
        try:
            response = (
                self.client.table("profiles")
                .select("*")
                .eq("user_id", user_id)
                .order("updated_at", desc=True)
                .limit(1)
                .execute()
            )
            if response.data:
                saved = response.data[0]
                return {
                    "gender": saved.get("gender", "M"),
                    "age": saved.get("age", 28),
                    "height_cm": int(saved.get("height_cm", 175)),
                    "weight_kg": float(saved.get("weight_kg", 78.0)),
                    "target_weight_kg": float(saved.get("target_weight_kg", 72.0)),
                    "goal": saved.get("goal", "Definir"),
                    "activity_level": saved.get("activity_level", "Moderado"),
                    "diet_type": saved.get("diet_type", "Estándar"),
                }
        except Exception as e:
            logger.error(f"Error fetching profile: {e}")
            pass
        return default_profile

    def upsert_profile(self, user_id: str, profile: Dict[str, Any]) -> None:
        if self.demo_mode:
            st.session_state["demo_profile"] = profile
            return
        payload = {
            "user_id": user_id,
            "gender": profile.get("gender"),
            "age": profile.get("age"),
            "height_cm": profile.get("height_cm"),
            "weight_kg": profile.get("weight_kg"),
            "target_weight_kg": profile.get("target_weight_kg"),
            "goal": profile.get("goal"),
            "activity_level": profile.get("activity_level"),
            "diet_type": profile.get("diet_type"),
        }
        try:
            self.client.table("profiles").upsert(payload, on_conflict="user_id").execute()
        except Exception as e:
            logger.error(f"Error upserting profile: {e}")
            pass

