import json
import os
import re
from typing import Dict, List, Optional

import requests


def load_env_value(key: str) -> Optional[str]:
    value = os.environ.get(key)
    if value:
        return value
    env_path = os.path.join("web", ".env.local")
    if not os.path.exists(env_path):
        return None
    with open(env_path, "r", encoding="utf-8") as fh:
        for line in fh:
            if line.startswith(f"{key}="):
                return line.split("=", 1)[1].strip()
    return None


SUPABASE_URL = load_env_value("NEXT_PUBLIC_SUPABASE_URL")
SERVICE_KEY = load_env_value("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SERVICE_KEY:
    raise SystemExit("Missing Supabase URL or service key. Set env vars or web/.env.local.")

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
}

WHOLE_GRAIN_IDS = {
    "30815",  # Quinua
    "30796",  # Avena
    "30829",  # Arroz integral
    "30124",  # Pan integral
    "30240",  # Tortilla integral
    "30773",  # Pasta integral
}


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def has_any(text: str, terms: List[str]) -> bool:
    return any(t in text for t in terms)


def detect_internal_category(row: Dict) -> str:
    cat_search = norm(
        f"{row.get('category','')} {row.get('category_es','')} {row.get('culinary_category','')} "
        f"{row.get('name','')} {row.get('name_es','')}"
    )

    is_legume = has_any(cat_search, [
        "legumbre", "bean", "lentil", "chickpea", "garbanzo", "frijol", "frejol", "alubia", "haba", "pallar"
    ])
    if has_any(cat_search, ["proteina", "carne", "pescado", "mariscos", "huevo", "chicken", "beef", "pork", "turkey", "fish", "meat", "egg", "tofu"]):
        return "protein"
    if is_legume:
        return "legume"
    if has_any(cat_search, ["carbohidrato", "grano", "cereal", "pan", "pasta", "arroz", "rice", "bread", "oat", "quinoa", "quinua", "kiwicha", "potato", "camote", "yuca", "cassava", "papa"]):
        return "carb"
    if has_any(cat_search, ["verdura", "vegetal", "hortaliza", "vegetable", "spinach", "broccoli", "lettuce", "zucchini", "tomato"]):
        return "vegetable"
    if has_any(cat_search, ["grasa", "aceite", "nuez", "semilla", "oil", "nut", "seed", "avocado", "palta"]):
        return "fat"
    if has_any(cat_search, ["fruta", "fruit", "apple", "banana", "berry", "orange"]):
        return "fruit"
    if has_any(cat_search, ["lacteo", "leche", "queso", "yogurt", "dairy", "milk", "cheese"]):
        return "dairy"
    return "condiment"


def detect_whole_grain(row: Dict) -> bool:
    if str(row.get("id")) in WHOLE_GRAIN_IDS:
        return True
    name_mix = norm(f"{row.get('name','')} {row.get('name_es','')}")
    if re.search(r"(integral|whole|bran|oat|avena|quinoa|quinua|trigo|centeno)", name_mix):
        return True
    return False


def estimate_serving_equiv(category: str, row: Dict) -> float:
    unit = norm(row.get("serving_unit", "")) or "g"
    s_size = row.get("serving_size_g") or row.get("serving_size") or 100
    try:
        s_size = float(s_size)
    except Exception:
        s_size = 100.0

    if category == "vegetable":
        return 90.0
    if category == "fruit":
        return 150.0
    if category == "dairy":
        if "cup" in unit:
            return 244.0
        if "container" in unit and s_size >= 120:
            return s_size
        return s_size if s_size >= 120 else 244.0
    if category in ("protein", "legume"):
        return 85.0
    if category == "carb":
        if "cup" in unit:
            return 90.0
        if "slice" in unit or "tortilla" in unit:
            return 30.0
        if "oz" in unit:
            return 28.0
        return s_size if s_size >= 40 else 60.0
    if category == "fat":
        if "tbsp" in unit:
            return 14.0
        if "tsp" in unit:
            return 5.0
        name_mix = norm(f"{row.get('name','')} {row.get('name_es','')}")
        if "avocado" in name_mix or "palta" in name_mix:
            return 50.0
        if re.search(r"(nut|seed|almond|peanut|chia|flax)", name_mix):
            return 14.0
        return 20.0
    return s_size


def estimate_added_sugars(row: Dict, category: str) -> float:
    sugar = row.get("sugar_g_per_100g") or row.get("sugars_g") or 0
    try:
        sugar = float(sugar)
    except Exception:
        sugar = 0.0
    ingredients = norm(row.get("ingredients", ""))
    has_sugar = re.search(r"(sugar|azucar|honey|syrup|jarabe|maltodextrin|dextrose|glucose|fructose|molasses)", ingredients) is not None
    tier = row.get("food_tier") or 1

    if has_sugar:
        return sugar
    if int(tier) >= 2 and sugar > 0:
        return sugar
    if category in ("fruit", "vegetable") and int(tier) == 1:
        return 0.0
    return 0.0


