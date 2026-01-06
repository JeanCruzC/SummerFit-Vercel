"""Daily tracking helpers with Supabase persistence and local demo fallback."""
from __future__ import annotations

from datetime import date
from typing import Any, Dict, List, Tuple

import streamlit as st


class DailyTracker:
    def __init__(self, client=None, demo_mode: bool = False):
        self.client = client
        self.demo_mode = demo_mode or client is None
        st.session_state.setdefault("demo_logs", [])
        st.session_state.setdefault("demo_meals", [])

    def _today(self) -> date:
        return date.today()

    def list_logs(self, user_id: str, limit: int = 30) -> List[Dict]:
        if self.demo_mode:
            return sorted(st.session_state["demo_logs"], key=lambda x: x["log_date"], reverse=True)[:limit]
        try:
            resp = (
                self.client.table("daily_logs")
                .select("*")
                .eq("user_id", user_id)
                .order("log_date", desc=True)
                .limit(limit)
                .execute()
            )
            return resp.data or []
        except Exception:
            return []

    def upsert_log(self, user_id: str, payload: Dict[str, Any]) -> None:
        payload = payload.copy()
        payload.setdefault("log_date", self._today().isoformat())
        if self.demo_mode:
            payload["user_id"] = user_id
            st.session_state["demo_logs"] = [log for log in st.session_state["demo_logs"] if log["log_date"] != payload["log_date"]]
            st.session_state["demo_logs"].append(payload)
            return
        payload["user_id"] = user_id
        try:
            self.client.table("daily_logs").upsert(payload, on_conflict="user_id,log_date").execute()
        except Exception:
            pass

    def add_meal_entry(
        self, user_id: str, log_date: date, meal_type: str, name: str, grams: float, macros: Dict[str, Any]
    ) -> None:
        entry = {
            "user_id": user_id,
            "log_date": log_date.isoformat(),
            "meal_type": meal_type,
            "food_name": name,
            "grams": grams,
            "calories": macros.get("kcal"),
            "protein_g": macros.get("protein_g"),
            "carbs_g": macros.get("carbs_g"),
            "fat_g": macros.get("fat_g"),
        }
        if self.demo_mode:
            st.session_state["demo_meals"].append(entry)
            return
        try:
            self.client.table("meal_entries").insert(entry).execute()
        except Exception:
            pass

    def list_meal_entries(self, user_id: str, log_date: date) -> List[Dict]:
        if self.demo_mode:
            return [e for e in st.session_state["demo_meals"] if e["log_date"] == log_date.isoformat()]
        try:
            resp = (
                self.client.table("meal_entries")
                .select("*")
                .eq("user_id", user_id)
                .eq("log_date", log_date.isoformat())
                .order("created_at", desc=True)
                .execute()
            )
            return resp.data or []
        except Exception:
            return []

    def day_summary(self, entries: List[Dict]) -> Dict[str, float]:
        protein = sum(e.get("protein_g", 0) or 0 for e in entries)
        carbs = sum(e.get("carbs_g", 0) or 0 for e in entries)
        fat = sum(e.get("fat_g", 0) or 0 for e in entries)
        kcal = sum(e.get("calories", 0) or 0 for e in entries)
        return {"protein_g": protein, "carbs_g": carbs, "fat_g": fat, "kcal": kcal}

    def adherence(self, logs: List[Dict], kcal_target: float) -> Tuple[float, float]:
        if not logs:
            return 0, 0
        completed = sum(1 for log in logs if abs((log.get("calories_consumed") or 0) - kcal_target) <= kcal_target * 0.1)
        ratio = completed / len(logs)
        return ratio * 100, len(logs)
