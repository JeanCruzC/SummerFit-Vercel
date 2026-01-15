#!/usr/bin/env python3
"""
Mark basic grocery items as is_simple_ingredient=true in Supabase
This enables the meal generator to prioritize simple ingredients
"""

import os
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from web/.env.local
script_dir = Path(__file__).parent.parent
env_file = script_dir / "web" / ".env.local"
print(f"Loading env from: {env_file}")
load_dotenv(env_file)

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Basic grocery items - these are simple, unprocessed ingredients
SIMPLE_INGREDIENT_PATTERNS = [
    # Proteins - Basic cuts
    "pechuga de pollo", "chicken breast",
    "muslo de pollo", "chicken thigh", 
    "pollo entero", "whole chicken",
    "bistec", "beef steak", "steak",
    "carne molida", "ground beef", "minced beef",
    "lomo de cerdo", "pork loin",
    "chuleta de cerdo", "pork chop",
    "salmon", "salmón",
    "tilapia",
    "atún", "tuna",
    "huevo", "egg", "eggs",
    "pavo", "turkey",
    "camarón", "shrimp", "camarones",
    
    # Carbs - Basic grains
    "arroz blanco", "white rice",
    "arroz integral", "brown rice",
    "avena", "oatmeal", "oats",
    "pasta", "spaghetti", "macaroni",
    "pan integral", "whole wheat bread",
    "pan blanco", "white bread",
    "papa", "potato", "patata",
    "camote", "sweet potato", "batata",
    "quinoa", "quinua",
    "frijoles negros", "black beans",
    "lentejas", "lentils",
    "garbanzos", "chickpeas",
    
    # Vegetables - Fresh produce
    "brócoli", "broccoli",
    "espinaca", "spinach",
    "lechuga", "lettuce",
    "tomate", "tomato",
    "pepino", "cucumber",
    "zanahoria", "carrot",
    "cebolla", "onion",
    "ajo", "garlic",
    "pimiento", "bell pepper", "pepper",
    "calabacín", "zucchini",
    "coliflor", "cauliflower",
    "apio", "celery",
    "habichuelas", "green beans",
    "chícharos", "peas",
    "champiñones", "mushrooms",
    "col", "cabbage",
    "berenjena", "eggplant",
    
    # Fruits - Fresh
    "manzana", "apple",
    "plátano", "banana", "banano",
    "naranja", "orange",
    "fresa", "strawberry", "fresas",
    "uvas", "grapes",
    "sandía", "watermelon",
    "melón", "melon", "cantaloupe",
    "piña", "pineapple",
    "mango",
    "pera", "pear",
    "durazno", "peach",
    "limón", "lemon",
    "lima", "lime",
    "papaya",
    "kiwi",
    "arándanos", "blueberries",
    "frambuesas", "raspberries",
    "cereza", "cherry", "cerezas",
    "pomelo", "grapefruit",
    
    # Fats - Simple sources
    "aceite de oliva", "olive oil",
    "aguacate", "avocado", "palta",
    "almendras", "almonds",
    "nueces", "walnuts",
    "maní", "peanuts", "cacahuates",
    "mantequilla", "butter",
    "aceite de coco", "coconut oil",
    
    # Dairy - Basic
    "leche", "milk",
    "yogur", "yogurt",
    "queso", "cheese",
    "queso cottage", "cottage cheese",
    "crema", "cream",
    
    # Legumes
    "frijoles", "beans",
    "habas", "fava beans",
    "lentejas", "lentils",
]

# Patterns to EXCLUDE (processed foods, dishes, etc.)
EXCLUDE_PATTERNS = [
    "preparado", "prepared",
    "receta", "recipe",
    "restaurante", "restaurant",
    "comida rápida", "fast food",
    "congelado", "frozen dinner",
    "listo para", "ready to",
    "empanizado", "breaded",
    "frito", "fried",  # Except for basic fried eggs
    "relleno", "stuffed",
    "gratinado", "gratin",
    "salsa", "sauce",
    "sopa", "soup",
    "guiso", "stew",
    "pastel", "pie", "cake",
    "galleta", "cookie", "biscuit",
    "helado", "ice cream",
    "postre", "dessert",
    "bebida", "beverage", "drink",
    "refresco", "soda",
    "cereal de desayuno", "breakfast cereal",
    "barra", "bar",
    "snack",
    "chips",
    "nugget",
    "hamburguesa", "burger",
    "pizza",
    "sandwich", "sándwich",
    "wrap",
    "taco",
    "burrito",
    "empanada",
    "croqueta",
    "tortuga",  # No turtle!
    "cocodrilo", "alligator",
    "patas de",  # No pig feet etc
    "intestino", "intestine",
    "lengua", "tongue",
    "cerebro", "brain",
    "hígado", "liver",  # Organ meats are not simple
    "riñón", "kidney",
    "corazón", "heart",
]


def is_simple_ingredient(name: str, name_es: str) -> bool:
    """Check if a food is a simple basic ingredient"""
    combined = f"{name} {name_es}".lower()
    
    # Check exclusions first
    for exclude in EXCLUDE_PATTERNS:
        if exclude.lower() in combined:
            return False
    
    # Check if matches any simple pattern
    for pattern in SIMPLE_INGREDIENT_PATTERNS:
        if pattern.lower() in combined:
            return True
    
    return False


def main():
    print("🔍 Fetching all foods from database...")
    
    # Fetch all foods
    offset = 0
    batch_size = 1000
    all_foods = []
    
    while True:
        result = supabase.table('foods').select('id, name, name_es').range(offset, offset + batch_size - 1).execute()
        if not result.data:
            break
        all_foods.extend(result.data)
        print(f"  Fetched {len(all_foods)} foods so far...")
        if len(result.data) < batch_size:
            break
        offset += batch_size
    
    print(f"📊 Total foods in database: {len(all_foods)}")
    
    # Identify simple ingredients
    simple_ids = []
    for food in all_foods:
        name = food.get('name', '') or ''
        name_es = food.get('name_es', '') or ''
        if is_simple_ingredient(name, name_es):
            simple_ids.append(food['id'])
    
    print(f"✅ Identified {len(simple_ids)} simple ingredients")
    
    if simple_ids:
        # Update in batches
        batch_size = 100
        for i in range(0, len(simple_ids), batch_size):
            batch = simple_ids[i:i+batch_size]
            supabase.table('foods').update({
                'is_simple_ingredient': True,
                'priority': 1  # Also set high priority
            }).in_('id', batch).execute()
            print(f"  Updated batch {i//batch_size + 1}/{(len(simple_ids)-1)//batch_size + 1}")
    
    # Set non-simple to false (only if currently null)
    print("🔄 Setting non-simple foods to is_simple_ingredient=false...")
    supabase.table('foods').update({
        'is_simple_ingredient': False
    }).is_('is_simple_ingredient', 'null').execute()
    
    print("🎉 Done! Simple ingredients have been marked in the database.")
    
    # Show some examples
    print("\n📋 Sample of marked simple ingredients:")
    sample = supabase.table('foods').select('name_es, name').eq('is_simple_ingredient', True).limit(20).execute()
    for food in sample.data:
        print(f"  ✓ {food.get('name_es') or food.get('name')}")


if __name__ == "__main__":
    main()
