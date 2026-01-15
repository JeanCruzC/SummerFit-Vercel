#!/usr/bin/env python3
"""
Manual Portion Fix Script
=========================
Fix serving_size/serving_unit for essential foods that were missed by exact-match enrichment.
This script directly updates Supabase with correct portion data from USDA.
"""

import os
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

# Manual mappings: (name_pattern, fdc_id, serving_size, serving_unit)
# These are the most common foods used by the meal generator
MANUAL_PORTIONS = [
    # Eggs
    ('huevo', '171287', 50.0, 'large'),
    ('egg', '171287', 50.0, 'large'),
    
    # Bread
    ('pan integral', '168013', 28.0, 'slice'),
    ('pan blanco', '325871', 28.0, 'slice'),
    ('bread', '325871', 28.0, 'slice'),
    
    # Rice
    ('arroz', '169756', 158.0, 'cup cooked'),
    ('rice', '169756', 158.0, 'cup cooked'),
    
    # Oats/Avena
    ('avena', '168878', 234.0, 'cup cooked'),
    ('oat', '168878', 234.0, 'cup cooked'),
    
    # Chicken
    ('pechuga de pollo', '171473', 120.0, 'fillet'),
    ('muslo de pollo', '171480', 52.0, 'thigh'),
    ('pollo', '171473', 120.0, 'fillet'),
    ('chicken', '171473', 120.0, 'fillet'),
    
    # Fruits
    ('plátano', '173944', 118.0, 'medium'),
    ('banana', '173944', 118.0, 'medium'),
    ('manzana', '171688', 182.0, 'medium'),
    ('apple', '171688', 182.0, 'medium'),
    ('naranja', '169097', 131.0, 'medium'),
    ('orange', '169097', 131.0, 'medium'),
    
    # Beef/Pork
    ('bistec', '173927', 85.0, 'slice (3 oz)'),
    ('lomo de cerdo', '167820', 85.0, 'slice (3 oz)'),
    ('steak', '173927', 85.0, 'slice (3 oz)'),
    
    # Vegetables
    ('espinaca', '168462', 30.0, 'cup raw'),
    ('lechuga', '169247', 36.0, 'cup shredded'),
    ('tomate', '170457', 123.0, 'medium'),
    ('papa', '170027', 150.0, 'medium'),
    ('camote', '168482', 130.0, 'medium'),
    ('brócoli', '170379', 91.0, 'cup chopped'),
    
    # Dairy
    ('leche', '173428', 244.0, 'cup'),
    ('milk', '173428', 244.0, 'cup'),
    ('queso', '170856', 28.0, 'slice (1 oz)'),
    ('yogurt', '170902', 170.0, 'container (6 oz)'),
    
    # Grains
    ('quinua', '168917', 185.0, 'cup cooked'),
    ('quinoa', '168917', 185.0, 'cup cooked'),
    
    # Fats
    ('almendra', '170567', 28.0, 'oz (23 almonds)'),
    ('aguacate', '171706', 201.0, 'whole'),
    ('avocado', '171706', 201.0, 'whole'),
    
    # Fish
    ('atún', '175159', 85.0, 'can (3 oz)'),
    ('salmón', '173686', 85.0, 'fillet piece'),
]

print("Fixing portion data for essential foods...")
updates = 0

for pattern, fdc_id, serving_size, serving_unit in MANUAL_PORTIONS:
    # Find all foods matching this pattern
    res = supabase.from_('foods').select('id, name').ilike('name', f'%{pattern}%').execute()
    
    if res.data:
        for food in res.data:
            try:
                supabase.from_('foods').update({
                    'fdc_id': fdc_id,
                    'serving_size': serving_size,
                    'serving_unit': serving_unit
                }).eq('id', food['id']).execute()
                updates += 1
                print(f"  ✓ {food['name']}: {serving_size} {serving_unit}")
            except Exception as e:
                print(f"  ✗ Failed: {food['name']} - {e}")

print(f"\n✅ Done! Updated {updates} food records with manual portion data.")
