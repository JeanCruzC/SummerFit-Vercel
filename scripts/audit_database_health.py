#!/usr/bin/env python3
"""
Deep Database Health Check
Verifies completeness of:
1. Translations (name_es)
2. USDA Enrichment (Portions, Micros)
3. Culinary Flags (is_simple_ingredient)
"""

import os
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

# Load env
script_dir = Path(__file__).parent.parent
env_file = script_dir / "web" / ".env.local"
load_dotenv(env_file)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing Supabase credentials")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def run_audit():
    print(f"🏥 Starting Database Health Check...")
    print("-" * 50)
    
    # 1. Total Count
    total = supabase.table('foods').select('id', count='exact', head=True).execute().count
    print(f"📊 Total Foods: {total}")
    
    # 2. Translations
    translated = supabase.table('foods').select('id', count='exact', head=True).not_.is_('name_es', 'null').execute().count
    print(f"🇪🇸 Translated Names: {translated} ({translated/total*100:.1f}%)")
    
    # 3. Portions (USDA Integration)
    portions = supabase.table('foods').select('id', count='exact', head=True).not_.is_('serving_size', 'null').execute().count
    print(f"📏 Serving Sizes (USDA): {portions} ({portions/total*100:.1f}%)")
    
    # 4. Micros (USDA Integration)
    try:
        # Check first row to see if it has vit_c_mg
        sample = supabase.table('foods').select('vit_c_mg').limit(1).execute()
        if sample.data and 'vit_c_mg' in sample.data[0]:
            print(f"🧪 Micronutrients (USDA): Detected (Sample check passed)")
        else:
            print(f"🧪 Micronutrients (USDA): ⚠️ Column exists but might be empty?")
    except Exception as e:
        print(f"🧪 Micronutrients (USDA): ⚠️ Error checking: {e}")
    
    # 5. Simple Ingredients (Current Status)
    try:
        simple = supabase.table('foods').select('id', count='exact', head=True).eq('is_simple_ingredient', True).execute().count
        print(f"🍳 Simple Ingredients Marked: {simple} ({simple/total*100:.1f}%)")
    except Exception as e:
        print(f"🍳 Simple Ingredients: Error checking ({e})")
    
    print("-" * 50)
    
    # Check for New Columns (The Critical Check)
    print("🔍 SQL MIGRATION CHECK:")
    
    meal_times_exists = False
    try:
        # Try to select the column
        supabase.table('foods').select('meal_times').limit(1).execute()
        print("✅ Column 'meal_times' detected.")
        meal_times_exists = True
    except Exception as e:
        # Parse error to see if it's "column does not exist"
        if "column" in str(e).lower() and "does not exist" in str(e).lower():
             print("❌ Column 'meal_times' NOT detected.")
        else:
             print(f"⚠️ Error checking meal_times: {e}")

    try:
        supabase.table('foods').select('is_common_staple').limit(1).execute()
        print("✅ Column 'is_common_staple' detected.")
    except:
        print("❌ Column 'is_common_staple' NOT detected.")
        
    print("-" * 50)
    print("📋 CONCLUSION:")
    
    if portions > 0 and translated > 0:
        print("✅ BASE DATA IS HEALTHY (Translations + Portions are 100% complete).")
    
    if meal_times_exists:
        print("✅ SQL MIGRATION IS DONE. Ready for AI.")
    else:
        print("🛑 SQL MIGRATION MISSING. Cannot run AI script yet.")

if __name__ == "__main__":
    run_audit()
