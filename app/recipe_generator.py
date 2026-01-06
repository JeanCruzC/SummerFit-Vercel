"""Generate macro-friendly recipe combinations."""
from __future__ import annotations

from typing import Dict, List

import pandas as pd


def filter_by_diet(foods: pd.DataFrame, diet_type: str) -> pd.DataFrame:
    df = foods.copy()
    if "category" not in df.columns:
        return df
    exclusions = {
        "Keto": ["Grano", "Dulce"],
        "Vegana": ["Carne", "Pescado", "Lácteo", "Huevo"],
        "Vegetariana": ["Carne", "Pescado"],
        "Paleo": ["Procesado", "Grano"],
    }
    exclude = exclusions.get(diet_type, [])
    if exclude:
        df = df[~df["category"].fillna("").str.contains("|".join(exclude), case=False, na=False)]
    return df


def build_option(protein, carb, fat, protein_target, carb_target, fat_target) -> Dict:
    protein_ratio = protein.get("protein_g_per_100g", 0) or 0.1
    carb_ratio = carb.get("carbs_g_per_100g", 0) or 0.1
    fat_ratio = fat.get("fat_g_per_100g", 0) or 0.1

    protein_grams = min(max(round((protein_target / protein_ratio) * 100, 1), 50), 240)
    carb_grams = min(max(round((carb_target / carb_ratio) * 100, 1), 50), 260)
    fat_grams = min(max(round((fat_target / fat_ratio) * 100, 1), 5), 60)

    total_kcal = (
        protein_ratio * protein_grams * 4 / 100
        + carb_ratio * carb_grams * 4 / 100
        + fat_ratio * fat_grams * 9 / 100
    )
    return {
        "items": [
            {"name": protein.get("name", "Proteína"), "grams": protein_grams, "icon": "🍗", **protein},
            {"name": carb.get("name", "Carbohidrato"), "grams": carb_grams, "icon": "🍚", **carb},
            {"name": fat.get("name", "Grasa"), "grams": fat_grams, "icon": "🥑", **fat},
        ],
        "totals": {
            "protein_g": round(protein_ratio * protein_grams / 100, 1),
            "carbs_g": round(carb_ratio * carb_grams / 100, 1),
            "fat_g": round(fat_ratio * fat_grams / 100, 1),
            "kcal": round(total_kcal, 1),
        },
    }


def generate_recipe_options(
    foods_df: pd.DataFrame,
    calorie_target: int,
    protein_target: float,
    carbs_target: float,
    fat_target: float,
    diet_type: str = "Estándar",
    limit: int = 3,
) -> List[Dict]:
    df = filter_by_diet(foods_df, diet_type)
    if df.empty:
        return []

    protein_foods = df.sort_values("protein_g_per_100g", ascending=False).head(6)
    carb_foods = df.sort_values("carbs_g_per_100g", ascending=False).head(6)
    fat_foods = df.sort_values("fat_g_per_100g", ascending=False).head(6)

    options: List[Dict] = []
    for idx in range(min(limit, len(protein_foods), len(carb_foods), len(fat_foods))):
        protein_row = protein_foods.iloc[idx % len(protein_foods)].to_dict()
        carb_row = carb_foods.iloc[idx % len(carb_foods)].to_dict()
        fat_row = fat_foods.iloc[idx % len(fat_foods)].to_dict()
        option = build_option(protein_row, carb_row, fat_row, protein_target, carbs_target, fat_target)
        # Align kcal with target
        scale = calorie_target / max(option["totals"]["kcal"], 1)
        if 0.7 <= scale <= 1.4:
            for item in option["items"]:
                item["grams"] = round(item["grams"] * scale, 1)
            option["totals"]["protein_g"] = round(option["totals"]["protein_g"] * scale, 1)
            option["totals"]["carbs_g"] = round(option["totals"]["carbs_g"] * scale, 1)
            option["totals"]["fat_g"] = round(option["totals"]["fat_g"] * scale, 1)
            option["totals"]["kcal"] = round(option["totals"]["kcal"] * scale, 1)
        option["diet_type"] = diet_type
        options.append(option)
    return options[:limit]

