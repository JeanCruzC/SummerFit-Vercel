#!/usr/bin/env python3
"""
Simple Ingredient Tagger for SummerFit
Connects to Supabase and intelligently tags foods as simple ingredients
based on name patterns, culinary category, and exclusion rules.
"""

import os
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from web/.env.local
script_dir = Path(__file__).parent
web_env = script_dir.parent / "web" / ".env.local"
if web_env.exists():
    load_dotenv(web_env)
else:
    load_dotenv()  # Fallback to default

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ============================================================
# CONFIGURATION: Define what makes a "simple ingredient"
# ============================================================

# Priority 1: Core simple ingredients (most basic groceries)
SIMPLE_KEYWORDS_PRIORITY_1 = [
    # Proteins
    "huevo", "huevos", "pollo", "pechuga", "muslo", "carne", "res", "cerdo",
    "pescado", "atun", "atún", "salmon", "salmón", "tilapia", "trucha",
    "camarón", "camarones", "pulpo", "calamar",
    # Dairy
    "leche", "queso", "yogurt", "yogur", "mantequilla", "crema",
    # Carbs
    "arroz", "papa", "patata", "camote", "batata", "avena", "quinua", "quinoa",
    "frijol", "frijoles", "lenteja", "lentejas", "garbanzo", "garbanzos",
    "maíz", "choclo", "arveja", "alverja", "habas",
    # Vegetables
    "tomate", "cebolla", "ajo", "zanahoria", "brócoli", "brocoli", "espinaca",
    "lechuga", "pepino", "pimiento", "calabacín", "calabaza", "apio",
    "coliflor", "repollo", "col", "berenjena", "champiñón", "champiñones",
    "acelga", "espárrago", "rábano", "nabo", "remolacha", "betabel",
    # Fruits
    "manzana", "naranja", "plátano", "platano", "banana", "fresa", "fresas",
    "uva", "uvas", "pera", "durazno", "melocotón", "mango", "piña", "papaya",
    "sandía", "melón", "kiwi", "limón", "lima", "mandarina", "toronja",
    "cereza", "ciruela", "mora", "arándano", "frambuesa", "coco",
    "aguacate", "palta", "guayaba", "maracuyá", "granadilla",
    # Fats/Oils
    "aceite de oliva", "aceite de coco", "aceite vegetal",
    "almendra", "almendras", "nuez", "nueces", "maní", "cacahuate",
    "semilla de girasol", "semilla de calabaza", "linaza", "chía",
    # Liquids
    "agua", "caldo", "jugo natural",
    # Grains
    "pan integral", "pasta", "espagueti", "fideos", "tortilla de maíz",
    "harina de trigo", "harina de maíz", "harina de avena",
]

# Priority 2: Less common but still simple ingredients
SIMPLE_KEYWORDS_PRIORITY_2 = [
    "hinojo", "alcachofa", "puerro", "endivias", "rúcula", "arúgula",
    "berro", "perejil", "cilantro", "albahaca", "orégano", "tomillo",
    "romero", "menta", "jengibre", "cúrcuma", "canela",
    "sardina", "anchoa", "bacalao", "merluza", "robalo", "corvina",
    "pavo", "cordero", "conejo", "codorniz", "pato",
    "tofu", "tempeh", "edamame", "soja", "soya",
    "avellana", "pistacho", "macadamia", "anacardo", "castaña",
    "tamarindo", "carambola", "pitahaya", "lichi", "rambután",
    "higo", "dátil", "pasas", "ciruelas pasas",
]

# Patterns that indicate RAW/SIMPLE state (Spanish)
RAW_INDICATORS = [
    "crudo", "cruda", "crudos", "crudas",
    "fresco", "fresca", "frescos", "frescas",
    "natural", "naturales",
    "entero", "entera", "enteros", "enteras",
    "en rama", "sin procesar",
    "orgánico", "orgánica",
]

# Patterns that indicate PROCESSED/PREPARED state (EXCLUDE these)
PROCESSED_INDICATORS = [
    "frito", "frita", "fritos", "fritas",
    "empanizado", "empanizada", "rebozado", "rebozada",
    "preparado", "preparada", "preparados", "preparadas",
    "cocido", "cocida", "cocinado", "cocinada",
    "horneado", "horneada", "asado", "asada",
    "en salsa", "con salsa", "a la",
    "gratinado", "gratinada",
    "relleno", "rellena", "rellenos", "rellenas",
    "estofado", "estofada", "guisado", "guisada",
    "ahumado", "ahumada",
    "enlatado", "enlatada", "en lata",
    "congelado", "congelada",  # Debatable, but usually less fresh
    "deshidratado", "deshidratada",
    "procesado", "procesada",
    "instantáneo", "instantánea",
    "precocido", "precocida",
    "empaquetado", "empaquetada",
    "marinado", "marinada",
    "adobado", "adobada",
    "curado", "curada",
    "conserva", "en conserva",
    "seco", "seca",  # Context dependent
    "polvo", "en polvo",
    "concentrado", "concentrada",
    "comercial",
    # Prepared dishes
    "sopa", "crema de", "pure", "puré",
    "ensalada", "salsa", "aderezo",
    "sandwich", "sándwich", "hamburguesa", "hot dog",
    "pizza", "lasagna", "lasaña",
    "taco", "burrito", "enchilada", "tamales",
    "ceviche", "sushi", "curry",
    "pastel", "torta", "bizcocho", "galleta", "galletas",
    "helado", "postre", "dulce",
    "cereal", "granola", "barra de",
    "snack", "botana", "aperitivo",
    "comida", "plato", "receta",
]

