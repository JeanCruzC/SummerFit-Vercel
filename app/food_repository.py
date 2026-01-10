"""Food data ingestion and retrieval utilities."""
from __future__ import annotations

from typing import Any, Dict, List, Sequence

import requests

from app.config import (
    get_foods_api_key,
    get_foods_api_timeout,
    get_foods_api_url,
)
from app.supabase_client import get_supabase_client

FoodRow = Dict[str, Any]


def fetch_foods_from_api() -> Sequence[FoodRow]:
    """Fetch the entire foods dataset from the external API.

    Relies on the external API returning the full dataset in one request.
    """
    api_url = get_foods_api_url()
    if not api_url:
        raise ValueError("FOODS_API_URL is required to fetch the dataset from the API")

    headers = {"Accept": "application/json"}
    api_key = get_foods_api_key()
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    response = requests.get(api_url, headers=headers, timeout=get_foods_api_timeout())
    response.raise_for_status()
    payload = response.json()

    if not isinstance(payload, list):
        raise ValueError("Expected the API to return a list of food records")
    return payload


def normalize_food_rows(raw_rows: Sequence[FoodRow]) -> List[FoodRow]:
    """Normalize raw API rows into the canonical Supabase schema."""
    normalized = []
    for row in raw_rows:
        normalized.append(
            {
                "name": row.get("name") or row.get("food_name"),
                "category": row.get("category") or row.get("Food Group"),
                "kcal_per_100g": row.get("kcal") or row.get("calories") or row.get("Calories"),
                "protein_g_per_100g": row.get("protein") or row.get("Protein (g)"),
                "carbs_g_per_100g": row.get("carbs") or row.get("carbohydrates") or row.get("Carbohydrate (g)"),
                "fat_g_per_100g": row.get("fat") or row.get("fats") or row.get("Fat (g)"),
                "source_id": row.get("id") or row.get("ID"),
            }
        )
    return normalized


def upsert_foods(rows: Sequence[FoodRow]) -> None:
    """Persist normalized food rows into Supabase with upsert semantics."""
    try:
        client = get_supabase_client()
        client.table("foods").upsert(list(rows)).execute()
    except Exception as e:
        print(f"Error upserting foods: {e}")
        # Optionally re-raise or handle specific DB errors


def read_foods(limit: int | None = None) -> List[FoodRow]:
    """Read foods from Supabase (cached in the app layer)."""
    client = get_supabase_client()
    query = client.table("foods").select("*")
    if limit:
        query = query.limit(limit)
    response = query.execute()
    return list(response.data or [])
