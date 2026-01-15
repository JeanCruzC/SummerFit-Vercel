#!/usr/bin/env python3
"""
Complete Portion Enrichment Script
===================================
This script enriches ALL foods that have fdc_id with portion data from USDA CSVs.
It reads food_portion.csv and updates any food in Supabase that has a matching fdc_id.
"""

import os
import csv
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv('web/.env.local')

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing Supabase credentials")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# USDA CSV paths - try multiple sources
USDA_DIRS = [
    'USDA/csv/FoodData_Central_csv_2025-12-18',
    'USDA/csv/FoodData_Central_sr_legacy_food_csv_2018-04',
    'USDA/csv/FoodData_Central_foundation_food_csv_2025-12-18',
]

print("=" * 60)
print("COMPLETE PORTION ENRICHMENT")
print("=" * 60)

# Step 1: Get all foods from Supabase
print("\n1. Fetching all foods from database...")
all_foods = []
has_more = True
page = 0
limit = 1000

while has_more:
    res = supabase.from_('foods').select('id, name, fdc_id, serving_size').range(page*limit, (page+1)*limit - 1).execute()
    if not res.data:
        has_more = False
    else:
        all_foods.extend(res.data)
        page += 1
    if len(res.data) < limit:
        has_more = False

print(f"   Total foods in database: {len(all_foods)}")

# Separate foods by status
foods_with_fdc = [f for f in all_foods if f.get('fdc_id')]
foods_need_portions = [f for f in foods_with_fdc if not f.get('serving_size')]
foods_already_done = [f for f in foods_with_fdc if f.get('serving_size')]

print(f"   Foods with fdc_id: {len(foods_with_fdc)}")
print(f"   Already have portions: {len(foods_already_done)}")
print(f"   Need portions: {len(foods_need_portions)}")

if not foods_need_portions:
    print("\n✅ All foods with fdc_id already have portion data!")
    exit(0)

# Build lookup: fdc_id -> food record
fdc_to_food = {}
for f in foods_need_portions:
    fdc_id = str(f['fdc_id'])
    if fdc_id not in fdc_to_food:
        fdc_to_food[fdc_id] = []
    fdc_to_food[fdc_id].append(f)

print(f"   Unique fdc_ids to look up: {len(fdc_to_food)}")

# Step 2: Load portion data from ALL USDA sources
print("\n2. Loading portion data from USDA CSV files...")
portion_data = {}  # fdc_id -> { serving_size, serving_unit }

for usda_dir in USDA_DIRS:
    portion_file = os.path.join(usda_dir, 'food_portion.csv')
    if not os.path.exists(portion_file):
        print(f"   ⚠ Not found: {portion_file}")
        continue
    
    print(f"   Reading: {portion_file}")
    with open(portion_file, 'r', encoding='utf-8', errors='ignore') as f:
        reader = csv.DictReader(f)
        for row in reader:
            fdc = row.get('fdc_id', '')
            
            # Only process if we need this fdc_id
            if fdc in fdc_to_food and fdc not in portion_data:
                try:
                    gram_weight = float(row.get('gram_weight', 0))
                    modifier = row.get('modifier', '') or row.get('portion_description', '')
                    
                    if gram_weight > 0 and modifier:
                        portion_data[fdc] = {
                            'serving_size': gram_weight,
                            'serving_unit': modifier.strip()
                        }
                except:
                    pass

print(f"   Found portion data for {len(portion_data)} foods")

# Step 3: Update Supabase
print("\n3. Updating database...")
updates = 0
failures = 0

for fdc_id, portion_info in portion_data.items():
    foods_to_update = fdc_to_food.get(fdc_id, [])
    
    for food in foods_to_update:
        try:
            supabase.from_('foods').update({
                'serving_size': portion_info['serving_size'],
                'serving_unit': portion_info['serving_unit']
            }).eq('id', food['id']).execute()
            updates += 1
            
            if updates % 500 == 0:
                print(f"   Updated {updates} records...")
        except Exception as e:
            failures += 1
            if failures <= 5:
                print(f"   ✗ Failed: {food['name'][:30]} - {e}")

print(f"\n" + "=" * 60)
print(f"✅ COMPLETE! Updated {updates} foods with USDA portion data.")
print(f"   Failures: {failures}")
print(f"=" * 60)

# Step 4: Report remaining gaps
remaining = len(foods_need_portions) - updates
if remaining > 0:
    print(f"\n⚠ {remaining} foods still need portions (no USDA data available)")
    print("   These will use 'Smart Defaults' logic in the frontend.")