# Culinary categories that are typically simple
SIMPLE_CATEGORIES = [
    "fruta", "verdura", "vegetal", "hortaliza",
    "proteina", "carne", "pescado", "mariscos",
    "lacteo", "lácteo", "huevo",
    "grano", "cereal", "legumbre",
    "grasa", "aceite", "nuez", "semilla",
]

def is_simple_ingredient(name: str, category: str = "") -> tuple[bool, int]:
    """
    Analyze if a food is a simple ingredient.
    Returns (is_simple: bool, priority: int)
    Priority: 1 = most basic, 10 = secondary simple, 50 = standard, 100 = processed
    """
    name_lower = name.lower()
    category_lower = (category or "").lower()
    
    # First check: Exclude if has processed indicators
    for indicator in PROCESSED_INDICATORS:
        if indicator in name_lower:
            return (False, 100)
    
    # Check for priority 1 keywords
    for keyword in SIMPLE_KEYWORDS_PRIORITY_1:
        if keyword in name_lower:
            # Bonus if also has raw indicator
            for raw in RAW_INDICATORS:
                if raw in name_lower:
                    return (True, 1)
            return (True, 5)
    
    # Check for priority 2 keywords
    for keyword in SIMPLE_KEYWORDS_PRIORITY_2:
        if keyword in name_lower:
            return (True, 10)
    
    # Check by category
    for simple_cat in SIMPLE_CATEGORIES:
        if simple_cat in category_lower:
            # It's in a simple category but wasn't matched by keywords
            # Give it medium priority
            return (True, 20)
    
    # Has raw indicator but wasn't caught above
    for raw in RAW_INDICATORS:
        if raw in name_lower:
            return (True, 15)
    
    # Default: Not simple
    return (False, 50)


def tag_foods():
    """Main function to tag all foods in the database."""
    print("🔍 Fetching foods from database (with pagination)...")
    
    # Paginate through all foods (Supabase default limit is 1000)
    all_foods = []
    page_size = 1000
    offset = 0
    
    while True:
        response = supabase.table('foods')\
            .select('id, name, culinary_category')\
            .range(offset, offset + page_size - 1)\
            .execute()
        
        batch = response.data
        if not batch:
            break
            
        all_foods.extend(batch)
        print(f"  Fetched {len(all_foods)} foods...")
        
        if len(batch) < page_size:
            break  # Last page
        offset += page_size
    
    foods = all_foods
    
    print(f"📊 Found {len(foods)} foods to analyze")
    
    simple_count = 0
    updates = []
    
    for food in foods:
        food_id = food['id']
        name = food['name'] or ""
        category = food.get('culinary_category', "") or ""
        
        is_simple, priority = is_simple_ingredient(name, category)
        
        updates.append({
            'id': food_id,
            'is_simple_ingredient': is_simple,
            'priority': priority
        })
        
        if is_simple:
            simple_count += 1
    
    print(f"✅ Identified {simple_count} simple ingredients out of {len(foods)} total")
    print(f"📈 Ratio: {simple_count/len(foods)*100:.1f}% are simple ingredients")
    
    # Batch update in chunks
    print("\n⬆️ Updating database...")
    chunk_size = 100
    for i in range(0, len(updates), chunk_size):
        chunk = updates[i:i+chunk_size]
        for item in chunk:
            supabase.table('foods').update({
                'is_simple_ingredient': item['is_simple_ingredient'],
                'priority': item['priority']
            }).eq('id', item['id']).execute()
        
        progress = min(i + chunk_size, len(updates))
        print(f"  Updated {progress}/{len(updates)} foods...")
    
    print("\n🎉 Done! Foods have been tagged.")
    
    # Show sample results
    print("\n📋 Sample SIMPLE ingredients (Priority 1-5):")
    sample = supabase.table('foods')\
        .select('name, priority')\
        .eq('is_simple_ingredient', True)\
        .lte('priority', 5)\
        .limit(15)\
        .execute()
    
    for item in sample.data:
        print(f"  ⭐ {item['name']} (P{item['priority']})")
    
    print("\n📋 Sample NON-SIMPLE foods (Priority 100):")
    sample_processed = supabase.table('foods')\
        .select('name, priority')\
        .eq('is_simple_ingredient', False)\
        .limit(10)\
        .execute()
    
    for item in sample_processed.data:
        print(f"  🍽️ {item['name']}")


if __name__ == "__main__":
    print("=" * 60)
    print("🥬 SummerFit Simple Ingredient Tagger")
    print("=" * 60)
    tag_foods()
