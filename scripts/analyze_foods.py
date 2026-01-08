#!/usr/bin/env python3
"""
Food Category Analyzer

This script analyzes foods from the database and classifies them into:
- BÁSICOS: Raw ingredients (rice, tomato, chicken, eggs, fruits, vegetables)
- PREPARADOS: Prepared dishes (restaurant food, fast food, snacks, pastries)

Usage:
    python analyze_foods.py --analyze    # Analyze and show statistics
    python analyze_foods.py --update     # Update database with food_type column
    python analyze_foods.py --export     # Export classification to JSON
"""

import os
import json
import argparse
from typing import Literal

# Try to import supabase, but allow the script to work without it for testing
try:
    from supabase import create_client, Client
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False
    print("⚠️  supabase-py not installed. Run: pip install supabase")

# === CATEGORY CLASSIFICATION ===

BASIC_CATEGORIES = [
    "Dairy and Egg Products",
    "Fats and Oils",
    "Poultry Products",
    "Fruits and Fruit Juices",
    "Pork Products",
    "Vegetables and Vegetable Products",
    "Nut and Seed Products",
    "Beef Products",
    "Finfish and Shellfish Products",
    "Legumes and Legume Products",
    "Lamb, Veal, and Game Products",
    "Cereal Grains and Pasta",
    "Spices and Herbs",
    "Beverages",
]

PREPARED_CATEGORIES = [
    "Fast Foods",
    "Meals, Entrees, and Side Dishes",
    "Restaurant Foods",
    "Soups, Sauces, and Gravies",
    "Snacks",
    "Sweets",
    "Baked Products",
    "Breakfast Cereals",
    "Baby Foods",
    "Sausages and Luncheon Meats",
]

# Spanish translations
CATEGORY_TRANSLATIONS = {
    "Dairy and Egg Products": "Lácteos y Huevos",
    "Spices and Herbs": "Especias y Hierbas",
    "Baby Foods": "Bebés",
    "Fats and Oils": "Grasas y Aceites",
    "Poultry Products": "Aves y Pollo",
    "Soups, Sauces, and Gravies": "Sopas y Salsas",
    "Sausages and Luncheon Meats": "Embutidos",
    "Breakfast Cereals": "Cereales",
    "Fruits and Fruit Juices": "Frutas",
    "Pork Products": "Cerdo",
    "Vegetables and Vegetable Products": "Verduras",
    "Nut and Seed Products": "Nueces y Semillas",
    "Beef Products": "Ternera",
    "Beverages": "Bebidas",
    "Finfish and Shellfish Products": "Pescados y Mariscos",
    "Legumes and Legume Products": "Legumbres",
    "Lamb, Veal, and Game Products": "Cordero y Caza",
    "Baked Products": "Panadería",
    "Sweets": "Dulces",
    "Cereal Grains and Pasta": "Granos y Pasta",
    "Fast Foods": "Comida Rápida",
    "Meals, Entrees, and Side Dishes": "Platos Preparados",
    "Snacks": "Snacks",
    "American Indian/Alaska Native Foods": "Comida Nativa",
    "Restaurant Foods": "Restaurante",
}


def classify_food(category: str | None) -> Literal["basic", "prepared", "other"]:
    """Classify a food based on its category."""
    if not category:
        return "other"
    if category in BASIC_CATEGORIES:
        return "basic"
    if category in PREPARED_CATEGORIES:
        return "prepared"
    return "other"


def translate_category(category: str) -> str:
    """Translate category to Spanish."""
    return CATEGORY_TRANSLATIONS.get(category, category)


def get_supabase_client() -> "Client":
    """Create Supabase client from environment variables."""
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        raise ValueError(
            "Missing Supabase credentials.\n"
            "Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables."
        )
    
    return create_client(url, key)


def analyze_foods():
    """Analyze foods and print statistics."""
    if not HAS_SUPABASE:
        print("❌ Cannot analyze without supabase-py installed")
        return
    
    client = get_supabase_client()
    
    print("📊 Fetching foods from database...")
    response = client.table("foods").select("id, name, category").execute()
    foods = response.data
    
    if not foods:
        print("❌ No foods found in database")
        return
    
    print(f"✅ Found {len(foods)} foods\n")
    
    # Classify
    stats = {"basic": 0, "prepared": 0, "other": 0}
    category_counts: dict[str, int] = {}
    
    for food in foods:
        cat = food.get("category", "")
        food_type = classify_food(cat)
        stats[food_type] += 1
        
        if cat:
            category_counts[cat] = category_counts.get(cat, 0) + 1
    
    # Print statistics
    print("=" * 50)
    print("📈 CLASIFICACIÓN DE ALIMENTOS")
    print("=" * 50)
    print(f"🥬 Básicos:    {stats['basic']:,} ({stats['basic']/len(foods)*100:.1f}%)")
    print(f"🍔 Preparados: {stats['prepared']:,} ({stats['prepared']/len(foods)*100:.1f}%)")
    print(f"❓ Otros:      {stats['other']:,} ({stats['other']/len(foods)*100:.1f}%)")
    print()
    
    # Print categories
    print("=" * 50)
    print("📋 CATEGORÍAS (ordenadas por cantidad)")
    print("=" * 50)
    
    sorted_cats = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)
    for cat, count in sorted_cats:
        translated = translate_category(cat)
        food_type = classify_food(cat)
        emoji = "🥬" if food_type == "basic" else "🍔" if food_type == "prepared" else "❓"
        print(f"{emoji} {translated:40s} ({cat:40s}): {count:,}")


def export_classification():
    """Export classification to JSON file."""
    output = {
        "basic_categories": BASIC_CATEGORIES,
        "prepared_categories": PREPARED_CATEGORIES,
        "translations": CATEGORY_TRANSLATIONS,
    }
    
    output_path = os.path.join(os.path.dirname(__file__), "food_classification.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Classification exported to: {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Analyze and classify foods")
    parser.add_argument("--analyze", action="store_true", help="Analyze foods and show statistics")
    parser.add_argument("--export", action="store_true", help="Export classification to JSON")
    parser.add_argument("--update", action="store_true", help="Update database with food_type column")
    
    args = parser.parse_args()
    
    if args.analyze:
        analyze_foods()
    elif args.export:
        export_classification()
    elif args.update:
        print("⚠️  Database update not implemented yet")
        print("   Would add 'food_type' column to foods table")
    else:
        # Default: show classification info
        print("🍽️  CLASIFICACIÓN DE ALIMENTOS")
        print()
        print("CATEGORÍAS BÁSICAS (ingredientes crudos):")
        for cat in BASIC_CATEGORIES:
            print(f"  • {translate_category(cat)} ({cat})")
        print()
        print("CATEGORÍAS PREPARADAS (platos listos):")
        for cat in PREPARED_CATEGORIES:
            print(f"  • {translate_category(cat)} ({cat})")
        print()
        print("Uso:")
        print("  python analyze_foods.py --analyze   # Ver estadísticas")
        print("  python analyze_foods.py --export    # Exportar a JSON")


if __name__ == "__main__":
    main()
