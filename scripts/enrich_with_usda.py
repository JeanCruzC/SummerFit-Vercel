
import os
import csv
import json
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv('web/.env.local')

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing Supabase credentials in web/.env.local")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- Configuration ---
USDA_CSV_DIR = 'USDA/csv/FoodData_Central_csv_2025-12-18'

# Nutrient IDs mapping (from our analysis)
NUTRIENT_MAP = {
    '1089': 'iron_mg',
    '1087': 'calcium_mg',
    '1090': 'magnesium_mg',
    '1095': 'zinc_mg',
    '1092': 'potassium_mg', # Found in common list
    '1093': 'sodium_mg',    # Found in common list
    '1114': 'vitamin_d_iu', # D2+D3
    '1110': 'vitamin_d_iu', # Alternative ID
    '1162': 'vitamin_c_mg',
    '1177': 'folate_ug',
    '1178': 'vitamin_b12_ug',
    '1079': 'fiber_g',
    '2033': 'fiber_g',      # Total dietary fiber
    '1106': 'vitamin_a_iu', # RAE or IU check
}

# --- 1. Load USDA Reference Data (Optimized) ---
print("Loading USDA Food Index...")
usda_foods = {} # normalized_name -> fdc_id
with open(os.path.join(USDA_CSV_DIR, 'food.csv'), 'r', encoding='utf-8', errors='ignore') as f:
    reader = csv.DictReader(f)
    for row in reader:
        # Simple normalization: lowercase
        name = row['description'].lower()
        usda_foods[name] = row['fdc_id']

print(f"Loaded {len(usda_foods)} USDA food references.")

# --- 2. Fetch Local Foods to Enrich ---
print("Fetching unmatched foods from Supabase...")
# Pagination loop
all_local_foods = []
has_more = True
page = 0
limit = 1000

while has_more:
    res = supabase.from_('foods').select('id, name').range(page*limit, (page+1)*limit - 1).execute()
    data = res.data
    if not data:
        has_more = False
    else:
        all_local_foods.extend(data)
        page += 1
    if len(data) < limit:
        has_more = False

print(f"Found {len(all_local_foods)} foods in database to check.")

# --- 3. Match Logic ---
matches = [] # (local_id, fdc_id)
mapped_fdc_ids = set()

for food in all_local_foods:
    local_name = food['name'].lower()
    
    # Try exact match first
    if local_name in usda_foods:
        fdc_id = usda_foods[local_name]
        matches.append((food['id'], fdc_id))
        mapped_fdc_ids.add(fdc_id)
    else:
        # Basic fuzzy / partial match
        # This is a simple version. For production, we might use RapidFuzz if installed
        # but pure python finding matched substring is safer for now
        pass 
        # For this script V1, let's stick to exact or very close matches to avoid bad data
        # We can improve matching later.

print(f"Matched {len(matches)} foods exactly.")
if len(matches) == 0:
    print("No exact matches found. Script logic might need fuzzy matching enhacement.")
    # Fallback: Try a few "contains" matches for demo
    # (In a real scenario we'd use fuzzywuzzy/rapidfuzz)

# --- 4. Stream Nutrient Data (The Heavy Part) ---
# We generally can't load 22M rows into memory easily.
# We will iterate nutrient file and pick only matched FDC_IDs.

print("Streaming Nutrient Data (this may take a moment)...")
nutrient_data = {} # fdc_id -> { nutrient_col: value }

# Initialize structure for matched IDs
for _, fdc_id in matches:
    nutrient_data[fdc_id] = {}

with open(os.path.join(USDA_CSV_DIR, 'food_nutrient.csv'), 'r', encoding='utf-8', errors='ignore') as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader):
        fdc = row['fdc_id']
        if fdc in mapped_fdc_ids:
            nut_id = row['nutrient_id']
            if nut_id in NUTRIENT_MAP:
                col_name = NUTRIENT_MAP[nut_id]
                try:
                    val = float(row['amount'])
                    nutrient_data[fdc][col_name] = val
                except:
                    pass
        
        if i % 1000000 == 0:
            print(f"Processed {i/1000000:.1f}M nutrient rows...")

# --- 5. Stream Portion Data ---
print("Streaming Portion Data...")
portion_data = {} # fdc_id -> { serving_size, serving_unit }

with open(os.path.join(USDA_CSV_DIR, 'food_portion.csv'), 'r', encoding='utf-8', errors='ignore') as f:
    reader = csv.DictReader(f)
    for row in reader:
        fdc = row['fdc_id']
        if fdc in mapped_fdc_ids:
            # We prefer 'serving' or just take the first one
            # If we don't have one yet, take this
            if fdc not in portion_data:
                try:
                    portion_data[fdc] = {
                        'serving_size': float(row['gram_weight']),
                        'serving_unit': row['modifier'] or row['portion_description']
                    }
                except:
                    pass

# --- 6. Update Database ---
print("Updating Supabase records...")
updates = 0
for local_id, fdc_id in matches:
    update_payload = {}
    
    # Nutrients
    if fdc_id in nutrient_data:
        update_payload.update(nutrient_data[fdc_id])
    
    # Portions
    if fdc_id in portion_data:
        update_payload.update(portion_data[fdc_id])
    
    if update_payload:
        update_payload['fdc_id'] = fdc_id
        try:
            supabase.from_('foods').update(update_payload).eq('id', local_id).execute()
            updates += 1
            if updates % 100 == 0:
                print(f"Updated {updates} records...")
        except Exception as e:
            print(f"Failed to update {local_id}: {e}")

print(f"Done! Updated {updates} foods with USDA data.")
