#!/usr/bin/env python3
"""
COMPREHENSIVE FOOD DATA COMPLETION SCRIPT
Uses Qwen AI to intelligently fill ALL empty fields in the foods table.

Usage:
  python complete_food_data.py --limit 100 --dry-run  # Test first
  python complete_food_data.py --limit 500           # Real run

Required env vars:
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_KEY)
  DASHSCOPE_API_KEY
"""

import os
import sys
import json
import argparse
import time
import hashlib
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

# Load environment from web/.env.local if running locally
def load_env():
    env_path = os.path.join(os.path.dirname(__file__), '..', 'web', '.env.local')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ.setdefault(key, value)

load_env()

import subprocess
try:
    from tqdm import tqdm
except ImportError:
    subprocess.check_call(['pip', 'install', 'tqdm', '-q'])
    from tqdm import tqdm

from supabase import create_client
import requests

MAX_RETRIES = int(os.environ.get("FOOD_COMPLETION_MAX_RETRIES", "5"))
BACKOFF_BASE = float(os.environ.get("FOOD_COMPLETION_BACKOFF", "1.5"))

# ============================================================
# CONFIGURATION
# ============================================================

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1")
OPENAI_TIMEOUT = float(os.environ.get("OPENAI_TIMEOUT", "120"))
OPENAI_MAX_RETRIES = int(os.environ.get("OPENAI_MAX_RETRIES", "5"))
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
OFFICIAL_DATA_PATH = os.environ.get("OFFICIAL_DATA_PATH")
BATCH_SIZE = int(os.environ.get("FOOD_COMPLETION_BATCH_SIZE", "250"))
SCAN_ALL = os.environ.get("FOOD_COMPLETION_SCAN_ALL", "1") == "1"

# Fields to fill with AI
FIELDS_CONFIG = {
    # Translations
    "category_es": {"type": "translation", "source": "category", "priority": 1},
    
    # USDA Classification
    "usda_food_group": {"type": "classification", "priority": 2},
    "is_whole_grain": {"type": "boolean", "priority": 2},
    "processing_level": {"type": "enum", "values": ["minimally_processed", "processed", "ultra_processed"], "priority": 2},
    
    # Serving info
    "serving_equiv_grams": {"type": "numeric", "priority": 3},
    "serving_size": {"type": "numeric", "priority": 3},
    "serving_unit": {"type": "text", "priority": 3},
    "ingredients": {"type": "text", "priority": 3},
    
    # Macronutrients (CRITICAL)
    "kcal_per_100g": {"type": "nutrient", "priority": 4},
    "protein_g_per_100g": {"type": "nutrient", "priority": 4},
    "carbs_g_per_100g": {"type": "nutrient", "priority": 4},
    "fat_g_per_100g": {"type": "nutrient", "priority": 4},
    "fiber_g_per_100g": {"type": "nutrient", "priority": 4},
    "sugar_g_per_100g": {"type": "nutrient", "priority": 4},
    "sodium_mg_per_100g": {"type": "nutrient", "priority": 4},
    "saturated_fat_g_per_100g": {"type": "nutrient", "priority": 4},
    
    # Micronutrients
    "vitamin_c_mg": {"type": "nutrient", "priority": 5},
    "vitamin_d_iu": {"type": "nutrient", "priority": 5},
    "folate_ug": {"type": "nutrient", "priority": 5},
    "vitamin_b12_ug": {"type": "nutrient", "priority": 5},
    "magnesium_mg": {"type": "nutrient", "priority": 5},
}

VALID_GROUPS = [
    "protein", "dairy", "vegetables", "fruits", "whole_grain",
    "refined_grain", "fat", "legume", "condiment", "beverage"
]

NUMERIC_RANGES = {
    "kcal_per_100g": (0, 900),
    "protein_g_per_100g": (0, 100),
    "carbs_g_per_100g": (0, 100),
    "fat_g_per_100g": (0, 100),
    "fiber_g_per_100g": (0, 40),
    "sugar_g_per_100g": (0, 90),
    "sodium_mg_per_100g": (0, 5000),
    "saturated_fat_g_per_100g": (0, 50),
    "vitamin_c_mg": (0, 500),
    "vitamin_d_iu": (0, 2000),
    "folate_ug": (0, 1500),
    "vitamin_b12_ug": (0, 50),
    "magnesium_mg": (0, 600),
    "serving_equiv_grams": (1, 500),
}

