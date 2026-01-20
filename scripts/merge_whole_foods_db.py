
import json
import os
import asyncio
from supabase import create_client
from dotenv import load_dotenv
from pathlib import Path

# Config
JSON_PATH = '/home/jcc/Descargas/SummerFit--main/SummerFit-Vercel-main/WHOLE/simple_foods_peru_mega_labeled.json'
ENV_PATH = '/home/jcc/Descargas/SummerFit--main/SummerFit-Vercel-main/web/.env.local'

# Translation Dictionary for Common Mismatches
TRANSLATIONS = {
    'acelga': 'swiss chard',
    'ajo poro': 'leek',
    'apio': 'celery',
    'betarraga': 'beet',
    'col china': 'chinese cabbage',
    'culantro': 'cilantro',
    'espinaca': 'spinach',
    'hierbabuena': 'spearmint',
    'albahaca': 'basil',
    'poro': 'leek',
    'zapallo': 'squash',
    'camote': 'sweet potato',
    'palta': 'avocado',
    'manzana': 'apple',
    'platano': 'banana',
    'fresa': 'strawberry',
    'bistec': 'beef steak',
    'carne molida': 'ground beef',
    'arroz': 'rice',
    'pollo': 'chicken'
}

async def merge_whole_foods():
    # Load Env
    load_dotenv(Path(ENV_PATH))
    url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    if not url or not key: 
        print("❌ Missing keys")
        return
    
    supabase = create_client(url, key)

    # Load JSON
    with open(JSON_PATH) as f:
        data = json.load(f)

    # Extract names to process (Top 100 first)
    targets = []
    seen = set()
    for cat in data['categories']:
        for sub in cat['subcategories']:
            for item in sub['items']:
                # Prioritize 'fresh' and 'simple'
                if "fresh" in item.get('tags', []) or "simple" in item.get('tags', []):
                    if item['name'] not in seen:
                        targets.append(item['name'])
                        seen.add(item['name'])
    
    print(f"🎯 Found {len(targets)} candidate High-Quality items.")
    print("🚀 Starting Smart Merge (Top 500)...")

    success_count = 0
    
    for name in targets[:500]:
        print(f"\n🔍 Processing: {name}")
        
        # 0. Check Translation
        search_term = name
        simple_name = name.split('(')[0].strip().lower() # Remove (congelado)
        
        if simple_name in TRANSLATIONS:
            search_term = TRANSLATIONS[simple_name]
            print(f"   🌐 Translated '{simple_name}' -> '{search_term}'")

        # 1. Search DB (Fuzzy)
        # Search for 'Acelga' in 'name_es' OR 'name' (English)
        res = supabase.table('foods').select('*').or_(f"name_es.ilike.%{search_term}%,name.ilike.%{search_term}%").limit(5).execute()
        candidates = res.data

        if not candidates:
            print(f"   ⚠️ No match found for '{search_term}'")
            continue

        # 2. Pick Best Candidate
        best = None
        for c in candidates:
            c_name = (c.get('name_es') or c['name']).lower()
            if 'crudo' in c_name or 'raw' in c.get('name', '').lower() or 'fresh' in c.get('name', '').lower():
                best = c
                break
        
        if not best:
             best = sorted(candidates, key=lambda x: len(x.get('name_es') or x['name']))[0]

        print(f"   ✅ Match: {best.get('name_es') or best['name']} (ID: {best['id']})")
        
        # 3. Insert CLEAN Record
        # Check if already exists to avoid dupes (by name and priority=1)
        check = supabase.table('foods').select('id').eq('name', name).eq('priority', 1).execute()
        if check.data:
            print(f"   ⏩ Already exists.")
            continue

        clean_item = {
            'name': name, # The Clean JSON Name
            'name_es': name,
            'food_tier': 1,
            'is_common_staple': True,
            'is_simple_ingredient': True,
            'priority': 1, # TOP PRIORITY (Marks this as User Provided)
            # COPY MACROS
            'kcal_per_100g': best['kcal_per_100g'],
            'protein_g_per_100g': best['protein_g_per_100g'],
            'carbs_g_per_100g': best['carbs_g_per_100g'],
            'fat_g_per_100g': best['fat_g_per_100g'],
            'fiber_g': best['fiber_g'],
            # COPY MICROS
            'vitamin_a_iu': best.get('vitamin_a_iu', 0),
            'vitamin_c_mg': best.get('vitamin_c_mg', 0),
            'calcium_mg': best.get('calcium_mg', 0),
            'iron_mg': best.get('iron_mg', 0),
            'potassium_mg': best.get('potassium_mg', 0),
            'magnesium_mg': best.get('magnesium_mg', 0),
            'zinc_mg': best.get('zinc_mg', 0),
            'culinary_category': best.get('culinary_category', 'other')
        }

        try:
             supabase.table('foods').insert(clean_item).execute()
             print(f"   🎉 Inserted Clean Record: {name}")
             success_count += 1
        except Exception as e:
            print(f"   ❌ Error inserting: {e}")

    print(f"\n✨ Completed. Successfully merged {success_count} items.")

if __name__ == "__main__":
    asyncio.run(merge_whole_foods())
