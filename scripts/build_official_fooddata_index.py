#!/usr/bin/env python3
"""
Build an official FoodData Central index for fast lookups.

Usage:
  python scripts/build_official_fooddata_index.py \
    --csv-dir USDA/csv/FoodData_Central_csv_2025-12-18 \
    --out USDA/official_fooddata_index.json
"""

import argparse
import csv
import json
import os
import subprocess
from typing import Dict, Any, List, Tuple

try:
    from tqdm import tqdm
except ImportError:
    subprocess.check_call(['pip', 'install', 'tqdm', '-q'])
    from tqdm import tqdm

def count_lines(filepath: str) -> int:
    try:
        result = subprocess.run(['wc', '-l', filepath], capture_output=True, text=True)
        return int(result.stdout.split()[0])
    except:
        return 0

ALLOWED_TYPES = {"foundation_food", "sr_legacy_food", "survey_fndds_food", "branded_food"}

NUTRIENT_ID_MAP: Dict[str, Tuple[str, str]] = {
    "1008": ("kcal_per_100g", "kcal"),
    "1003": ("protein_g_per_100g", "g"),
    "1004": ("fat_g_per_100g", "g"),
    "1005": ("carbs_g_per_100g", "g"),
    "1079": ("fiber_g_per_100g", "g"),
    "2000": ("sugar_g_per_100g", "g"),
    "1235": ("added_sugars_g_per_100g", "g"),
    "1093": ("sodium_mg_per_100g", "mg"),
    "1258": ("saturated_fat_g_per_100g", "g"),
    "1162": ("vitamin_c_mg", "mg"),
    "1114": ("vitamin_d_iu", "ug"),
    "1177": ("folate_ug", "ug"),
    "1178": ("vitamin_b12_ug", "ug"),
    "1090": ("magnesium_mg", "mg"),
    "1092": ("potassium_mg", "mg"),
    "1087": ("calcium_mg", "mg"),
    "1089": ("iron_mg", "mg"),
}


def normalize_name(value: str) -> str:
    val = value.lower().strip()
    out = []
    for ch in val:
        if ch.isalnum() or ch.isspace():
            out.append(ch)
        else:
            out.append(" ")
    return " ".join("".join(out).split())


def load_foods(csv_dir: str) -> Dict[str, Dict[str, Any]]:
    foods_path = os.path.join(csv_dir, "food.csv")
    category_path = os.path.join(csv_dir, "food_category.csv")

    categories = {}
    if os.path.exists(category_path):
        with open(category_path, newline="", encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f)
            for row in reader:
                categories[row["id"]] = row.get("description") or ""

    foods: Dict[str, Dict[str, Any]] = {}
    total = count_lines(foods_path)
    with open(foods_path, newline="", encoding="utf-8", errors="ignore") as f:
        reader = csv.DictReader(f)
        for row in tqdm(reader, total=total, desc="📦 Loading foods", unit="rows"):
            data_type = row.get("data_type")
            if data_type not in ALLOWED_TYPES:
                continue
            fdc_id = row["fdc_id"]
            desc = row.get("description") or ""
            cat = categories.get(row.get("food_category_id") or "", "")
            processing_level = "minimally_processed"
            if data_type == "branded_food":
                processing_level = "ultra_processed"
            elif data_type in ("sr_legacy_food", "survey_fndds_food"):
                processing_level = "processed"
            foods[fdc_id] = {
                "fdc_id": fdc_id,
                "description": desc,
                "data_type": data_type,
                "food_category": cat,
                "processing_level": processing_level,
                "normalized_name": normalize_name(desc),
            }
    return foods


def load_portions(csv_dir: str, foods: Dict[str, Dict[str, Any]]) -> None:
    portion_path = os.path.join(csv_dir, "food_portion.csv")
    if not os.path.exists(portion_path):
        return
    measure_unit_path = os.path.join(csv_dir, "measure_unit.csv")
    measure_units: Dict[str, str] = {}
    if os.path.exists(measure_unit_path):
        with open(measure_unit_path, newline="", encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f)
            for row in reader:
                measure_units[row["id"]] = row.get("name") or ""
    total = count_lines(portion_path)
    with open(portion_path, newline="", encoding="utf-8", errors="ignore") as f:
        reader = csv.DictReader(f)
        for row in tqdm(reader, total=total, desc="🥄 Loading portions", unit="rows"):
            fdc_id = row.get("fdc_id")
            if fdc_id not in foods:
                continue
            gram_weight = row.get("gram_weight")
            if not gram_weight:
                continue
            try:
                grams = float(gram_weight)
            except ValueError:
                continue
            unit_name = measure_units.get(row.get("measure_unit_id") or "", "")
            desc = (row.get("portion_description") or "") + " " + (row.get("modifier") or "") + " " + unit_name
            desc = desc.strip().lower()
            current = foods[fdc_id].get("serving_equiv_grams")
            preferred = any(x in desc for x in ["cup", "slice", "tortilla", "tbsp", "tsp"])
            if current is None or preferred:
                foods[fdc_id]["serving_equiv_grams"] = grams
                foods[fdc_id]["serving_unit"] = desc or "portion"