GROUP_RANGES = {
    "vegetables": {"sugar_g_per_100g": (0, 20), "fiber_g_per_100g": (0, 15)},
    "fruits": {"sugar_g_per_100g": (0, 35), "fiber_g_per_100g": (0, 12)},
    "dairy": {"sugar_g_per_100g": (0, 25)},
    "protein": {"sodium_mg_per_100g": (0, 2500)},
    "fat": {"sugar_g_per_100g": (0, 15), "fiber_g_per_100g": (0, 20)},
    "legume": {"fiber_g_per_100g": (0, 25)},
}

OFFICIAL_INDEX = None
CATEGORY_TRANSLATION_CACHE: Dict[str, str] = {}
CACHE_FILE = "category_translation_cache.json"

def load_cache():
    global CATEGORY_TRANSLATION_CACHE
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r') as f:
                CATEGORY_TRANSLATION_CACHE = json.load(f)
        except:
            pass

def save_cache():
    try:
        with open(CACHE_FILE, 'w') as f:
            json.dump(CATEGORY_TRANSLATION_CACHE, f)
    except:
        pass

load_cache()

STATIC_CATEGORY_MAP = {
    "Vegetables and Vegetable Products": "Verduras y Hortalizas",
    "Fruits and Fruit Juices": "Frutas y Jugos",
    "Dairy and Egg Products": "Lácteos y Huevos",
    "Poultry Products": "Aves",
    "Pork Products": "Cerdo",
    "Beef Products": "Res",
    "Finfish and Shellfish Products": "Pescados y Mariscos",
    "Legumes and Legume Products": "Legumbres",
    "Baked Products": "Productos Horneados",
    "Sweets": "Dulces",
    "Cereal Grains and Pasta": "Cereales y Pastas",
    "Sausages and Luncheon Meats": "Embutidos",
    "Breakfast Cereals": "Cereales de Desayuno",
    "Beverages": "Bebidas",
    "Fats and Oils": "Grasas y Aceites",
    "Nut and Seed Products": "Nueces y Semillas",
    "Snacks": "Snacks",
    "Spices and Herbs": "Especias y Hierbas",
    "Soups, Sauces, and Gravies": "Sopas y Salsas",
    "Lamb, Veal, and Game Products": "Cordero y Caza",
    "Meals, Entrees, and Side Dishes": "Comidas Preparadas"
}

# ============================================================
# AI FUNCTIONS
# ============================================================

def call_qwen_ai(prompt: str, max_retries: Optional[int] = None) -> Optional[str]:
    """Call Qwen AI via OpenAI-compatible API."""
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY not set")
    
    url = f"{OPENAI_BASE_URL}/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "qwen-turbo",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_tokens": 1000
    }
    
    retries = OPENAI_MAX_RETRIES if max_retries is None else max_retries
    for attempt in range(retries):
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=OPENAI_TIMEOUT)
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"]
            elif response.status_code == 429:
                time.sleep(2 ** attempt)
                continue
            else:
                print(f"  ⚠️ API error: {response.status_code} - {response.text[:100]}")
                time.sleep(1)
        except Exception as e:
            print(f"  ⚠️ Request error (attempt {attempt+1}/{retries}): {e}")
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
    return None

def normalize_name(value: str) -> str:
    return ''.join(ch for ch in value.lower().strip() if ch.isalnum() or ch.isspace())

def safe_json_load(value: Any) -> Dict[str, Any]:
    if not value:
        return {}
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return {}
    return {}

def field_is_missing(food: Dict[str, Any], field: str) -> bool:
    val = food.get(field)
    if val is None or (isinstance(val, str) and val.strip() == ""):
        return True
    flags = safe_json_load(food.get("data_quality_flags"))
    unknown_fields = set(flags.get("unknown_fields", []) or [])
    if field in unknown_fields:
        return True
    field_sources = (flags.get("field_sources") or {})
    if field_sources.get(field) in ("unknown", "estimated_missing"):
        return True
    if field_sources.get(field) in ("usda", "official"):
        return False
    return False

def build_missing_filter() -> str:
    parts = []
    for col, cfg in FIELDS_CONFIG.items():
        if cfg["type"] == "translation" or cfg["type"] in ("classification", "enum"):
            parts.append(f"{col}.is.null")
            parts.append(f"{col}.eq.\"\"")
        else:
            parts.append(f"{col}.is.null")
    return ",".join(parts)

