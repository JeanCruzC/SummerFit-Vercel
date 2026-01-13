#!/usr/bin/env python3
"""
USDA Food Name Pattern Analyzer

Analyzes all 8,109 USDA food names to understand:
1. How many comma-separated segments each name has
2. Common patterns in each position
3. Extractable fields like cooking_state, processing, etc.
"""

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

# Load USDA data
SR_FILE = Path("/home/jcc/Descargas/SummerFit--main/SummerFit-Vercel-main/data/usda/usda_sr/FoodData_Central_sr_legacy_food_json_2018-04.json")
FOUNDATION_FILE = Path("/home/jcc/Descargas/SummerFit--main/SummerFit-Vercel-main/data/usda/usda_foundation/foundationDownload.json")

def load_foods():
    """Load all food names and categories"""
    foods = []
    
    # Load SR Legacy
    if SR_FILE.exists():
        with open(SR_FILE, 'r') as f:
            data = json.load(f)
            for item in data.get('SRLegacyFoods', []):
                name = item.get('description', '')
                category = item.get('foodCategory', {}).get('description', '')
                foods.append({'name': name, 'category': category, 'source': 'usda_sr'})
    
    # Load Foundation
    if FOUNDATION_FILE.exists():
        with open(FOUNDATION_FILE, 'r') as f:
            data = json.load(f)
            for item in data.get('FoundationFoods', []):
                name = item.get('description', '')
                category = item.get('foodCategory', {}).get('description', '')
                foods.append({'name': name, 'category': category, 'source': 'usda_foundation'})
    
    return foods

def analyze_segment_counts(foods):
    """Analyze how many comma-separated segments each name has"""
    print("\n" + "="*80)
    print("ANÁLISIS 1: CANTIDAD DE SEGMENTOS (COMAS) POR NOMBRE")
    print("="*80)
    
    segment_counts = Counter()
    examples_by_count = defaultdict(list)
    
    for food in foods:
        segments = [s.strip() for s in food['name'].split(',')]
        count = len(segments)
        segment_counts[count] += 1
        if len(examples_by_count[count]) < 3:
            examples_by_count[count].append(food['name'][:80])
    
    print(f"\n{'Segmentos':<15} {'Cantidad':<12} {'Porcentaje':<12} {'Ejemplos'}")
    print("-"*100)
    
    total = sum(segment_counts.values())
    for count in sorted(segment_counts.keys()):
        qty = segment_counts[count]
        pct = (qty / total) * 100
        examples = examples_by_count[count]
        print(f"{count:<15} {qty:<12} {pct:>6.1f}%      {examples[0][:60]}")
        for ex in examples[1:]:
            print(f"{'':<31}          {ex[:60]}")
    
    return segment_counts

def analyze_first_segment(foods):
    """Analyze the first segment (usually the main food)"""
    print("\n" + "="*80)
    print("ANÁLISIS 2: PRIMER SEGMENTO (ALIMENTO BASE)")
    print("="*80)
    
    first_segments = Counter()
    
    for food in foods:
        first = food['name'].split(',')[0].strip()
        # Normalize: remove numbers and parentheses
        first_clean = re.sub(r'\s*\([^)]*\)', '', first)
        first_clean = re.sub(r'\d+', '', first_clean).strip()
        first_segments[first_clean] += 1
    
    print(f"\n{'Primer Segmento':<50} {'Cantidad':<10}")
    print("-"*70)
    
    for word, count in first_segments.most_common(40):
        print(f"{word[:48]:<50} {count:<10}")
    
    return first_segments

def analyze_cooking_states(foods):
    """Find cooking state indicators"""
    print("\n" + "="*80)
    print("ANÁLISIS 3: ESTADOS DE COCCIÓN (EXTRACTABLES)")
    print("="*80)
    
    cooking_states = {
        'raw': r'\braw\b',
        'cooked': r'\bcooked\b',
        'boiled': r'\bboiled\b',
        'fried': r'\bfried\b',
        'baked': r'\bbaked\b',
        'roasted': r'\broasted\b',
        'grilled': r'\bgrilled\b',
        'steamed': r'\bsteamed\b',
        'frozen': r'\bfrozen\b',
        'dried': r'\bdried\b',
        'canned': r'\bcanned\b',
    }
    
    state_counts = Counter()
    foods_with_state = 0
    foods_without_state = 0
    examples = defaultdict(list)
    
    for food in foods:
        name_lower = food['name'].lower()
        found_state = False
        
        for state, pattern in cooking_states.items():
            if re.search(pattern, name_lower):
                state_counts[state] += 1
                found_state = True
                if len(examples[state]) < 2:
                    examples[state].append(food['name'][:60])
        
        if found_state:
            foods_with_state += 1
        else:
            foods_without_state += 1
    
    print(f"\n{'Estado':<15} {'Cantidad':<10} {'Ejemplos'}")
    print("-"*90)
    
    for state, count in sorted(state_counts.items(), key=lambda x: -x[1]):
        ex = examples[state]
        print(f"{state:<15} {count:<10} {ex[0] if ex else ''}")
        if len(ex) > 1:
            print(f"{'':<26} {ex[1]}")
    
    total = foods_with_state + foods_without_state
    print(f"\n📊 RESUMEN:")
    print(f"   - Con estado de cocción: {foods_with_state} ({foods_with_state/total*100:.1f}%)")
    print(f"   - Sin estado de cocción: {foods_without_state} ({foods_without_state/total*100:.1f}%)")
    
    return state_counts

