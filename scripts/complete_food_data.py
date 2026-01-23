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

from supabase import create_client
import requests

# ============================================================
# CONFIGURATION
# ============================================================

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1")
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

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
    
    # Macronutrients (if missing)
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

# ============================================================
# AI FUNCTIONS
# ============================================================

def call_qwen_ai(prompt: str, max_retries: int = 3) -> Optional[str]:
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
    
    for attempt in range(max_retries):
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"]
            elif response.status_code == 429:
                time.sleep(2 ** attempt)
                continue
            else:
                print(f"  ⚠️ API error: {response.status_code} - {response.text[:100]}")
                return None
        except Exception as e:
            print(f"  ⚠️ Request error: {e}")
            if attempt < max_retries - 1:
                time.sleep(1)
    return None

def build_completion_prompt(food: Dict[str, Any], missing_fields: List[str]) -> str:
    """Build a comprehensive prompt to fill all missing fields at once."""
    
    # Existing data for context
    context = {
        "name": food.get("name", ""),
        "category": food.get("category", ""),
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
- fiber_g_per_100g: Dietary fiber in grams per 100g
- sugar_g_per_100g: Total sugars in grams per 100g
- sodium_mg_per_100g: Sodium in mg per 100g
- saturated_fat_g_per_100g: Saturated fat in grams per 100g
- vitamin_c_mg: Vitamin C in mg per 100g
- vitamin_d_iu: Vitamin D in IU per 100g
- folate_ug: Folate in mcg per 100g
- vitamin_b12_ug: Vitamin B12 in mcg per 100g
- magnesium_mg: Magnesium in mg per 100g

Return ONLY a valid JSON object with the missing fields filled. Use null if truly unknown.
Example: {{"category_es": "Lácteos", "usda_food_group": "dairy", "is_whole_grain": false, ...}}
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

def validate_and_clean(data: Dict[str, Any]) -> Dict[str, Any]:
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
            valid_groups = ["protein", "dairy", "vegetables", "fruits", "whole_grain", 
                          "refined_grain", "fat", "legume", "condiment", "beverage"]
            if value in valid_groups:
                cleaned[key] = value
            elif isinstance(value, str):
                value_lower = value.lower().replace(" ", "_")
                for g in valid_groups:
                    if g in value_lower or value_lower in g:
                        cleaned[key] = g
                        break
                        
        elif config["type"] == "translation":
            if isinstance(value, str) and len(value) > 0:
                cleaned[key] = value
    
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
        empty = sum(1 for f in foods.data if f.get(col) is None or f.get(col) == "" or f.get(col) == 0)
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
    """Get foods that have any missing fields."""
    print(f"\n🔍 Finding foods needing completion (limit: {limit})...")
    
    # Get foods prioritizing those with most missing data
    foods = supabase.table("foods").select("*").limit(limit * 2).execute()
    
    # Score each food by how many fields are missing
    scored_foods = []
    for food in foods.data:
        missing = []
        for col, config in FIELDS_CONFIG.items():
            val = food.get(col)
            if val is None or val == "" or (config["type"] in ("numeric", "nutrient") and val == 0):
                missing.append(col)
        
        if missing:
            scored_foods.append({
                "food": food,
                "missing": missing,
                "score": len(missing)
            })
    
    # Sort by most missing fields first
    scored_foods.sort(key=lambda x: -x["score"])
    
    print(f"  Found {len(scored_foods)} foods with missing data")
    if scored_foods:
        print(f"  Most incomplete: {scored_foods[0]['score']} missing fields")
        print(f"  Least incomplete: {scored_foods[-1]['score']} missing fields")
    
    return scored_foods[:limit]

def complete_food(food_data: Dict, missing_fields: List[str]) -> Optional[Dict]:
    """Use AI to complete missing fields for a single food."""
    prompt = build_completion_prompt(food_data, missing_fields)
    response = call_qwen_ai(prompt)
    
    if not response:
        return None
    
    parsed = parse_ai_response(response)
    if not parsed:
        print(f"  ⚠️ Could not parse AI response")
        return None
    
    cleaned = validate_and_clean(parsed)
    return cleaned

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
    
    for i, item in enumerate(foods_to_process):
        food = item["food"]
        missing = item["missing"]
        
        print(f"\n[{i+1}/{len(foods_to_process)}] {food['name'][:50]}")
        print(f"  Missing: {', '.join(missing[:5])}{'...' if len(missing) > 5 else ''}")
        
        # Get AI completion
        completed = complete_food(food, missing)
        
        if not completed:
            error_count += 1
            print(f"  ❌ AI completion failed")
            continue
        
        print(f"  ✅ AI returned {len(completed)} fields")
        for k, v in list(completed.items())[:3]:
            print(f"     {k}: {v}")
        
        if not dry_run and completed:
            try:
                # Add audit trail
                completed["data_audited_at"] = "now()"
                completed["data_quality_flags"] = json.dumps({
                    "ai_completed": True,
                    "completed_fields": list(completed.keys()),
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                })
                
                result = supabase.table("foods").update(completed).eq("id", food["id"]).execute()
                if result.data:
                    success_count += 1
                else:
                    error_count += 1
                    print(f"  ⚠️ Update returned no data")
            except Exception as e:
                error_count += 1
                print(f"  ❌ Update error: {e}")
        else:
            success_count += 1  # Count as success in dry run
        
        # Rate limiting
        time.sleep(0.5)
    
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