def load_official_index() -> Optional[Dict[str, Dict[str, Any]]]:
    global OFFICIAL_INDEX
    if OFFICIAL_INDEX is not None:
        return OFFICIAL_INDEX
    if not OFFICIAL_DATA_PATH or not os.path.exists(OFFICIAL_DATA_PATH):
        OFFICIAL_INDEX = None
        return None
    try:
        with open(OFFICIAL_DATA_PATH, "r", encoding="utf-8") as f:
            payload = json.load(f)
        records = payload if isinstance(payload, list) else payload.get("foods", [])
        index: Dict[str, Dict[str, Any]] = {}
        for rec in records:
            name = rec.get("name") or rec.get("description") or ""
            fdc_id = rec.get("fdc_id") or rec.get("id")
            if fdc_id:
                index[str(fdc_id)] = rec
            if name:
                index[normalize_name(name)] = rec
        OFFICIAL_INDEX = index
        return OFFICIAL_INDEX
    except Exception as exc:
        print(f"  ⚠️ Failed to load official data: {exc}")
        OFFICIAL_INDEX = None
        return None

def get_official_completion(food: Dict[str, Any], missing_fields: List[str]) -> Dict[str, Any]:
    index = load_official_index()
    if not index:
        return {}
    key_candidates = [
        str(food.get("fdc_id") or ""),
        normalize_name(food.get("name", "")),
        normalize_name(food.get("name_es", "")),
    ]
    official = None
    for key in key_candidates:
        if key and key in index:
            official = index[key]
            break
    if not official:
        return {}
    completed = {}
    for field in missing_fields:
        if field in official and official[field] is not None:
            completed[field] = official[field]
    return completed

def build_completion_prompt(food: Dict[str, Any], missing_fields: List[str]) -> str:
    """Build a comprehensive prompt to fill all missing fields at once."""
    
    # Existing data for context
    context = {
        "name": food.get("name", ""),
        "name_es": food.get("name_es", ""),
        "category": food.get("category", ""),
        "category_es": food.get("category_es", ""),
        "usda_food_group": food.get("usda_food_group", ""),
        "food_tier": food.get("food_tier"),
        "serving_size": food.get("serving_size"),
        "serving_unit": food.get("serving_unit"),
        "ingredients": food.get("ingredients", ""),
        "kcal_per_100g": food.get("kcal_per_100g"),
        "protein_g_per_100g": food.get("protein_g_per_100g"),
        "carbs_g_per_100g": food.get("carbs_g_per_100g"),
        "fat_g_per_100g": food.get("fat_g_per_100g"),
    }
    
    prompt = f"""You are a nutrition database expert. Complete the missing fields for this food item.

FOOD DATA:
{json.dumps(context, indent=2)}

MISSING FIELDS TO FILL:
{json.dumps(missing_fields)}

FIELD DEFINITIONS:
- category_es: Spanish translation of category
- usda_food_group: One of: protein, dairy, vegetables, fruits, whole_grain, refined_grain, fat, legume, condiment, beverage
- is_whole_grain: true/false - Is this a whole grain food?
- processing_level: One of: minimally_processed, processed, ultra_processed
- serving_equiv_grams: USDA standard serving size in grams (e.g., 30 for bread slice, 90 for vegetable cup)
- kcal_per_100g: Calories per 100g
- protein_g_per_100g: Protein in grams per 100g
- carbs_g_per_100g: Total carbohydrates in grams per 100g
- fat_g_per_100g: Total fat in grams per 100g
- fiber_g_per_100g: Dietary fiber in grams per 100g
- sugar_g_per_100g: Total sugars in grams per 100g
- sodium_mg_per_100g: Sodium in mg per 100g
- saturated_fat_g_per_100g: Saturated fat in grams per 100g
- vitamin_c_mg: Vitamin C in mg per 100g
- vitamin_d_iu: Vitamin D in IU per 100g
- folate_ug: Folate in mcg per 100g
- vitamin_b12_ug: Vitamin B12 in mcg per 100g
- magnesium_mg: Magnesium in mg per 100g

Return ONLY a valid JSON object with the missing fields filled plus a "confidence" number (0-1).
Use null if truly unknown.
Example: {{"category_es": "Lácteos", "usda_food_group": "dairy", "is_whole_grain": false, "confidence": 0.72}}
"""
    return prompt

