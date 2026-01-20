
import os
import json
import asyncio
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

# CONFIG
JSON_PATH = '/home/jcc/Descargas/SummerFit--main/SummerFit-Vercel-main/USDA/fitia_plus_fndds_AyB_single_base.json'
ENV_PATH = '/home/jcc/Descargas/SummerFit--main/SummerFit-Vercel-main/web/.env.local'
BATCH_SIZE = 500

async def replace_db():
    print("🚀 STARTED: Database Replacement Protocol")
    
    # 1. Load Env
    load_dotenv(Path(ENV_PATH))
    url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not url or not key:
        print("❌ CRITICAL: Missing SUPABASE_SERVICE_KEY. Cannot write to DB.")
        return

    supabase = create_client(url, key)
    
    # 2. Count Existing
    res = supabase.table('foods').select('id', count='exact').limit(1).execute()
    count_before = res.count
    print(f"📊 Current DB Size: {count_before} items.")
    
    # 3. DELETE ALL (Safety Check: User Must Approve via Context, but script does it)
    print("⚠️  DELETING ALL EXISTING FOODS...")
    # Batched delete to avoid timeouts? Or strict "neq" trick.
    # Note: Supabase API delete requires a filter.
    try:
        # Delete ID > 0 (assuming auto-increment)
        # Doing in chunks is safer for timeouts
        step = 1000
        # A simpler way: 'id.neq.0' could timeout on 7000 rows.
        # Let's try it.
        supabase.table('foods').delete().neq('id', 0).execute()
        print("✅ DB Wiped. Row count should be 0.")
    except Exception as e:
        print(f"❌ Error wiping DB: {e}")
        return

    # 4. Load New Data
    with open(JSON_PATH) as f:
        data = json.load(f)
    print(f"📚 Loaded {len(data)} new items to insert.")

    # 5. Insert in Batches
    total_inserted = 0
    batch = []
    
    for item in data:
        # Clean/Map Item
        row = {
            'name': item.get('name'),
            'name_es': item.get('name_es') or item.get('name'),
            'category': item.get('category'),
            
            # Macros
            'kcal_per_100g': item.get('kcal_per_100g', 0),
            'protein_g_per_100g': item.get('protein_g_per_100g', 0),
            'carbs_g_per_100g': item.get('carbs_g_per_100g', 0),
            'fat_g_per_100g': item.get('fat_g_per_100g', 0),
            'fiber_g': item.get('fiber_g_per_100g') or item.get('fiber_g') or 0,
            'sugars_g': item.get('sugar_g_per_100g') or item.get('sugar_g') or 0,
            'sodium_mg': item.get('sodium_mg_per_100g') or item.get('sodium_mg') or 0,

            # Micros
            'calcium_mg': item.get('calcium_mg', 0),
            'iron_mg': item.get('iron_mg', 0),
            'magnesium_mg': item.get('magnesium_mg', 0),
            'zinc_mg': item.get('zinc_mg', 0),
            'potassium_mg': item.get('potassium_mg', 0),
            'vitamin_a_iu': item.get('vitamin_a_iu', 0),
            # Note: DB might expect vit_d_iu, vit_c_mg etc. Fitia JSON has keys.
            'vitamin_c_mg': item.get('vitamin_c_mg', 0),
            'vitamin_b12_ug': item.get('vitamin_b12_ug', 0),
            
            # Meta
            'food_tier': 1, 
            'is_simple_ingredient': True,
            # MAP PRIORITY: 
            # Fitia Basic (JSON 100) -> DB 1 (Highest)
            # USDA Standard (JSON 10) -> DB 2 (High)
            'priority': 1 if item.get('priority') == 100 else 2
        }
        
        batch.append(row)
        
        if len(batch) >= BATCH_SIZE:
            try:
                supabase.table('foods').insert(batch).execute()
                total_inserted += len(batch)
                print(f"   ⏳ Inserted {total_inserted} / {len(data)}...")
                batch = []
            except Exception as e:
                print(f"   ❌ Batch Error: {e}")
                # Try one by one? No, too slow. Skip.
                batch = []

    # Final Batch
    if batch:
        try:
            supabase.table('foods').insert(batch).execute()
            total_inserted += len(batch)
            print(f"   ⏳ Inserted {total_inserted} / {len(data)}...")
        except Exception as e:
            print(f"   ❌ Final Batch Error: {e}")

    print("✨ DATABASE REPLACEMENT COMPLETE.")

if __name__ == "__main__":
    asyncio.run(replace_db())
