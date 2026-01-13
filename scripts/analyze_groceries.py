#!/usr/bin/env python3
"""
Analyze USDA database to extract smart grocery/ingredient list
for the pantry selection onboarding feature.

This script:
1. Reads USDA foods from JSON files
2. Extracts unique base ingredients
3. Categorizes them by macro type
4. Outputs a structured grocery list for the app
"""

import json
import os
from collections import defaultdict
from pathlib import Path

# Categories based on USDA food groups and macros
CATEGORY_MAPPING = {
    # Proteins
    "Beef Products": "proteins",
    "Pork Products": "proteins",
    "Poultry Products": "proteins",
    "Lamb, Veal, and Game Products": "proteins",
    "Finfish and Shellfish Products": "proteins",
    "Sausages and Luncheon Meats": "proteins",
    "Legumes and Legume Products": "proteins",  # Also carbs, but high protein
    
    # Carbs
    "Cereal Grains and Pasta": "carbs",
    "Breakfast Cereals": "carbs",
    "Baked Products": "carbs",
    
    # Fruits
    "Fruits and Fruit Juices": "fruits",
    
    # Vegetables
    "Vegetables and Vegetable Products": "vegetables",
    
    # Dairy
    "Dairy and Egg Products": "dairy",
    
    # Fats
    "Fats and Oils": "fats",
    "Nut and Seed Products": "fats",
    
    # Others
    "Spices and Herbs": "condiments",
    "Beverages": "beverages",
    "Soups, Sauces, and Gravies": "condiments",
    "Sweets": "sweets",
    "Snacks": "snacks",
}

