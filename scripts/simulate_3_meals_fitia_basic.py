
import os
import json
import random
import asyncio
from dotenv import load_dotenv
from pathlib import Path
from supabase import create_client

# CONFIG
ENV_PATH = '/home/jcc/Descargas/SummerFit--main/SummerFit-Vercel-main/web/.env.local'
TARGET_KCAL = 1524
TARGET_PROT = 135
TARGET_CARB = 164
TARGET_FAT = 36 # Low fat is hard with natural foods, will try.

async def simulate_3_meals():
    # Load Env
    load_dotenv(Path(ENV_PATH))
    url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    supabase = create_client(url, key)

    # 1. Fetch ONLY Fitia Basics (Priority 1)
    print("🔍 Fetching 'Fitia Basic' items (Priority 1)...")
    res = supabase.table('foods').select('*').eq('priority', 1).execute()
    foods = res.data
    
    # Helper to find food
    def find(keywords, exclude=[]):
        candidates = []
        for f in foods:
            name = (f['name_es'] or f['name']).lower()
            cat = (f['category'] or '').lower()
            
            if any(k in name for k in keywords):
                if not any(e in name for e in exclude):
                    candidates.append(f)
        if not candidates: return None
        return random.choice(candidates)

    print(f"✨ Found {len(foods)} Basic items available.")
    # Debug: Print categories
    # print(set(f['category'] for f in foods))

    # 2. Define Meals (Standard Structure)
    # Meal 1: Breakfast (Eggs/Dairy + Carb)
    # Meal 2: Lunch (Lean Meat + Starch + Veg)
    # Meal 3: Dinner (Lean Meat + Veg + Fat source)

    menu = {
        "Desayuno": [],
        "Almuerzo": [],
        "Cena": []
    }

    # INGREDIENTS SELECTION
    # Desayuno
    egg = find(['huevo', 'egg'])
    oats = find(['avena', 'oat'], exclude=['milk'])
    milk = find(['leche', 'milk'])
    
    # Almuerzo
    chicken = find(['pollo', 'chicken', 'pechuga'], exclude=['fried'])
    rice = find(['arroz', 'rice'])
    veg_lunch = find(['lechuga', 'lettuce', 'tomate', 'tomato', 'pepino']) 

    # Cena
    fish = find(['pescado', 'fish', 'atun', 'tuna'])
    potato = find(['papa', 'potato', 'camote'])
    avocado = find(['palta', 'avocado', 'aguacate'])

    # Fallbacks if strict basics missing
    if not chicken: chicken = find(['carne', 'meat', 'res', 'pavo'])
    if not fish: fish = find(['pollo', 'chicken']) # Repeats ok if limited
    if not avocado: avocado = find(['aceite', 'oil', 'almendra', 'nut'])

    # 3. Calculate Portions (Solver)
    # Goal: 135g Protein. 
    # M1: 25%, M2: 40%, M3: 35%
    
    # --- DESAYUNO ---
    # Eggs + Oats
    # 3 Eggs (approx 18g prot) + 50g Oats + 200ml Milk
    m1_items = []
    if egg: m1_items.append({'food': egg, 'qty': 180}) # ~3 eggs
    if oats: m1_items.append({'food': oats, 'qty': 50})
    if milk: m1_items.append({'food': milk, 'qty': 200})
    menu["Desayuno"] = m1_items

    # --- ALMUERZO --- 
    # Chicken + Rice
    # Need ~50g protein here. Chicken has ~30g/100g. So need ~170g chicken.
    m2_items = []
    if chicken: m2_items.append({'food': chicken, 'qty': 180})
    if rice: m2_items.append({'food': rice, 'qty': 180}) # Cooked
    if veg_lunch: m2_items.append({'food': veg_lunch, 'qty': 100})
    menu["Almuerzo"] = m2_items

    # --- CENA ---
    # Fish + Potato + Avocado
    # Need ~45g protein. Fish ~20g/100g. Need ~220g fish.
    m3_items = []
    if fish: m3_items.append({'food': fish, 'qty': 220})
    if potato: m3_items.append({'food': potato, 'qty': 200})
    if avocado: m3_items.append({'food': avocado, 'qty': 60}) # Fat source
    menu["Cena"] = m3_items

    # 4. Print Report
    total_k = 0
    total_p = 0
    total_c = 0
    total_f = 0

    print("\n📋 PLAN DE 3 COMIDAS (FITIA BÁSICOS - PRIORIDAD 1)")
    print("===================================================")
    
    for meal_name, items in menu.items():
        print(f"\n🥘 {meal_name}")
        for i in items:
            f = i['food']
            g = i['qty']
            name = f['name_es'] or f['name']
            
            k = f['kcal_per_100g'] * (g/100)
            p = f['protein_g_per_100g'] * (g/100)
            c = f['carbs_g_per_100g'] * (g/100)
            fa = f['fat_g_per_100g'] * (g/100)
            
            total_k += k
            total_p += p
            total_c += c
            total_f += fa
            
            print(f"   • {g}g {name}")
            # print(f"     (P: {p:.1f}, C: {c:.1f}, F: {fa:.1f})")

    print("===================================================")
    print(f"📊 MACROS TOTALES:")
    print(f"   🔥 Calorías: {int(total_k)} / {TARGET_KCAL}")
    print(f"   💪 Proteína: {int(total_p)}g / {TARGET_PROT}g")
    print(f"   🍞 Carbos:   {int(total_c)}g / {TARGET_CARB}g")
    print(f"   🥑 Grasas:   {int(total_f)}g / {TARGET_FAT}g")
    
    # Nutrition Check
    if abs(total_p - TARGET_PROT) > 10: print("⚠️ Protein deviation > 10g")
    else: print("✅ Protein Target Hit!")

    # Check Micro source
    print("\n💎 Micronutrientes:")
    # Calculate Iron/Calcium sample
    fe = sum([i['food']['iron_mg'] * (i['qty']/100) for meal in menu.values() for i in meal])
    print(f"   Hierro Total: {fe:.1f} mg (Esencial para energía)")

if __name__ == "__main__":
    asyncio.run(simulate_3_meals())