def load_nutrients(csv_dir: str, foods: Dict[str, Dict[str, Any]]) -> None:
    nutrient_path = os.path.join(csv_dir, "food_nutrient.csv")
    if not os.path.exists(nutrient_path):
        return
    total = count_lines(nutrient_path)
    with open(nutrient_path, newline="", encoding="utf-8", errors="ignore") as f:
        reader = csv.DictReader(f)
        for row in tqdm(reader, total=total, desc="🧪 Loading nutrients", unit="rows"):
            fdc_id = row.get("fdc_id")
            if fdc_id not in foods:
                continue
            nut_id = row.get("nutrient_id")
            if nut_id not in NUTRIENT_ID_MAP:
                continue
            field, unit = NUTRIENT_ID_MAP[nut_id]
            try:
                value = float(row.get("amount") or 0)
            except ValueError:
                continue
            if unit == "ug" and field == "vitamin_d_iu":
                value = value * 40.0
            foods[fdc_id][field] = round(value, 2)

def load_branded_info(csv_dir: str, foods: Dict[str, Dict[str, Any]]) -> None:
    branded_path = os.path.join(csv_dir, "branded_food.csv")
    if not os.path.exists(branded_path):
        return
    with open(branded_path, newline="", encoding="utf-8", errors="ignore") as f:
        reader = csv.DictReader(f)
        for row in reader:
            fdc_id = row.get("fdc_id")
            if fdc_id not in foods:
                continue
            if row.get("ingredients"):
                foods[fdc_id]["ingredients"] = row.get("ingredients")
            if row.get("serving_size"):
                try:
                    foods[fdc_id]["serving_size"] = float(row.get("serving_size"))
                except ValueError:
                    pass
            if row.get("serving_size_unit"):
                foods[fdc_id]["serving_unit"] = row.get("serving_size_unit")
            if row.get("household_serving_fulltext"):
                foods[fdc_id]["household_serving_fulltext"] = row.get("household_serving_fulltext")
            if row.get("branded_food_category"):
                foods[fdc_id]["branded_food_category"] = row.get("branded_food_category")
            if row.get("data_source"):
                foods[fdc_id]["data_source"] = row.get("data_source")

def load_attributes(csv_dir: str, foods: Dict[str, Dict[str, Any]]) -> None:
    attr_path = os.path.join(csv_dir, "food_attribute.csv")
    attr_type_path = os.path.join(csv_dir, "food_attribute_type.csv")
    if not os.path.exists(attr_path) or not os.path.exists(attr_type_path):
        return
    attr_types: Dict[str, str] = {}
    with open(attr_type_path, newline="", encoding="utf-8", errors="ignore") as f:
        reader = csv.DictReader(f)
        for row in reader:
            attr_types[row["id"]] = row.get("name") or ""
    with open(attr_path, newline="", encoding="utf-8", errors="ignore") as f:
        reader = csv.DictReader(f)
        for row in reader:
            fdc_id = row.get("fdc_id")
            if fdc_id not in foods:
                continue
            attr_list = foods[fdc_id].setdefault("attributes", [])
            attr_list.append({
                "type": attr_types.get(row.get("food_attribute_type_id") or "", ""),
                "name": row.get("name"),
                "value": row.get("value"),
            })


def build_index(csv_dir: str) -> List[Dict[str, Any]]:
    foods = load_foods(csv_dir)
    load_portions(csv_dir, foods)
    load_nutrients(csv_dir, foods)
    load_branded_info(csv_dir, foods)
    load_attributes(csv_dir, foods)
    return list(foods.values())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv-dir", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    payload = build_index(args.csv_dir)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=True)
    print(f"✅ Wrote {len(payload)} foods to {args.out}")


if __name__ == "__main__":
    main()