# Common grocery items we want to extract (Spanish names for UI)
GROCERY_ITEMS = {
    "proteins": [
        {"en": "chicken", "es": "Pollo", "emoji": "🍗"},
        {"en": "beef", "es": "Carne", "emoji": "🥩"},
        {"en": "pork", "es": "Chancho", "emoji": "🐷"},
        {"en": "fish", "es": "Pescado", "emoji": "🐟"},
        {"en": "tuna", "es": "Atún", "emoji": "🐟"},
        {"en": "salmon", "es": "Salmón", "emoji": "🐟"},
        {"en": "shrimp", "es": "Langostinos", "emoji": "🦐"},
        {"en": "turkey", "es": "Pavo", "emoji": "🦃"},
        {"en": "egg", "es": "Huevo", "emoji": "🥚"},
        {"en": "ham", "es": "Jamón", "emoji": "🍖"},
        {"en": "bacon", "es": "Tocino", "emoji": "🥓"},
        {"en": "tofu", "es": "Tofu", "emoji": "🧈"},
        {"en": "beans", "es": "Frijoles", "emoji": "🫘"},
        {"en": "lentils", "es": "Lentejas", "emoji": "🫘"},
        {"en": "chickpeas", "es": "Garbanzos", "emoji": "🫘"},
    ],
    "carbs": [
        {"en": "rice", "es": "Arroz", "emoji": "🍚"},
        {"en": "potato", "es": "Papa", "emoji": "🥔"},
        {"en": "sweet potato", "es": "Camote", "emoji": "🍠"},
        {"en": "pasta", "es": "Pasta", "emoji": "🍝"},
        {"en": "bread", "es": "Pan", "emoji": "🍞"},
        {"en": "oats", "es": "Avena", "emoji": "🌾"},
        {"en": "quinoa", "es": "Quinua", "emoji": "🌾"},
        {"en": "corn", "es": "Choclo", "emoji": "🌽"},
        {"en": "tortilla", "es": "Tortilla", "emoji": "🫓"},
        {"en": "cereal", "es": "Cereal", "emoji": "🥣"},
        {"en": "noodles", "es": "Fideos", "emoji": "🍜"},
        {"en": "yuca", "es": "Yuca", "emoji": "🥔"},
    ],
    "fats": [
        {"en": "avocado", "es": "Palta", "emoji": "🥑"},
        {"en": "peanut", "es": "Maní", "emoji": "🥜"},
        {"en": "peanut butter", "es": "Mantequilla de Maní", "emoji": "🥜"},
        {"en": "almond", "es": "Almendras", "emoji": "🌰"},
        {"en": "walnut", "es": "Nueces", "emoji": "🌰"},
        {"en": "cashew", "es": "Cashews", "emoji": "🌰"},
        {"en": "olive", "es": "Aceitunas", "emoji": "🫒"},
        {"en": "olive oil", "es": "Aceite de Oliva", "emoji": "🫒"},
        {"en": "coconut", "es": "Coco", "emoji": "🥥"},
        {"en": "chia", "es": "Chía", "emoji": "🌱"},
        {"en": "flax", "es": "Linaza", "emoji": "🌱"},
        {"en": "sunflower", "es": "Girasol", "emoji": "🌻"},
    ],
    "vegetables": [
        {"en": "lettuce", "es": "Lechuga", "emoji": "🥬"},
        {"en": "tomato", "es": "Tomate", "emoji": "🍅"},
        {"en": "broccoli", "es": "Brócoli", "emoji": "🥦"},
        {"en": "carrot", "es": "Zanahoria", "emoji": "🥕"},
        {"en": "spinach", "es": "Espinaca", "emoji": "🥬"},
        {"en": "onion", "es": "Cebolla", "emoji": "🧅"},
        {"en": "garlic", "es": "Ajo", "emoji": "🧄"},
        {"en": "cucumber", "es": "Pepino", "emoji": "🥒"},
        {"en": "pepper", "es": "Pimiento", "emoji": "🫑"},
        {"en": "zucchini", "es": "Zapallo Italiano", "emoji": "🥒"},
        {"en": "cabbage", "es": "Repollo", "emoji": "🥬"},
        {"en": "celery", "es": "Apio", "emoji": "🥬"},
        {"en": "asparagus", "es": "Espárrago", "emoji": "🌿"},
        {"en": "mushroom", "es": "Champiñones", "emoji": "🍄"},
        {"en": "cauliflower", "es": "Coliflor", "emoji": "🥦"},
        {"en": "eggplant", "es": "Berenjena", "emoji": "🍆"},
        {"en": "squash", "es": "Zapallo", "emoji": "🎃"},
        {"en": "beet", "es": "Betarraga", "emoji": "🥬"},
        {"en": "green beans", "es": "Vainitas", "emoji": "🌿"},
        {"en": "artichoke", "es": "Alcachofa", "emoji": "🌿"},
    ],
    "fruits": [
        {"en": "banana", "es": "Plátano", "emoji": "🍌"},
        {"en": "apple", "es": "Manzana", "emoji": "🍎"},
        {"en": "orange", "es": "Naranja", "emoji": "🍊"},
        {"en": "strawberry", "es": "Fresas", "emoji": "🍓"},
        {"en": "blueberry", "es": "Arándanos", "emoji": "🫐"},
        {"en": "pineapple", "es": "Piña", "emoji": "🍍"},
        {"en": "mango", "es": "Mango", "emoji": "🥭"},
        {"en": "papaya", "es": "Papaya", "emoji": "🍈"},
        {"en": "watermelon", "es": "Sandía", "emoji": "🍉"},
        {"en": "grape", "es": "Uvas", "emoji": "🍇"},
        {"en": "peach", "es": "Durazno", "emoji": "🍑"},
        {"en": "pear", "es": "Pera", "emoji": "🍐"},
        {"en": "kiwi", "es": "Kiwi", "emoji": "🥝"},
        {"en": "lemon", "es": "Limón", "emoji": "🍋"},
        {"en": "lime", "es": "Lima", "emoji": "🍋"},
        {"en": "melon", "es": "Melón", "emoji": "🍈"},
        {"en": "tangerine", "es": "Mandarina", "emoji": "🍊"},
        {"en": "cherry", "es": "Cereza", "emoji": "🍒"},
        {"en": "dates", "es": "Dátiles", "emoji": "🌴"},
    ],
    "dairy": [
        {"en": "milk", "es": "Leche", "emoji": "🥛"},
        {"en": "yogurt", "es": "Yogurt", "emoji": "🥛"},
        {"en": "cheese", "es": "Queso", "emoji": "🧀"},
        {"en": "cottage cheese", "es": "Requesón", "emoji": "🧀"},
        {"en": "cream", "es": "Crema", "emoji": "🥛"},
        {"en": "butter", "es": "Mantequilla", "emoji": "🧈"},
        {"en": "soy milk", "es": "Leche de Soya", "emoji": "🥛"},
        {"en": "almond milk", "es": "Leche de Almendras", "emoji": "🥛"},
        {"en": "coconut milk", "es": "Leche de Coco", "emoji": "🥥"},
    ],
    "condiments": [
        {"en": "mustard", "es": "Mostaza", "emoji": "🟡"},
        {"en": "ketchup", "es": "Salsa de Tomate", "emoji": "🍅"},
        {"en": "soy sauce", "es": "Sillao", "emoji": "🫗"},
        {"en": "vinegar", "es": "Vinagre", "emoji": "🫗"},
        {"en": "honey", "es": "Miel", "emoji": "🍯"},
        {"en": "cinnamon", "es": "Canela", "emoji": "🌿"},
        {"en": "turmeric", "es": "Cúrcuma", "emoji": "🌿"},
        {"en": "ginger", "es": "Jengibre", "emoji": "🫚"},
        {"en": "pepper", "es": "Pimienta", "emoji": "🌶️"},
        {"en": "paprika", "es": "Pimentón", "emoji": "🌶️"},
        {"en": "oregano", "es": "Orégano", "emoji": "🌿"},
        {"en": "basil", "es": "Albahaca", "emoji": "🌿"},
        {"en": "cumin", "es": "Comino", "emoji": "🌿"},
    ],
}


