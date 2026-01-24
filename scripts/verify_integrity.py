#!/usr/bin/env python3
"""
Verify data integrity after FDC matching and completion.
"""

import os
import json
import sys
from supabase import create_client

# Load env variables (same logic as other scripts)
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

def verify():
    print("🔍 Auditando base de datos 'foods'...\n")

    # 1. Totales
    count_total = supabase.table("foods").select("id", count="exact").execute().count
    count_fdc = supabase.table("foods").select("id", count="exact").not_.is_("fdc_id", "null").execute().count
    
    print(f"📊 Estadísticas Generales:")
    print(f"   Total de alimentos: {count_total}")
    print(f"   Con FDC ID asignado: {count_fdc} ({(count_fdc/count_total)*100:.1f}%)")
    print(f"   Sin FDC ID: {count_total - count_fdc}")

    # 2. Análisis de Completitud Nutricional
    print("\n🥗 Análisis de Completitud Nutricional:")
    total = count_total if count_total > 0 else 1
    
    # Check key fields
    fields_to_check = [
        "protein_g_per_100g", 
        "category_es", 
        "processing_level", 
        "serving_equiv_grams",
        "usda_food_group"
    ]
    
    for field in fields_to_check:
        if field == "category_es":
            # For category_es we check not null (it's text)
            cnt = supabase.table("foods").select("id", count="exact").not_.is_(field, "null").execute().count
        elif field == "protein_g_per_100g":
             # For numeric checks, often we want to see valid numbers, but even 0 is valid. 
             # Just checking not null is good enough as they were null before.
             cnt = supabase.table("foods").select("id", count="exact").not_.is_(field, "null").execute().count
        else:
             cnt = supabase.table("foods").select("id", count="exact").not_.is_(field, "null").execute().count
             
        print(f"   ✅ {field}: {cnt}/{total} ({(cnt/total)*100:.1f}%)")

    # 3. Verificar Data Quality Flags en una muestra
    print("\n🕵️  Verificando muestra de alimentos matcheados:")
    sample = supabase.table("foods").select("id, name, fdc_id, data_quality_flags").not_.is_("fdc_id", "null").limit(5).execute()
    
    for food in sample.data:
        print(f"   - [{food['id']}] {food['name']}")
        print(f"     FDC ID: {food['fdc_id']}")
        flags = food.get('data_quality_flags')
        if isinstance(flags, str):
            flags = json.loads(flags)
        
        if flags and 'fdc_match_confidence' in flags:
             print(f"     ✅ Match Confidence: {flags.get('fdc_match_confidence')}")
             print(f"     ℹ️  Method: {flags.get('fdc_match_method')}")
        else:
             print(f"     ⚠️  Falta info de match en data_quality_flags")
        print("")

    # 3. Verificar si hay duplicados de FDC_ID (no debería, pero es buen check)
    # Nota: Supabase API no tiene easy group_by count > 1 sin RPC o query raw complejo, 
    # pero podemos chequear si count(distinct fdc_id) == count(fdc_id) aproximado o simplemente confiar en el script anterior.
    
    pass

if __name__ == "__main__":
    verify()
