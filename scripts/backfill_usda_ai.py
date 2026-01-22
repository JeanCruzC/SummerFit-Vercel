#!/usr/bin/env python3
"""
AI-Powered USDA Data Backfill Script
Uses Qwen AI to intelligently fill missing nutritional fields with real data.

Usage:
    python backfill_usda_ai.py [--dry-run] [--limit N]

Environment variables required:
    SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY, OPENAI_BASE_URL
"""

import os
import json
import time
import argparse
from typing import Optional, Dict, Any
from datetime import datetime, timezone

# Load environment from .env.local if exists
def load_env():
    env_path = os.path.join(os.path.dirname(__file__), '..', 'web', '.env.local')
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ.setdefault(key, value)

load_env()

from openai import OpenAI
from supabase import create_client, Client

# Initialize clients
SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')
OPENAI_KEY = os.environ.get('OPENAI_API_KEY')
OPENAI_BASE = os.environ.get('OPENAI_BASE_URL', 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1')
OPENAI_MODEL = os.environ.get('OPENAI_MODEL', 'qwen-turbo')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
openai_client = OpenAI(api_key=OPENAI_KEY, base_url=OPENAI_BASE)

# USDA serving equivalents reference
USDA_SERVING_REFERENCE = {
    'vegetables': {'cup_raw': 90, 'cup_cooked': 90, 'cup_leafy': 30},
    'fruits': {'cup': 150, 'medium': 150},
    'dairy': {'cup_milk': 244, 'cup_yogurt': 245, 'oz_cheese': 28},
    'protein': {'oz_cooked': 28, 'egg': 50},
    'grains': {'oz_eq_dry': 28, 'slice_bread': 28, 'cup_cooked': 90},
    'fats': {'tsp_oil': 5, 'tbsp': 14}
}

SYSTEM_PROMPT = """Eres un experto nutricionista con acceso a la base de datos USDA FoodData Central.
Tu tarea es completar información nutricional faltante para alimentos.

IMPORTANTE:
- Solo responde con JSON válido, sin explicaciones adicionales
- Si no conoces un valor con certeza, usa null
- Para azúcares añadidos: solo cuenta azúcares que NO son naturales del alimento
- Para granos integrales: true solo si contiene ≥51% grano integral
- Para processing_level: minimally_processed (tier 1), processed (tier 2), ultra_processed (tier 3)
- Los valores nutricionales son POR 100g"""

def get_ai_nutrition_data(food: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Query Qwen AI to get missing nutritional data for a food item."""
    
    name = food.get('name_es') or food.get('name') or ''
    category = food.get('category') or food.get('culinary_category') or ''
    
    # Build context about what we already know
    known_data = {
        'name': name,
        'category': category,
        'kcal_per_100g': food.get('kcal_per_100g'),
        'protein_g': food.get('protein_g_per_100g'),
        'carbs_g': food.get('carbs_g_per_100g'),
        'fat_g': food.get('fat_g_per_100g'),
        'fiber_g': food.get('fiber_g') or food.get('fiber_g_per_100g'),
        'sodium_mg': food.get('sodium_mg'),
        'serving_size': food.get('serving_size'),
        'serving_unit': food.get('serving_unit'),
    }
    
    user_prompt = f"""Analiza este alimento y completa los campos faltantes:

ALIMENTO: {name}
CATEGORÍA: {category}
DATOS CONOCIDOS: {json.dumps(known_data, ensure_ascii=False)}

Responde SOLO con este JSON (sin texto adicional):
{{
    "usda_group": "vegetables|fruits|dairy|protein|whole_grain|refined_grain|fat|condiment",
    "is_whole_grain": true|false|null,
    "serving_equiv_grams": <número: equivalente USDA en gramos>,
    "processing_level": "minimally_processed|processed|ultra_processed",
    "added_sugars_g_per_100g": <número o null si desconocido>,
    "sat_fat_g_per_100g": <número o null si desconocido>,
    "fiber_g_per_100g": <número o null si ya existe o desconocido>,
    "confidence": 0.0-1.0,
    "source_notes": "<breve nota sobre fuente o razonamiento>"
}}"""

    try:
        response = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.1,  # Low temp for consistency
            max_tokens=500
        )
        
        content = response.choices[0].message.content.strip()
        
        # Extract JSON from response (handle markdown code blocks)
        if '```json' in content:
            content = content.split('```json')[1].split('```')[0].strip()
        elif '```' in content:
            content = content.split('```')[1].split('```')[0].strip()
        
        return json.loads(content)
        
    except Exception as e:
        print(f"  ⚠️ AI error for {name}: {e}")
        return None


def needs_backfill(food: Dict[str, Any]) -> bool:
    """Check if food has missing USDA fields that need backfill."""
    missing = []
    
    if not food.get('usda_food_group'):
        missing.append('usda_group')
    if food.get('is_whole_grain') is None:
        missing.append('is_whole_grain')
    if not food.get('serving_equiv_grams'):
        missing.append('serving_equiv_grams')
    if not food.get('processing_level'):
        missing.append('processing_level')
    if (food.get('added_sugars_g_per_100g') or 0) == 0:
        missing.append('added_sugars')
    if (food.get('sat_fat_g_per_100g') or food.get('saturated_fat_g_per_100g') or 0) == 0:
        missing.append('sat_fat')
    
    return len(missing) >= 2  # Only backfill if missing 2+ fields


def apply_backfill(food_id: int, ai_data: Dict[str, Any], dry_run: bool = False) -> bool:
    """Apply AI-generated data to database."""
    
    update_data = {
        'data_audited_at': datetime.now(timezone.utc).isoformat(),
        'data_quality_flags': json.dumps({
            'ai_backfilled': True,
            'confidence': ai_data.get('confidence', 0.5),
            'source': 'qwen-turbo',
            'notes': ai_data.get('source_notes', '')
        })
    }
    
    # Only update non-null values
    if ai_data.get('usda_group'):
        update_data['usda_food_group'] = ai_data['usda_group']
    if ai_data.get('is_whole_grain') is not None:
        update_data['is_whole_grain'] = ai_data['is_whole_grain']
    if ai_data.get('serving_equiv_grams'):
        update_data['serving_equiv_grams'] = ai_data['serving_equiv_grams']
    if ai_data.get('processing_level'):
        update_data['processing_level'] = ai_data['processing_level']
    if ai_data.get('added_sugars_g_per_100g') is not None:
        update_data['added_sugars_g_per_100g'] = ai_data['added_sugars_g_per_100g']
    if ai_data.get('sat_fat_g_per_100g') is not None:
        update_data['sat_fat_g_per_100g'] = ai_data['sat_fat_g_per_100g']
    if ai_data.get('fiber_g_per_100g') is not None:
        update_data['fiber_g'] = ai_data['fiber_g_per_100g']
    
    if dry_run:
        print(f"  [DRY RUN] Would update food {food_id} with: {json.dumps(update_data, indent=2)}")
        return True
    
    try:
        supabase.table('foods').update(update_data).eq('id', food_id).execute()
        return True
    except Exception as e:
        print(f"  ❌ DB error updating {food_id}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description='AI-powered USDA data backfill')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without applying')
    parser.add_argument('--limit', type=int, default=50, help='Max foods to process (default: 50)')
    parser.add_argument('--tier', type=int, help='Only process specific food_tier (1, 2, or 3)')
    args = parser.parse_args()
    
    print("🚀 AI-Powered USDA Backfill Script")
    print(f"   Model: {OPENAI_MODEL}")
    print(f"   Dry run: {args.dry_run}")
    print(f"   Limit: {args.limit}")
    print()
    
    # Fetch foods needing backfill
    query = supabase.table('foods').select('*')
    if args.tier:
        query = query.eq('food_tier', args.tier)
    query = query.limit(args.limit * 2)  # Fetch extra to filter
    
    result = query.execute()
    foods = result.data
    
    # Filter to those needing backfill
    foods_to_process = [f for f in foods if needs_backfill(f)][:args.limit]
    
    print(f"📊 Found {len(foods_to_process)} foods needing backfill (out of {len(foods)} fetched)")
    print()
    
    success_count = 0
    error_count = 0
    
    for i, food in enumerate(foods_to_process):
        name = food.get('name_es') or food.get('name')
        print(f"[{i+1}/{len(foods_to_process)}] Processing: {name}")
        
        ai_data = get_ai_nutrition_data(food)
        
        if ai_data:
            confidence = ai_data.get('confidence', 0)
            print(f"  ✅ AI response (confidence: {confidence:.0%})")
            print(f"     usda_group: {ai_data.get('usda_group')}")
            print(f"     is_whole_grain: {ai_data.get('is_whole_grain')}")
            print(f"     serving_equiv_grams: {ai_data.get('serving_equiv_grams')}")
            print(f"     processing_level: {ai_data.get('processing_level')}")
            
            if apply_backfill(food['id'], ai_data, args.dry_run):
                success_count += 1
            else:
                error_count += 1
        else:
            error_count += 1
        
        # Rate limiting
        time.sleep(0.5)
    
    print()
    print("=" * 50)
    print(f"✅ Success: {success_count}")
    print(f"❌ Errors: {error_count}")
    if args.dry_run:
        print("🔍 This was a dry run. No changes were made.")


if __name__ == '__main__':
    main()
