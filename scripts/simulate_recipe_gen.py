
import json
import random

# CONFIG
JSON_PATH = '/home/jcc/Descargas/SummerFit--main/SummerFit-Vercel-main/USDA/fitia_plus_fndds_AyB_single_base.json'

def load_foods():
    with open(JSON_PATH) as f:
        data = json.load(f)
    print(f"📚 Loaded {len(data)} items from Fitia Base.")
    return data

def pick_clean_ingredient(foods, keywords, exclude=[]):
    candidates = []
    bad_words = ['fried', 'pizza', 'burger', 'fast food', 'mixed', 'salad', 'dressing', 'spread', 'cake', 'cookie', 'pie', 'nfs', 'souffle', 'loaf', 'stew', 'casserole', 'creamed', 'dip', 'gravy', 'beaver', 'game', 'turtle', 'squirrel', 'frog', 'bear', 'muffin', 'bread', 'biscuit', 'scone', 'chips', 'salsa', 'sauce', 'soup']
    
    for f in foods:
        name = (f.get('name') or '').lower()
        name_es = (f.get('name_es') or '').lower()
        cat = f.get('category', '').lower()
        
        # Must match keywords carefully (check word boundaries roughly)
        # e.g. "oat" matches "oatmeal" but NOT "goat"
        # Since we use simple string matching, let's just explicit exclude 'goat' if searching for 'oat'
        if 'oat' in keywords and 'goat' in name: continue

        matches_keyword = False
        for k in keywords:
            if k in name or k in name_es or k in cat:
                matches_keyword = True
                break
        
        if not matches_keyword: continue
            
        # Must NOT be excluded
        if any(e in name for e in exclude) or any(e in name_es for e in exclude):
            continue

        # Must NOT have bad words
        if any(b in name for b in bad_words) or any(b in name_es for b in bad_words):
            continue
            
        candidates.append(f)
        
    if not candidates: return None
    # Sort by name length to prefer simple items
    candidates.sort(key=lambda x: len(x.get('name_es') or x.get('name')))
    return random.choice(candidates[:10]) # Pick from top 10 shortest

def generate_recipe():
    foods = load_foods()
    
    print("\n🍱 GENERANDO RECETA 'FITIA STYLE'...")
    
    # Recipe Template: "Healthy Bowl"
    # 1 Protein source
    # 1 Carb source
    # 1 Fat source
    # 2 Veggies
    
    protein = pick_clean_ingredient(foods, ['chicken', 'pollo', 'breast', 'pechuga', 'steak', 'bistec', 'fish', 'pescado', 'salmon', 'tuna', 'atun'])
    carb    = pick_clean_ingredient(foods, ['rice', 'arroz', 'potato', 'papa', 'sweet potato', 'camote', 'quinoa', 'quinua', 'oat', 'avena'])
    fat     = pick_clean_ingredient(foods, ['avocado', 'palta', 'oil', 'aceite', 'nut', 'nuez', 'almond', 'almendra'])
    veg1    = pick_clean_ingredient(foods, ['broccoli', 'brocoli', 'spinach', 'espinaca', 'carrot', 'zanahoria', 'zucchini', 'calabacita'])
    veg2    = pick_clean_ingredient(foods, ['onion', 'cebolla', 'tomat', 'tomato', 'pepper', 'pimiento', 'mushroom', 'hongo'], exclude=[veg1.get('name')]) if veg1 else None

    # Calculate portions for a ~500kcal meal with ~35g Protein
    
    # Protein Source (Target 30g protein)
    p_content = protein.get('protein_g_per_100g', 20)
    prot_g = 150 # Default 150g raw
    if p_content > 0: prot_g = (30 / p_content) * 100
    
    # Carb Source (Target 40g carbs)
    c_content = carb.get('carbs_g_per_100g', 25)
    carb_g = 150 # Default
    if c_content > 0: carb_g = (40 / c_content) * 100
    
    # Fat Source (Target 15g fat)
    f_content = fat.get('fat_g_per_100g', 15)
    fat_g = 30 # Default
    if f_content > 0: fat_g = (15 / f_content) * 100

    # Veggies (Fixed volume)
    veg_g = 100

    # Calculate Totals
    ingredients = [
        (protein, prot_g),
        (carb, carb_g),
        (fat, fat_g),
        (veg1, veg_g),
        (veg2, veg_g)
    ]
    
    total_k = 0
    total_p = 0
    total_c = 0
    total_f = 0
    
    print(f"\n📝 RECETA: Bowl Balanceado con {protein.get('name_es') or protein.get('name')}")
    print("--------------------------------------------------")
    
    for item, grams in ingredients:
        if not item: continue
        name = item.get('name_es') or item.get('name')
        kcal = item.get('kcal_per_100g', 0) * (grams/100)
        prot = item.get('protein_g_per_100g', 0) * (grams/100)
        carb = item.get('carbs_g_per_100g', 0) * (grams/100)
        fat = item.get('fat_g_per_100g', 0) * (grams/100)
        
        total_k += kcal
        total_p += prot
        total_c += carb
        total_f += fat
        
        print(f"🔸 {int(grams)}g  {name}")
        # print(f"     (Kcal: {int(kcal)}, P: {int(prot)}, C: {int(carb)}, F: {int(fat)})")

    print("--------------------------------------------------")
    print(f"📊 MACROS TOTALES:")
    print(f"   🔥 Calorías: {int(total_k)} kcal")
    print(f"   💪 Proteína: {int(total_p)}g")
    print(f"   🍞 Carbos:   {int(total_c)}g")
    print(f"   🥑 Grasas:   {int(total_f)}g")
    
    # Micros Highlight
    fe = protein.get('iron_mg', 0) * (prot_g/100) + veg1.get('iron_mg', 0)
    print(f"   ✨ Hierro: {fe:.1f} mg (Gracias a los datos FNDDS)")

if __name__ == "__main__":
    generate_recipe()
