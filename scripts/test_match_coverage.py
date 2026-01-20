
import json
import os
from supabase import create_client
from dotenv import load_dotenv
from pathlib import Path

# Load matching logic
def check_coverage():
    # Setup DB
    load_dotenv(Path('/home/jcc/Descargas/SummerFit--main/SummerFit-Vercel-main/web/.env.local'))
    url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    if not url or not key: 
        print("Error: Missing env vars")
        return

    supabase = create_client(url, key)

    # Load JSON
    with open('/home/jcc/Descargas/SummerFit--main/SummerFit-Vercel-main/WHOLE/simple_foods_peru_mega_labeled.json') as f:
        data = json.load(f)

    # Extract all JSON names
    json_names = []
    for cat in data['categories']:
        for sub in cat['subcategories']:
            for item in sub['items']:
                json_names.append(item['name'])
    
    total_json = len(json_names)
    print(f"Total JSON items to match: {total_json}")

    # Fetch ALL DB names (id, name, name_es) to memory (7000 is small enough)
    print("Fetching DB items...")
    res = supabase.table('foods').select('id, name, name_es').limit(20000).execute()
    db_items = res.data
    print(f"Fetched {len(db_items)} items from DB")

    # Build DB Lookup Map (Normalized)
    # Build Sets for O(1) lookup
    db_names_es = set()
    db_names_en = set()
    for item in db_items:
        if item['name_es']: db_names_es.add(item['name_es'].lower().strip())
        if item['name']: db_names_en.add(item['name'].lower().strip())
    
    print(f"Index built: {len(db_names_es)} Spanish names, {len(db_names_en)} English names")

    matches = 0
    matched_examples = []
    
    for j_name in json_names:
        clean = j_name.lower().strip()
        if clean in db_names_es or clean in db_names_en:
            matches += 1
            if len(matched_examples) < 5: matched_examples.append(j_name)
    
    print("-" * 30)
    print(f"FAST MATCH RESULTS:")
    print(f"Total Matches: {matches} / {total_json} ({matches/total_json*100:.1f}%)")
    print(f"Sample Matches: {matched_examples}")


if __name__ == "__main__":
    check_coverage()
