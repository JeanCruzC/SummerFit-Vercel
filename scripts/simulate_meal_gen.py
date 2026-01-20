
import json
import random
import os

# CONFIG
TARGET_KCAL = 1524
TARGET_PROTEIN = 135
MEALS_COUNT = 4
JSON_PATH = '/home/jcc/Descargas/SummerFit--main/SummerFit-Vercel-main/USDA/fitia_plus_fndds_AyB_single_base.json'

def load_foods():
    with open(JSON_PATH) as f:
        data = json.load(f)
    print(f"📚 Loaded {len(data)} items provided.")
    # Filter only Tier 1 if possible, else allow Tier 2
    tier1 = [x for x in data if x.get('food_tier') == 1]
    print(f"✨ Found {len(tier1)} Tier 1 (Whole Food) items.")
    return tier1 if tier1 else data

def pick_food(foods, category_keywords):
    # Strict Clean Filter
    candidates = []
    bad_words = ['fried', 'pizza', 'burger', 'fast food', 'mixed', 'salad', 'dressing', 'spread', 'cake', 'cookie', 'pie']
    
    for f in foods:
        cat = f.get('category', '').lower()
        name = (f.get('name') or '').lower()
        name_es = (f.get('name_es') or '').lower()
        
        # Must match category keyword
        if not (any(k in cat for k in category_keywords) or any(k in name_es for k in category_keywords) or any(k in name for k in category_keywords)):
            continue
            
        # Must NOT have bad words
        if any(b in name for b in bad_words) or any(b in name_es for b in bad_words):
            continue
            
        # Heuristic: Short names are usually whole foods (e.g. "Apple" vs "Apple pie with crust")
        if len(name.split(',')) > 3: continue 
        
        candidates.append(f)
    
    if not candidates: 
        # Fallback to looser search if nothing found
        return None
        
    # Pick the one with shortest name (likely cleanest)
    candidates.sort(key=lambda x: len(x.get('name_es') or x.get('name')))
    # Pick random from top 5 shortest to vary
    return random.choice(candidates[:5])

def simulate():
    foods = load_foods()
    
    # Meal Structure (Standard)
    # Meal 1: Breakfast (Eggs/Dairy)
    # Meal 2: Lunch (Chicken/Meat + Rice/Starch + Veg)
    # Meal 3: Snack (Fruit/Yogurt/Nuts)
    # Meal 4: Dinner (Fish/Lean Meat + Veg)

    menu = []

    # 1. Select Base Foods
    m1_prot = pick_food(foods, ['egg', 'huevo', 'cheese', 'queso', 'yogurt'])
    m1_carb = pick_food(foods, ['oat', 'avena', 'bread', 'pan', 'fruit', 'fruta'])
    
    m2_prot = pick_food(foods, ['chicken', 'pollo', 'beef', 'res', 'meat', 'carne'])
    m2_carb = pick_food(foods, ['rice', 'arroz', 'pasta', 'potato', 'papa'])
    m2_veg  = pick_food(foods, ['vegetable', 'verdura', 'broccoli', 'spinach', 'espinaca', 'salad'])

    m3_snack= pick_food(foods, ['nut', 'nuez', 'almond', 'almendra', 'yogurt', 'fruit'])
    
    m4_prot = pick_food(foods, ['fish', 'pescado', 'tuna', 'atun', 'salmon', 'tilapia'])
    m4_veg  = pick_food(foods, ['vegetable', 'verdura', 'asparagus', 'esparragos', 'zucchini'])

    # Assemble Menu
    meal_plan = [
        {"name": "Desayuno", "items": [m1_prot, m1_carb]},
        {"name": "Almuerzo", "items": [m2_prot, m2_carb, m2_veg]},
        {"name": "Snack", "items": [m3_snack]},
        {"name": "Cena", "items": [m4_prot, m4_veg]}
    ]

    # Calculate Portions (Naive approach for simulation)
    # We distribute protein target evenly
    target_prot_per_main = TARGET_PROTEIN * 0.4 # 40% Lunch
    target_prot_per_dinner = TARGET_PROTEIN * 0.35 # 35% Dinner
    target_prot_breakfast = TARGET_PROTEIN * 0.25 # 25% Breakfast

    total_kcal = 0
    total_prot = 0
    
    print("\n🍽️  PLAN GENERADO (SIMULACIÓN PRELIMINAR) 🍽️")
    print("------------------------------------------------")
    
    for meal in meal_plan:
        print(f"\n🥘 **{meal['name']}**")
        for item in meal['items']:
            if not item: continue
            # Default portion 150g for main, 50g for sides
            portion = 100
            if 'meat' in item.get('category','').lower() or 'poultry' in item.get('category','').lower(): portion = 150
            if 'rice' in item.get('category','').lower(): portion = 150
            if 'vegetable' in item.get('category','').lower(): portion = 120
            
            # Simple Math
            p = item.get('protein_g_per_100g', 0) * (portion/100)
            k = item.get('kcal_per_100g', 0) * (portion/100)
            
            total_prot += p
            total_kcal += k
            
            name = item.get('name_es') or item.get('name')
            print(f"   - {name}: {portion}g  ({int(k)} kcal, {p:.1f}g prot)")
            
    print("------------------------------------------------")
    print(f"📊 TOTALES ESTIMADOS:")
    print(f"   🔥 Calorías: {int(total_kcal)} / {TARGET_KCAL}")
    print(f"   💪 Proteína: {total_prot:.1f}g / {TARGET_PROTEIN}g")
    
    if total_prot < TARGET_PROTEIN * 0.8:
        print("\n⚠️ Nota: La selección aleatoria fue baja en proteína. El algoritmo real ajustaría las cantidades exactas.")
    else:
        print("\n✅ Nota: Selección viable.")

if __name__ == "__main__":
    simulate()
