#!/usr/bin/env python3
import os
import sys
from supabase import create_client

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

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing Supabase credentials")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def force_servings():
    print("🔧 Forcing default serving sizes for remaining items...")
    
    # Fetch items with null serving_equiv_grams
    response = supabase.table("foods").select("id, name").is_("serving_equiv_grams", "null").execute()
    foods = response.data
    
    if not foods:
        print("✅ No missing serving_equiv_grams found!")
        return

    print(f"⚠️ Found {len(foods)} items. applying 100g default...")
    
    for food in foods:
        try:
            supabase.table("foods").update({
                "serving_equiv_grams": 100.0,
                "serving_unit": "g (estimated)",
                "data_quality_flags": {"forced_serving": True, "note": "Default 100g applied due to AI failure"}
            }).eq("id", food["id"]).execute()
            print(f"  Fixed: {food['name']}")
        except Exception as e:
            print(f"  Failed {food['id']}: {e}")

if __name__ == "__main__":
    force_servings()
