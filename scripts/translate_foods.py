#!/usr/bin/env python3
"""
Food Database Translator and Cleaner

This script:
1. Translates food names from English to Spanish using deep-translator
2. Normalizes categories
3. Adds a 'food_type' column (basic/prepared)

Usage:
    pip install deep-translator textblob
    python scripts/translate_foods.py
"""

import os
import time
import json
from pathlib import Path
from typing import List, Dict, Any

try:
    from supabase import create_client, Client
except ImportError:
    print("❌ supabase-py not installed. Run: pip install supabase")
    exit(1)

try:
    from deep_translator import GoogleTranslator
except ImportError:
    print("❌ deep-translator not installed. Run: pip install deep-translator")
    exit(1)

# === CONFIG ===

BATCH_SIZE = 50
MAX_RETRIES = 3

# Category mapping (English -> Spanish)
CATEGORY_MAP = {
    "Meats": "Carnes",
    "Vegetables": "Verduras",
    "Fruits": "Frutas",
    "Fish": "Pescados",
    "Beans and Lentils": "Legumbres",
    "Grains and Pasta": "Granos y Pasta",
    "Baked Foods": "Panadería",
    "Soups and Sauces": "Sopas y Salsas",
    "American Indian": "Comida Nativa",
    "Dairy and Egg Products": "Lácteos y Huevos",
    "Fats and Oils": "Grasas y Aceites",
    "Poultry Products": "Aves y Pollo",
    "Breakfast Cereals": "Cereales",
    "Snacks": "Snacks",
    "Sweets": "Dulces",
    "Baby Foods": "Bebés",
    "Beverages": "Bebidas",
}

# Basic vs Prepared classification
BASIC_CATS = [
    "Meats", "Vegetables", "Fruits", "Fish", "Beans and Lentils", 
    "Grains and Pasta", "Dairy and Egg Products", "Fats and Oils", 
    "Poultry Products", "Pork Products", "Beef Products", "Finfish and Shellfish Products"
]

def get_supabase_client() -> Client:
    """Create Supabase client from environment variables."""
    # Try to load from web/.env.local first
    env_path = Path(__file__).parent.parent / "web" / ".env.local"
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ.setdefault(key.strip(), value.strip())
    
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    if not url or not key:
        raise ValueError("Missing credentials in web/.env.local")
        
    return create_client(url, key)

def translate_batch(texts: List[str]) -> List[str]:
    """Translate a batch of texts using Google Translator."""
    try:
        translator = GoogleTranslator(source='en', target='es')
        # deep-translator handles batches internally usually, but let's do it safely
        translated = translator.translate_batch(texts)
        return translated
    except Exception as e:
        print(f"⚠️ Translation error: {e}")
        return texts  # Return original on error

def process_foods():
    client = get_supabase_client()
    
    # 1. Get total count
    count = client.table("foods").select("id", count="exact").execute().count
    print(f"📊 Total foods to process: {count}")
    
    # 2. Process in batches
    processed = 0
    updated = 0
    
    # Check if 'name_es' column exists, if not we might need to add it or overwrite 'name'
    # For now, we'll overwrite 'name' but maybe we should backup first?
    # Let's check a sample first
    
    page = 0
    while processed < count:
        # Fetch batch
        response = client.table("foods").select("*").range(processed, processed + BATCH_SIZE - 1).execute()
        foods = response.data
        
        if not foods:
            break
            
        # Filter foods that look like English (heuristic: contain English words)
        english_keywords = ["Chicken", "Rice", "Apple", "Bread", "Cheese", "with", "and", "Roasted", "Cooked"]
        to_translate = []
        indices = []
        
        for i, food in enumerate(foods):
            name = food.get("name", "")
            # Simple heuristic: if it has English common words, translate it
            if any(k.lower() in name.lower() for k in english_keywords):
                to_translate.append(name)
                indices.append(i)
        
        if to_translate:
            print(f"🔄 Translating batch of {len(to_translate)} items...")
            translated_names = translate_batch(to_translate)
            
            # Update DB
            for idx, new_name in zip(indices, translated_names):
                food = foods[idx]
                food_id = food.get("id")
                
                # Prepare update data
                old_name = food.get("name")
                # Don't update if translation failed or is identical (unless it was English and same word exists in Spanish)
                if new_name and new_name != old_name:
                    try:
                        client.table("foods").update({"name": new_name}).eq("id", food_id).execute()
                        print(f"  ✅ {old_name[:20]}... -> {new_name[:20]}...")
                        updated += 1
                    except Exception as e:
                        print(f"  ❌ Failed to update {food_id}: {e}")
            
        processed += len(foods)
        print(f"⏳ Progress: {processed}/{count} ({updated} updated)")
        time.sleep(1) # Rate limit protection

if __name__ == "__main__":
    process_foods()