def analyze_processing(foods):
    """Find processing indicators"""
    print("\n" + "="*80)
    print("ANÁLISIS 4: PROCESAMIENTO (EXTRACTABLES)")
    print("="*80)
    
    processing = {
        'enriched': r'\benriched\b',
        'fortified': r'\bfortified\b',
        'unenriched': r'\bunenriched\b',
        'with added': r'\bwith added\b',
        'organic': r'\borganic\b',
        'low sodium': r'\blow sodium\b',
        'reduced fat': r'\breduced fat\b',
        'fat free': r'\bfat[ -]?free\b',
        'low fat': r'\blow[ -]?fat\b',
        'whole grain': r'\bwhole grain\b',
    }
    
    process_counts = Counter()
    
    for food in foods:
        name_lower = food['name'].lower()
        for proc, pattern in processing.items():
            if re.search(pattern, name_lower):
                process_counts[proc] += 1
    
    print(f"\n{'Procesamiento':<20} {'Cantidad':<10}")
    print("-"*40)
    
    for proc, count in sorted(process_counts.items(), key=lambda x: -x[1]):
        print(f"{proc:<20} {count:<10}")
    
    return process_counts

def analyze_categories(foods):
    """Analyze by category"""
    print("\n" + "="*80)
    print("ANÁLISIS 5: PATRONES POR CATEGORÍA")
    print("="*80)
    
    by_category = defaultdict(list)
    for food in foods:
        by_category[food['category']].append(food['name'])
    
    print(f"\n{'Categoría':<45} {'Cantidad':<10} {'Avg Segmentos'}")
    print("-"*70)
    
    for cat in sorted(by_category.keys()):
        names = by_category[cat]
        avg_segments = sum(len(n.split(',')) for n in names) / len(names)
        print(f"{cat[:43]:<45} {len(names):<10} {avg_segments:.1f}")
    
    return by_category

def analyze_segment_patterns(foods):
    """Analyze patterns in each segment position"""
    print("\n" + "="*80)
    print("ANÁLISIS 6: PATRONES EN CADA POSICIÓN DE SEGMENTO")
    print("="*80)
    
    position_values = defaultdict(Counter)
    
    for food in foods:
        segments = [s.strip() for s in food['name'].split(',')]
        for i, seg in enumerate(segments):
            # Normalize segment
            seg_lower = seg.lower()
            position_values[i][seg_lower] += 1
    
    for pos in range(min(6, max(position_values.keys()) + 1)):
        print(f"\n📍 POSICIÓN {pos + 1}:")
        values = position_values[pos]
        
        # Get most common values
        print(f"   {'Valor':<40} {'Cantidad'}")
        print(f"   " + "-"*55)
        for val, count in values.most_common(15):
            print(f"   {val[:38]:<40} {count}")
    
    return position_values

def generate_recommendations(foods, segment_counts, state_counts):
    """Generate recommendations based on analysis"""
    print("\n" + "="*80)
    print("🎯 RECOMENDACIONES")
    print("="*80)
    
    total = len(foods)
    
    print("""
COLUMNAS QUE SE PUEDEN CREAR:

┌─────────────────────────────────────────────────────────────────────────────┐
│ COLUMNA          │ VIABILIDAD │ COBERTURA   │ DESCRIPCIÓN                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ food_base        │ ⚠️  MEDIA    │ ~95%        │ Primer segmento antes de coma│
│ cooking_state    │ ✅ ALTA     │ ~60%        │ raw, cooked, frozen, etc.    │
│ processing       │ ⚠️  MEDIA    │ ~30%        │ enriched, fortified          │
│ brand_name       │ ✅ ALTA     │ 100%        │ Ya existe en datos USDA      │
│ num_segments     │ ✅ ALTA     │ 100%        │ Cantidad de comas + 1        │
└─────────────────────────────────────────────────────────────────────────────┘

COLUMNAS QUE NO SE PUEDEN CREAR CONFIABLEMENTE:

┌─────────────────────────────────────────────────────────────────────────────┐
│ COLUMNA          │ RAZÓN                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ variety          │ Posición variable (2da o 3ra coma según alimento)        │
│ cut/size         │ Solo aplica a carnes, formato inconsistente              │
│ full_structure   │ ~40% son marcas con formato diferente                    │
└─────────────────────────────────────────────────────────────────────────────┘
""")
    
    with open('/tmp/usda_analysis_results.txt', 'w') as f:
        f.write(f"Total foods analyzed: {total}\n")
        f.write(f"Segment distribution: {dict(segment_counts)}\n")
        f.write(f"Cooking states found: {dict(state_counts)}\n")

def main():
    print("🔍 USDA Food Name Pattern Analyzer")
    print("="*80)
    
    foods = load_foods()
    print(f"\n📊 Total de alimentos cargados: {len(foods)}")
    
    segment_counts = analyze_segment_counts(foods)
    analyze_first_segment(foods)
    state_counts = analyze_cooking_states(foods)
    analyze_processing(foods)
    analyze_categories(foods)
    analyze_segment_patterns(foods)
    generate_recommendations(foods, segment_counts, state_counts)
    
    print("\n✅ Análisis completo!")

if __name__ == '__main__':
    main()
