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
    """Normalize raw API rows into the canonical Supabase schema.
    
    Supports both legacy CSV format and USDA FoodData Central format.
    """
    normalized = []
    for row in raw_rows:
        food = {
            "name": row.get("name") or row.get("food_name") or row.get("description"),
            "category": row.get("category") or row.get("Food Group"),
            "kcal_per_100g": row.get("kcal") or row.get("calories") or row.get("Calories") or row.get("kcal_per_100g"),
            "protein_g_per_100g": row.get("protein") or row.get("Protein (g)") or row.get("protein_g_per_100g"),
            "carbs_g_per_100g": row.get("carbs") or row.get("carbohydrates") or row.get("Carbohydrate (g)") or row.get("carbs_g_per_100g"),
            "fat_g_per_100g": row.get("fat") or row.get("fats") or row.get("Fat (g)") or row.get("fat_g_per_100g"),
            "source_id": row.get("id") or row.get("ID") or row.get("source_id"),
        }
        
        # USDA extended fields (optional)
        usda_fields = [
            "fdc_id", "fiber_g_per_100g", "sugar_g_per_100g", "sodium_mg_per_100g",
            "cholesterol_mg_per_100g", "saturated_fat_g_per_100g", "potassium_mg_per_100g",
            "calcium_mg_per_100g", "iron_mg_per_100g", "vitamin_a_iu_per_100g",
            "vitamin_c_mg_per_100g", "vitamin_d_iu_per_100g", "data_source",
            "serving_size_g", "serving_description", "brand_name", "ingredients"
        ]
        
        for field in usda_fields:
            if field in row and row[field] is not None:
                food[field] = row[field]
        
        normalized.append(food)
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
