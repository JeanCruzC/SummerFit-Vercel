
import os
import json
import time
from supabase import create_client
from dotenv import load_dotenv

# Load env variables
load_dotenv('web/.env.local')

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_KEY')

if not url or not key:
    print("❌ Missing credentials. Please check web/.env.local")
    exit(1)

supabase = create_client(url, key)

def main():
    print("🚀 Starting Science Enrichment...")

    # 1. Load the Scientific Source of Truth (JSON)
    try:
        with open('ejercicios_enriquecidos_es.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            enrichment_db = data.get('exercises', [])
            print(f"📚 Loaded {len(enrichment_db)} scientific records.")
    except FileNotFoundError:
        print("❌ 'ejercicios_enriquecidos_es.json' not found.")
        exit(1)

    # Index enrichment data by English Title for O(1) lookup
    # Normalize keys to lowercase for better matching
    science_map = {ex['nombre_en'].lower().strip(): ex for ex in enrichment_db}

    # 2. Fetch Target Database (Supabase)
    print("📥 Fetching exercises from Supabase...")
    all_db_exercises = []
    count = 0
    batch_size = 1000
    
    while True:
        res = supabase.table('exercises').select('id, title, title_en').range(count, count + batch_size - 1).execute()
        if not res.data:
            break
        all_db_exercises.extend(res.data)
        count += batch_size
    
    print(f"🎯 Found {len(all_db_exercises)} exercises in DB to potentially enrich.")

    # 3. Fuse Data
    updates_count = 0
    errors_count = 0

    for db_ex in all_db_exercises:
        # Match primarily by title_en, fallback to title (if it happens to be english)
        match_key = (db_ex.get('title_en') or db_ex.get('title') or "").lower().strip()
        
        science_data = science_map.get(match_key)

        if science_data:
            try:
                scores = science_data.get('puntuaciones_1a5', {})
                emg = science_data.get('emg', {})
                
                # Prepare payload
                payload = {
                    'movement_pattern': science_data.get('patron_movimiento_id'),
                    'score_hypertrophy': scores.get('hypertrophy_potential'),
                    'score_difficulty': scores.get('technical_difficulty'),
                    'score_risk': scores.get('injury_risk'),
                    'score_strength': scores.get('strength_potential'),
                    'score_stability': scores.get('stability_demand'),
                    'activation_profile': emg.get('activacion_proxy'), # JSONB
                    # Could add notes from templates here if we did a lookup, 
                    # for now let's leave scientific_notes empty or add a placeholder?
                    # Let's add the 'nota' from emg as a temp note
                    'scientific_notes': emg.get('nota')
                }

                # Update DB
                supabase.table('exercises').update(payload).eq('id', db_ex['id']).execute()
                updates_count += 1
                
                if updates_count % 50 == 0:
                    print(f"✅ Enriched {updates_count}: {db_ex.get('title_en')}")

            except Exception as e:
                print(f"❌ Error updating {match_key}: {e}")
                errors_count += 1
        else:
            # print(f"⚠️ No science match for: {match_key}")
            pass

    print(f"\n🎉 Enrichment Complete!")
    print(f"   - Updated: {updates_count}")
    print(f"   - Errors: {errors_count}")
    print(f"   - Coverage: {updates_count/len(all_db_exercises)*100:.1f}%")

if __name__ == "__main__":
    main()