def load_usda_data():
    """Load all USDA JSON files."""
    data_dir = Path(__file__).parent.parent / "data" / "usda"
    all_foods = []
    
    for json_file in data_dir.glob("**/*.json"):
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict) and 'SRLegacyFoods' in data:
                    all_foods.extend(data['SRLegacyFoods'])
                elif isinstance(data, dict) and 'FoundationFoods' in data:
                    all_foods.extend(data['FoundationFoods'])
        except Exception as e:
            print(f"Error loading {json_file}: {e}")
    
    return all_foods


def find_grocery_in_usda(foods, grocery_name):
    """Find USDA foods matching a grocery item."""
    matches = []
    search_term = grocery_name.lower()
    
    for food in foods:
        name = food.get('description', '').lower()
        # Check if the grocery name is in the food name
        if search_term in name:
            # Prefer simpler/raw versions
            is_raw = 'raw' in name
            is_simple = len(name.split(',')) <= 3
            matches.append({
                'name': food.get('description'),
                'category': food.get('foodCategory', {}).get('description', 'Unknown'),
                'is_raw': is_raw,
                'is_simple': is_simple,
                'score': (2 if is_raw else 0) + (1 if is_simple else 0)
            })
    
    # Sort by score (prefer raw and simple)
    matches.sort(key=lambda x: x['score'], reverse=True)
    return matches[:5]  # Return top 5


def analyze_groceries():
    """Main analysis function."""
    print("=" * 80)
    print("ANÁLISIS DE INGREDIENTES DISPONIBLES EN USDA")
    print("=" * 80)
    
    # Load USDA data
    print("\n📂 Cargando datos USDA...")
    foods = load_usda_data()
    print(f"   Total alimentos: {len(foods)}")
    
    # Analyze each category
    results = {}
    
    for category, items in GROCERY_ITEMS.items():
        print(f"\n{'='*60}")
        print(f"📦 CATEGORÍA: {category.upper()}")
        print(f"{'='*60}")
        
        category_results = []
        
        for item in items:
            matches = find_grocery_in_usda(foods, item['en'])
            found = len(matches) > 0
            
            status = "✅" if found else "❌"
            print(f"\n{status} {item['emoji']} {item['es']} ({item['en']})")
            
            if matches:
                print(f"   Encontrados: {len(matches)} coincidencias")
                print(f"   Mejor match: {matches[0]['name'][:60]}...")
                category_results.append({
                    **item,
                    'found': True,
                    'usda_count': len(matches),
                    'best_match': matches[0]['name']
                })
            else:
                print(f"   ⚠️ No encontrado en USDA")
                category_results.append({
                    **item,
                    'found': False,
                    'usda_count': 0,
                    'best_match': None
                })
        
        results[category] = category_results
    
    # Generate final grocery list
    print("\n" + "=" * 80)
    print("📋 LISTA FINAL DE INGREDIENTES PARA ONBOARDING")
    print("=" * 80)
    
    total_found = 0
    total_items = 0
    
    grocery_list = {}
    
    for category, items in results.items():
        found_items = [i for i in items if i['found']]
        total_found += len(found_items)
        total_items += len(items)
        
        print(f"\n{category.upper()}: {len(found_items)}/{len(items)} ingredientes")
        
        grocery_list[category] = []
        for item in found_items:
            grocery_list[category].append({
                'name_en': item['en'],
                'name_es': item['es'],
                'emoji': item['emoji'],
                'usda_search_term': item['en']
            })
            print(f"   {item['emoji']} {item['es']}")
    
    print(f"\n{'='*80}")
    print(f"📊 RESUMEN: {total_found}/{total_items} ingredientes encontrados en USDA")
    print(f"{'='*80}")
    
    # Save as JSON
    output_file = Path(__file__).parent / "grocery_list.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(grocery_list, f, ensure_ascii=False, indent=2)
    print(f"\n💾 Lista guardada en: {output_file}")
    
    # Generate TypeScript constant
    print("\n" + "=" * 80)
    print("📝 CONSTANTE TYPESCRIPT PARA EL FRONTEND")
    print("=" * 80)
    
    print("\nexport const GROCERY_CATEGORIES = {")
    for category, items in grocery_list.items():
        print(f"  {category}: [")
        for item in items:
            print(f"    {{ name: \"{item['name_es']}\", searchTerm: \"{item['name_en']}\", emoji: \"{item['emoji']}\" }},")
        print("  ],")
    print("};")


if __name__ == "__main__":
    analyze_groceries()