def parse_ai_response(response: str) -> Optional[Dict[str, Any]]:
    """Parse AI response to extract JSON data."""
    if not response:
        return None
    
    # Find JSON in response
    try:
        # Try direct parse
        return json.loads(response)
    except json.JSONDecodeError:
        pass
    
    # Try to extract JSON from markdown code block
    import re
    json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', response, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass
    
    # Try to find raw JSON object
    json_match = re.search(r'\{[^{}]*\}', response, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(0))
        except json.JSONDecodeError:
            pass
    
    return None

def validate_and_clean(food: Dict[str, Any], data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and clean AI-generated data."""
    cleaned = {}
    
    for key, value in data.items():
        if key not in FIELDS_CONFIG:
            continue
        
        config = FIELDS_CONFIG[key]
        
        if value is None:
            continue
            
        # Type validation
        if config["type"] == "boolean":
            if isinstance(value, bool):
                cleaned[key] = value
            elif isinstance(value, str):
                cleaned[key] = value.lower() in ("true", "yes", "1", "sí")
                
        elif config["type"] == "numeric" or config["type"] == "nutrient":
            try:
                num = float(value) if value else None
                if num is not None and num >= 0:
                    cleaned[key] = round(num, 2)
            except (ValueError, TypeError):
                pass
                
        elif config["type"] == "enum":
            if value in config.get("values", []):
                cleaned[key] = value
            elif isinstance(value, str):
                # Try to match loosely
                for v in config.get("values", []):
                    if v.lower() in value.lower() or value.lower() in v.lower():
                        cleaned[key] = v
                        break
                        
        elif config["type"] == "classification":
            if value in VALID_GROUPS:
                cleaned[key] = value
            elif isinstance(value, str):
                value_lower = value.lower().replace(" ", "_")
                for g in VALID_GROUPS:
                    if g in value_lower or value_lower in g:
                        cleaned[key] = g
                        break
                        
        elif config["type"] == "translation":
            if isinstance(value, str) and len(value) > 0:
                cleaned[key] = value
        elif config["type"] == "text":
            if isinstance(value, str) and len(value.strip()) > 0:
                cleaned[key] = value.strip()
    
    # Apply plausibility checks and ratios
    group = cleaned.get("usda_food_group") or food.get("usda_food_group") or food.get("category")
    group = str(group).lower().replace(" ", "_")

    carbs = food.get("carbs_g_per_100g") or 0
    fat = food.get("fat_g_per_100g") or 0
    protein = food.get("protein_g_per_100g") or 0
    kcal = food.get("kcal_per_100g") or 0

    # Basic kcal consistency check (warn only)
    macro_kcal = (protein * 4) + (carbs * 4) + (fat * 9)
    if kcal and macro_kcal and abs(macro_kcal - kcal) / max(kcal, 1) > 0.35:
        print(f"  ⚠️ Macro kcal mismatch: {food.get('name')} ({macro_kcal:.0f} vs {kcal})")

    # Range checks
    for field, bounds in NUMERIC_RANGES.items():
        if field in cleaned:
            lo, hi = bounds
            if cleaned[field] < lo or cleaned[field] > hi:
                cleaned.pop(field, None)

    # Group-specific ranges
    if group in GROUP_RANGES:
        for field, bounds in GROUP_RANGES[group].items():
            if field in cleaned:
                lo, hi = bounds
                if cleaned[field] < lo or cleaned[field] > hi:
                    cleaned.pop(field, None)

    # Ratio checks
    if carbs > 0:
        if "sugar_g_per_100g" in cleaned and cleaned["sugar_g_per_100g"] > carbs:
            cleaned.pop("sugar_g_per_100g", None)
        if "fiber_g_per_100g" in cleaned and cleaned["fiber_g_per_100g"] > carbs:
            cleaned.pop("fiber_g_per_100g", None)
    if fat > 0 and "saturated_fat_g_per_100g" in cleaned and cleaned["saturated_fat_g_per_100g"] > fat:
        cleaned.pop("saturated_fat_g_per_100g", None)

    # Whole grain rule (fiber >= carbs/8)
    if "is_whole_grain" in cleaned and carbs > 0 and "fiber_g_per_100g" in cleaned:
        cleaned["is_whole_grain"] = bool(cleaned["fiber_g_per_100g"] >= carbs / 8)

    return cleaned

# ============================================================
# MAIN FUNCTIONS
# ============================================================

def analyze_database(supabase) -> Dict[str, Dict]:
    """Analyze which columns have empty data."""
    print("\n📊 Analyzing database for empty fields...")
    
    # Get sample of 1000 foods
    foods = supabase.table("foods").select("*").limit(2000).execute()
    
    analysis = {}
    for col in FIELDS_CONFIG.keys():
        total = len(foods.data)
        empty = sum(1 for f in foods.data if field_is_missing(f, col))
        filled = total - empty
        pct = (filled / total) * 100 if total > 0 else 0
        
        analysis[col] = {
            "filled": filled,
            "empty": empty,
            "total": total,
            "pct": pct,
            "priority": FIELDS_CONFIG[col]["priority"]
        }
        
        status = "✅" if pct > 80 else "⚠️" if pct > 50 else "❌"
        print(f"  {status} {col}: {filled}/{total} ({pct:.1f}%)")
    
    return analysis

def get_foods_needing_completion(supabase, limit: int) -> List[Dict]:
    """Get foods that have any missing fields using pagination."""
    print(f"\n🔍 Finding foods needing completion (limit: {limit})...")

    scored_foods: List[Dict[str, Any]] = []
    last_id = 0
    missing_filter = build_missing_filter()

    while len(scored_foods) < limit:
        base_query = (
            supabase.table("foods")
            .select("*")
            .gt("id", last_id)
            .order("id")
            .limit(BATCH_SIZE)
        )
        query = base_query if SCAN_ALL else base_query.or_(missing_filter)
        batch = query.execute()
        if not batch.data:
            break

        for food in batch.data:
            missing = []
            for col in FIELDS_CONFIG.keys():
                if field_is_missing(food, col):
                    missing.append(col)
            if missing:
                scored_foods.append({
                    "food": food,
                    "missing": missing,
                    "score": len(missing)
                })

        last_id = batch.data[-1]["id"]

    scored_foods.sort(key=lambda x: -x["score"])

    print(f"  Found {len(scored_foods)} foods with missing data")
    if scored_foods:
        print(f"  Most incomplete: {scored_foods[0]['score']} missing fields")
        print(f"  Least incomplete: {scored_foods[-1]['score']} missing fields")

    return scored_foods[:limit]

def complete_food(food_data: Dict, missing_fields: List[str]) -> Optional[Dict]:
    """Use official source first, then AI fallback to complete missing fields."""
    completed: Dict[str, Any] = {}
    field_sources: Dict[str, str] = {}

    official = get_official_completion(food_data, missing_fields)
    for k, v in official.items():
        completed[k] = v
        field_sources[k] = "usda"

    remaining = [f for f in missing_fields if f not in completed]
    response = None
    confidence = None
    prompt_hash = None

    if remaining:
        # Optimization 1: Static Map (Instant)
        if "category_es" in remaining:
            cat_en = food_data.get("category") or completed.get("food_category")
            if cat_en:
                if cat_en in STATIC_CATEGORY_MAP:
                    completed["category_es"] = STATIC_CATEGORY_MAP[cat_en]
                    field_sources["category_es"] = "static_map"
                    remaining.remove("category_es")
                elif cat_en in CATEGORY_TRANSLATION_CACHE:
                    completed["category_es"] = CATEGORY_TRANSLATION_CACHE[cat_en]
                    field_sources["category_es"] = "ai_cache"
                    remaining.remove("category_es")
        
        if remaining:
            prompt = build_completion_prompt(food_data, remaining)
            prompt_hash = hashlib.sha256(prompt.encode("utf-8")).hexdigest()
            # Pass max_retries as None to use env var default
            response = call_qwen_ai(prompt)
            if not response:
                return {"data": completed, "field_sources": field_sources, "raw_response": None, "confidence": None, "prompt_hash": None} if completed else None
            parsed = parse_ai_response(response)
            if not parsed:
                print(f"  ⚠️ Could not parse AI response")
                return {"data": completed, "field_sources": field_sources, "raw_response": None, "confidence": None, "prompt_hash": None} if completed else None
            confidence = parsed.pop("confidence", None)
            if confidence is not None:
                try:
                    confidence = max(0.0, min(1.0, float(confidence)))
                except (ValueError, TypeError):
                    confidence = None
            cleaned = validate_and_clean(food_data, parsed)
            for k, v in cleaned.items():
                if k not in completed:
                    completed[k] = v
                    field_sources[k] = "ai"
            
            # Update cache if we got a translation
            if "category_es" in cleaned and cleaned["category_es"]:
                cat_en = food_data.get("category") or completed.get("food_category")
                if cat_en:
                    CATEGORY_TRANSLATION_CACHE[cat_en] = cleaned["category_es"]
                    save_cache()

    if not completed:
        return None

    return {
        "data": completed,
        "field_sources": field_sources,
        "raw_response": response,
        "confidence": confidence,
        "prompt_hash": prompt_hash
    }

def run_completion(supabase, limit: int, dry_run: bool = False):
    """Run the data completion process."""
    print("\n🚀 COMPREHENSIVE FOOD DATA COMPLETION")
    print(f"   Limit: {limit} foods")
    print(f"   Dry run: {dry_run}")
    
    # Analyze current state
    analysis = analyze_database(supabase)
    
    # Get foods needing completion
    foods_to_process = get_foods_needing_completion(supabase, limit)
    
    if not foods_to_process:
        print("\n✅ All foods are complete!")
        return
    
    success_count = 0
    error_count = 0
    
    print(f"\n📝 Processing {len(foods_to_process)} foods...")
    
    pbar = tqdm(foods_to_process, desc="🤖 Completing foods", unit="food")
    for item in pbar:
        food = item["food"]
        missing = item["missing"]
        pbar.set_postfix_str(food['name'][:30])
        
        # Get AI completion
        completed = complete_food(food, missing)
        
        if not completed:
            error_count += 1
            print(f"  ❌ AI completion failed")
            continue
        
        completed_data = completed["data"]
        field_sources = completed["field_sources"]
        print(f"  ✅ Completed {len(completed_data)} fields")
        for k, v in list(completed_data.items())[:3]:
            print(f"     {k}: {v}")
        
        if not dry_run and completed_data:
            try:
                data_quality_flags = safe_json_load(food.get("data_quality_flags"))
                existing_sources = data_quality_flags.get("field_sources") or {}
                merged_sources = {**existing_sources, **field_sources}
                data_quality_flags.update({
                    "ai_completed": True,
                    "completed_fields": list(completed_data.keys()),
                    "field_sources": merged_sources,
                    "model": "qwen-turbo" if completed.get("raw_response") else "official",
                    "prompt_hash": completed.get("prompt_hash"),
                    "raw_response": (completed.get("raw_response") or "")[:2000],
                    "confidence": completed.get("confidence"),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })

                update_payload = dict(completed_data)
                update_payload["data_audited_at"] = datetime.now(timezone.utc).isoformat()
                update_payload["data_quality_flags"] = json.dumps(data_quality_flags)

                # Retry with exponential backoff
                for attempt in range(MAX_RETRIES):
                    try:
                        result = supabase.table("foods").update(update_payload).eq("id", food["id"]).execute()
                        # Fix: APIResponse might not have 'error' attribute on success
                        if result.data:
                            success_count += 1
                        else:
                            error_count += 1
                        break
                    except Exception as e:
                        if attempt < MAX_RETRIES - 1:
                            time.sleep(BACKOFF_BASE ** attempt)
                            if "EOF" in str(e) or "SSL" in str(e) or "Connection" in str(e):
                                supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
                        else:
                            error_count += 1
                            pbar.write(f"⚠️ Failed {food['id']}: {e}")
            except Exception as e:
                error_count += 1
                pbar.write(f"❌ Error: {e}")
        else:
            success_count += 1  # Count as success in dry run
        
        # Rate limiting (dynamic)
        if field_sources.get("category_es") == "ai_cache":
             time.sleep(0.01) # Fast path
        else:
             time.sleep(0.3)
    
    print(f"\n{'='*50}")
    print(f"✅ Success: {success_count}")
    print(f"❌ Errors: {error_count}")
    if dry_run:
        print("⚠️ DRY RUN - No changes were made to the database")

# ============================================================
# CLI
# ============================================================

def main():
    parser = argparse.ArgumentParser(description="Complete missing food data using AI")
    parser.add_argument("--limit", type=int, default=100, help="Max foods to process")
    parser.add_argument("--dry-run", action="store_true", help="Don't update database")
    parser.add_argument("--analyze-only", action="store_true", help="Only show analysis")
    args = parser.parse_args()
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Missing Supabase credentials")
        sys.exit(1)
    
    if not OPENAI_API_KEY:
        print("❌ Missing OPENAI_API_KEY")
        sys.exit(1)
    
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    if args.analyze_only:
        analyze_database(supabase)
    else:
        run_completion(supabase, args.limit, args.dry_run)

if __name__ == "__main__":
    main()