def estimate_fiber(row: Dict, category: str) -> float:
    fiber = row.get("fiber_g_per_100g") or row.get("fiber_g") or 0
    try:
        fiber = float(fiber)
    except Exception:
        fiber = 0.0
    if fiber > 0:
        return fiber
    carbs = row.get("carbs_g_per_100g") or 0
    kcal = row.get("kcal_per_100g") or 0
    try:
        carbs = float(carbs)
        kcal = float(kcal)
    except Exception:
        carbs = 0.0
        kcal = 0.0

    if category == "legume":
        return min(max(carbs * 0.35, 4), 9)
    if category == "vegetable":
        return min(max(carbs * 0.4, 1.5), 5)
    if category == "fruit":
        return min(max(carbs * 0.25, 1.5), 4.5)
    if category == "carb":
        base = min(max(carbs * 0.1, 0.5), 3.5)
        if detect_whole_grain(row):
            return min(base + 1.5, 6)
        return base
    if category == "fat":
        if re.search(r"(nut|seed|almond|peanut|chia|flax)", norm(row.get("name", ""))):
            return min(max(kcal * 0.01, 2), 12)
        return 0.0
    return 0.0


def to_usda_group(category: str, whole_grain: bool) -> str:
    if category == "carb":
        return "whole_grain" if whole_grain else "refined_grain"
    if category == "legume":
        return "protein"
    return category


def processing_level(row: Dict) -> str:
    tier = row.get("food_tier") or 1
    if int(tier) >= 3:
        return "ultra_processed"
    if int(tier) == 2:
        return "processed"
    return "minimally_processed"


def fetch_foods(offset: int, limit: int = 500) -> List[Dict]:
    params = {
        "select": "id,name,name_es,category,category_es,culinary_category,food_tier,serving_size,serving_size_g,serving_unit,ingredients,sugar_g_per_100g,sugars_g,carbs_g_per_100g,fiber_g_per_100g,kcal_per_100g,is_whole_grain,usda_group,serving_equiv_grams,processing_level,added_sugars_g_per_100g,data_quality_flags",
        "order": "id",
        "limit": limit,
        "offset": offset,
    }
    resp = requests.get(f"{SUPABASE_URL}/rest/v1/foods", headers=HEADERS, params=params, timeout=60)
    resp.raise_for_status()
    return resp.json()


def update_batch(rows: List[Dict]) -> None:
    if not rows:
        return
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/foods?on_conflict=id",
        headers=HEADERS,
        data=json.dumps(rows),
        timeout=60,
    )
    if resp.status_code >= 300:
        raise RuntimeError(f"Update failed: {resp.status_code} {resp.text[:500]}")


def main() -> None:
    offset = 0
    batch_updates: List[Dict] = []
    updated = 0

    while True:
        rows = fetch_foods(offset)
        if not rows:
            break
        for row in rows:
            internal_cat = detect_internal_category(row)
            whole_grain = detect_whole_grain(row)
            updates: Dict = {"id": row["id"]}

            if not row.get("usda_group"):
                updates["usda_group"] = to_usda_group(internal_cat, whole_grain)
            if row.get("is_whole_grain") is None:
                updates["is_whole_grain"] = whole_grain
            if not row.get("processing_level"):
                updates["processing_level"] = processing_level(row)
            if not row.get("serving_equiv_grams"):
                updates["serving_equiv_grams"] = estimate_serving_equiv(internal_cat, row)

            if row.get("added_sugars_g_per_100g") in (None, 0):
                updates["added_sugars_g_per_100g"] = estimate_added_sugars(row, internal_cat)

            if row.get("fiber_g_per_100g") in (None, 0):
                updates["fiber_g_per_100g"] = estimate_fiber(row, internal_cat)

            flags = row.get("data_quality_flags") or {}
            if not isinstance(flags, dict):
                flags = {}
            flags.update({
                "usda_group_est": row.get("usda_group") is None,
                "whole_grain_est": row.get("is_whole_grain") is None,
                "processing_level_est": row.get("processing_level") is None,
                "serving_equiv_est": row.get("serving_equiv_grams") is None,
                "added_sugars_est": row.get("added_sugars_g_per_100g") in (None, 0),
                "fiber_est": row.get("fiber_g_per_100g") in (None, 0),
            })
            updates["data_quality_flags"] = flags

            batch_updates.append(updates)
            if len(batch_updates) >= 200:
                update_batch(batch_updates)
                updated += len(batch_updates)
                print(f"Updated {updated} foods...")
                batch_updates = []

        offset += len(rows)

    if batch_updates:
        update_batch(batch_updates)
        updated += len(batch_updates)

    print(f"Done. Updated {updated} foods.")


if __name__ == "__main__":
    main()
