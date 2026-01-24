import type { MealPlan, Meal, MacroTotals, SimpleFoodItem } from './mealGenerator';

export const USDA_DGA_LIMITS = {
    maxAddedSugarPerMeal_g: 10,
    fiberPer1000Kcal_g: 14, // AI 28 g @ 2000 kcal
    satFatMaxPercentKcal: 10,
};

type DietKey =
    | 'balanced'
    | 'keto'
    | 'low_carb'
    | 'vegan'
    | 'vegetarian'
    | 'paleo'
    | 'mediterranean'
    | 'high_protein'
    | 'diabetes_friendly'
    | 'dash';

const DIET_NORMALIZATION_MAP: Record<string, DietKey> = {
    estandar: 'balanced',
    estandar_: 'balanced',
    standard: 'balanced',
    balanced: 'balanced',
    keto: 'keto',
    low_carb: 'low_carb',
    lowcarb: 'low_carb',
    lowcarb_: 'low_carb',
    vegan: 'vegan',
    vegana: 'vegan',
    vegetarian: 'vegetarian',
    vegetariana: 'vegetarian',
    paleo: 'paleo',
    mediterranea: 'mediterranean',
    mediterranean: 'mediterranean',
    alta_proteina: 'high_protein',
    alta_protein: 'high_protein',
    high_protein: 'high_protein',
    diabeticos: 'diabetes_friendly',
    diabeticos_bajo_indice_glucemico: 'diabetes_friendly',
    diabetes_friendly: 'diabetes_friendly',
    dash: 'dash',
};

export function normalizeDietType(value?: string): DietKey {
    const raw = (value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const cleaned = raw.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return DIET_NORMALIZATION_MAP[cleaned] || 'balanced';
}

const FUNCTIONAL_CATEGORY_OVERRIDES: Record<string, string> = {
    '31638': 'fat', // Palta (Avocado) -> Fat (Functional)
    '27881': 'fat', // Aceite de Oliva / Coco -> Fat
    '29934': 'fat', // Maní -> Fat
    '29952': 'fat', // Mantequilla de Maní -> Fat
    '29904': 'fat', // Almendras -> Fat
    '29946': 'fat', // Nueces -> Fat
    '29939': 'fat', // Pecanas -> Fat
    '29908': 'fat', // Cashews/Pistachos -> Fat
    '32504': 'fat', // Aceitunas -> Fat
    '30005': 'fat', // Chía/Linaza -> Fat
    '30815': 'carb', // Quinua -> Carb
    '30796': 'carb', // Avena -> Carb
};

export function getFunctionalCategory(food: SimpleFoodItem): string {
    if (!food) return '';
    const id = String(food.id);
    if (FUNCTIONAL_CATEGORY_OVERRIDES[id]) {
        return FUNCTIONAL_CATEGORY_OVERRIDES[id];
    }
    return food.category;
}

export function getUSDAComplianceMode(dietType?: string, conditions: string[] = []): 'hard' | 'soft' {
    if (conditions.includes('diabetes_type_2')) return 'hard';
    const key = normalizeDietType(dietType);
    if (key === 'keto' || key === 'low_carb' || key === 'paleo') return 'soft';
    return 'hard';
}

type ServingTarget = { min: number; max: number };
type ServingTargets = {
    vegetables: ServingTarget;
    fruits: ServingTarget;
    dairy: ServingTarget;
    protein: ServingTarget;
    wholeGrains: ServingTarget;
    healthyFats: ServingTarget;
};

const CALORIE_SERVING_TABLE: Array<{ kcal: number; targets: ServingTargets }> = [
    { kcal: 1200, targets: { vegetables: { min: 1.5, max: 3 }, fruits: { min: 1, max: 2 }, dairy: { min: 2, max: 3 }, protein: { min: 2, max: 4 }, wholeGrains: { min: 2, max: 4 }, healthyFats: { min: 3, max: 5 } } },
    { kcal: 1400, targets: { vegetables: { min: 1.5, max: 3 }, fruits: { min: 1.5, max: 2.5 }, dairy: { min: 2, max: 3 }, protein: { min: 3, max: 4 }, wholeGrains: { min: 2, max: 4 }, healthyFats: { min: 3.5, max: 5.5 } } },
    { kcal: 1600, targets: { vegetables: { min: 2, max: 3.5 }, fruits: { min: 1.5, max: 2.5 }, dairy: { min: 2.5, max: 3 }, protein: { min: 3, max: 4 }, wholeGrains: { min: 2, max: 4 }, healthyFats: { min: 4, max: 6 } } },
    { kcal: 1800, targets: { vegetables: { min: 2.5, max: 4 }, fruits: { min: 1.5, max: 2.5 }, dairy: { min: 2.5, max: 3 }, protein: { min: 3.5, max: 5 }, wholeGrains: { min: 2, max: 4 }, healthyFats: { min: 4, max: 6 } } },
    { kcal: 2000, targets: { vegetables: { min: 2.5, max: 4 }, fruits: { min: 2, max: 3 }, dairy: { min: 3, max: 3 }, protein: { min: 4, max: 6 }, wholeGrains: { min: 2, max: 4 }, healthyFats: { min: 4.5, max: 7 } } },
    { kcal: 2200, targets: { vegetables: { min: 3, max: 4 }, fruits: { min: 2, max: 3 }, dairy: { min: 3, max: 3 }, protein: { min: 5, max: 6 }, wholeGrains: { min: 2.5, max: 4.5 }, healthyFats: { min: 5, max: 7.5 } } },
    { kcal: 2400, targets: { vegetables: { min: 3, max: 5 }, fruits: { min: 2, max: 3 }, dairy: { min: 3, max: 3 }, protein: { min: 5, max: 6 }, wholeGrains: { min: 3, max: 5 }, healthyFats: { min: 5.5, max: 8 } } },
    { kcal: 2600, targets: { vegetables: { min: 3.5, max: 5 }, fruits: { min: 2, max: 3 }, dairy: { min: 3, max: 3 }, protein: { min: 5.5, max: 6.5 }, wholeGrains: { min: 3, max: 5 }, healthyFats: { min: 6, max: 9 } } },
    { kcal: 2800, targets: { vegetables: { min: 3.5, max: 5 }, fruits: { min: 2.5, max: 3.5 }, dairy: { min: 3, max: 3 }, protein: { min: 6, max: 7 }, wholeGrains: { min: 3.5, max: 5.5 }, healthyFats: { min: 6.5, max: 9.5 } } },
    { kcal: 3000, targets: { vegetables: { min: 4, max: 5 }, fruits: { min: 2.5, max: 3.5 }, dairy: { min: 3, max: 3 }, protein: { min: 6.5, max: 7.5 }, wholeGrains: { min: 3.5, max: 6 }, healthyFats: { min: 7, max: 10 } } },
    { kcal: 3200, targets: { vegetables: { min: 4, max: 5 }, fruits: { min: 2.5, max: 3.5 }, dairy: { min: 3, max: 3 }, protein: { min: 7, max: 8 }, wholeGrains: { min: 3.5, max: 6 }, healthyFats: { min: 7.5, max: 10.5 } } },
];

export function getDailyServingTargets(targetKcal: number): ServingTargets | null {
    if (!targetKcal || targetKcal <= 0) return null;
    const nearest = CALORIE_SERVING_TABLE.reduce((prev, curr) => {
        return Math.abs(curr.kcal - targetKcal) < Math.abs(prev.kcal - targetKcal) ? curr : prev;
    });
    return nearest.targets;
}

export function getDietAdjustedServingTargets(
    targetKcal: number,
    dietType?: string,
    conditions: string[] = []
): ServingTargets | null {
    const base = getDailyServingTargets(targetKcal);
    if (!base) return null;

    const targets: ServingTargets = {
        vegetables: { ...base.vegetables },
        fruits: { ...base.fruits },
        dairy: { ...base.dairy },
        protein: { ...base.protein },
        wholeGrains: { ...base.wholeGrains },
        healthyFats: { ...base.healthyFats },
    };

    const diet = normalizeDietType(dietType);
    const setRange = (key: keyof ServingTargets, min: number, max: number) => {
        const safeMin = Math.max(0, min);
        const safeMax = Math.max(safeMin, max);
        targets[key] = { min: safeMin, max: safeMax };
    };

    if (diet === 'keto') {
        setRange('wholeGrains', 0, 0);
        setRange('fruits', 0, Math.min(1, targets.fruits.max));
        targets.healthyFats.max = Math.max(targets.healthyFats.max, base.healthyFats.max * 1.5);
    } else if (diet === 'low_carb') {
        setRange('wholeGrains', 0, Math.max(1, Math.round(base.wholeGrains.max * 0.6)));
        targets.fruits.min = Math.max(0, base.fruits.min - 0.5);
        targets.fruits.max = Math.max(targets.fruits.min, base.fruits.max - 0.5);
        targets.healthyFats.max = Math.max(targets.healthyFats.max, base.healthyFats.max * 1.2);
    } else if (diet === 'paleo') {
        setRange('wholeGrains', 0, 0);
        setRange('dairy', 0, 0);
    } else if (diet === 'vegan') {
        setRange('dairy', 0, 0);
    } else if (diet === 'high_protein') {
        targets.protein.min = Math.max(targets.protein.min, base.protein.min + 0.5);
        targets.protein.max = Math.max(targets.protein.max, base.protein.max + 1);
    } else if (diet === 'mediterranean') {
        targets.healthyFats.min = Math.max(targets.healthyFats.min, base.healthyFats.min + 0.5);
        targets.healthyFats.max = Math.max(targets.healthyFats.max, base.healthyFats.max + 1);
    }

    if (diet === 'diabetes_friendly' || conditions.includes('diabetes_type_2')) {
        targets.fruits.max = Math.max(targets.fruits.min, base.fruits.max - 0.5);
    }

    return targets;
}

export function getSodiumLimitByAge(ageYears?: number): number {
    if (!ageYears || ageYears >= 14) return 2300;
    if (ageYears >= 9) return 1800;
    if (ageYears >= 4) return 1500;
    return 1200;
}

const WHOLE_GRAIN_ID_SET = new Set<string>([
    '30815', // Quinua
    '30796', // Avena
    '30829', // Arroz integral (brown rice)
    '30124', // Pan integral (whole wheat bread)
    '30240', // Tortilla integral
    '30773', // Pasta integral
]);

export function isWholeGrain(food: SimpleFoodItem): boolean {
    if (!food) return false;

    // 1. Explicit field takes priority
    if (food.is_whole_grain === true) return true;
    if (food.is_whole_grain === false) return false;

    // 2. USDA group field
    if (food.usda_group === 'whole_grain') return true;
    if (food.usda_group === 'refined_grain') return false;

    // 3. Known whole grain food IDs
    const id = String((food as any).id || '');
    if (WHOLE_GRAIN_ID_SET.has(id)) return true;

    // 4. Name pattern detection (comprehensive)
    const nameMix = `${food.name || ''} ${food.name_es || ''} ${(food as any).category || ''}`.toLowerCase();

    // Whole grain keywords (English + Spanish)
    const WHOLE_GRAIN_PATTERNS = [
        'whole wheat', 'whole grain', '100% wheat', 'multigrain',
        'integral', 'pan integral', 'arroz integral', 'trigo integral',
        'oat', 'avena', 'oatmeal', 'hojuelas de avena',
        'quinoa', 'quinua',
        'brown rice', 'arroz integral', 'wild rice', 'arroz salvaje',
        'bran', 'salvado',
        'farro', 'bulgur', 'barley', 'cebada',
        'buckwheat', 'trigo sarraceno', 'alforfón',
        'millet', 'mijo',
        'spelt', 'espelta',
        'rye', 'centeno',
        'sorghum', 'sorgo',
        'teff', 'amaranth', 'amaranto',
        'whole corn', 'maíz integral'
    ];

    if (WHOLE_GRAIN_PATTERNS.some(p => nameMix.includes(p))) return true;

    // 5. Refined grain patterns - explicitly return false
    const REFINED_PATTERNS = [
        'white bread', 'white rice', 'pan blanco', 'arroz blanco',
        'refined', 'refinado', 'bleached', 'enriched flour',
        'all-purpose flour', 'harina de trigo'
    ];
    if (REFINED_PATTERNS.some(p => nameMix.includes(p))) return false;

    // 6. Fiber ratio heuristic (only if carbs > 0)
    const carbs = food.carbs || 0;
    const fiber = food.fiber || 0;
    if (carbs > 0 && fiber >= carbs / 8) return true;

    return false;
}

export type ServingCount = {
    vegetables: number;
    fruits: number;
    dairy: number;
    protein: number;
    wholeGrains: number;
    healthyFats: number;
};

const SERVING_GRAMS: Record<keyof ServingCount, number> = {
    vegetables: 90, // 1 cup cooked (~85-90g) or 2 cups leafy
    fruits: 150,    // 1 cup raw
    dairy: 244,     // 1 cup milk; yogurt ~170g handled by serving_size if present
    protein: 85,    // 3 oz cooked meat / 1 egg ~50g but averaged
    wholeGrains: 30, // 1 slice bread or oz-eq dry; cooked grains ~90g but we use density fallback
    healthyFats: 5, // 1 tsp oil/butter
};

function estimateServingGrams(food: SimpleFoodItem, group: keyof ServingCount): number {
    if (food.serving_equiv_grams && food.serving_equiv_grams > 0) {
        return food.serving_equiv_grams;
    }
    const unit = (food.serving_unit || '').toLowerCase();
    if (group === 'wholeGrains') {
        if (unit.includes('cup')) return 90;
        if (unit.includes('slice') || unit.includes('tortilla')) return 30;
        if (unit.includes('oz')) return 28;
        return 60;
    }
    if (group === 'dairy') {
        if (unit.includes('cup')) return 244;
        if (unit.includes('container')) return food.serving_size || 170;
    }
    if (group === 'vegetables') {
        if (unit.includes('cup')) return 90;
    }
    if (group === 'fruits') {
        if (unit.includes('cup')) return 150;
    }
    return SERVING_GRAMS[group] || 100;
}

function gramsToServings(grams: number, group: keyof ServingCount, food: SimpleFoodItem): number {
    const base = estimateServingGrams(food, group);
    return grams / base;
}

export function countServingsByGroup(plan: MealPlan): ServingCount {
    const totals: ServingCount = { vegetables: 0, fruits: 0, dairy: 0, protein: 0, wholeGrains: 0, healthyFats: 0 };

    const addServings = (group: keyof ServingCount, grams: number, food: SimpleFoodItem) => {
        if (!grams || grams <= 0) return;
        totals[group] += gramsToServings(grams, group, food);
    };

    plan.meals.forEach(meal => {
        meal.items.forEach(item => {
            const f = item.food;
            const grams = item.portion_g || 0;

            switch (f.category) {
                case 'vegetable':
                    totals.vegetables += gramsToServings(grams, 'vegetables', f);
                    break;
                case 'fruit':
                    totals.fruits += gramsToServings(grams, 'fruits', f);
                    break;
                case 'dairy':
                case 'beverage':
                    totals.dairy += gramsToServings(grams, 'dairy', f);
                    break;
                case 'protein':
                case 'legume':
                    totals.protein += gramsToServings(grams, 'protein', f);
                    break;
                case 'carb':
                    if (isWholeGrain(f)) {
                        totals.wholeGrains += gramsToServings(grams, 'wholeGrains', f);
                    }
                    break;
                case 'fat': {
                    const fatGrams = item.macros?.fat ?? ((f.fat || 0) * grams / 100);
                    if (fatGrams > 0) {
                        totals.healthyFats += fatGrams / 5; // 1 serving ≈ 1 tsp oil = 5g fat
                    } else {
                        totals.healthyFats += gramsToServings(grams, 'healthyFats', f);
                    }
                    break;
                }
                default:
                    break;
            }
        });
    });

    return totals;
}

export type USDAValidation = { isValid: boolean; issues: string[] };

export function validateUSDAHard(
    plan: MealPlan,
    targetKcal: number,
    ageYears?: number,
    dietType?: string,
    conditions: string[] = []
): USDAValidation {
    const issues: string[] = [];
    const totals = plan.totals;

    // Saturated fat <10% kcal
    const satFatKcal = (totals.sat_fat_g || 0) * 9;
    const satPct = totals.kcal > 0 ? (satFatKcal / totals.kcal) * 100 : 0;
    if (satPct > USDA_DGA_LIMITS.satFatMaxPercentKcal) {
        issues.push(`Grasa saturada ${satPct.toFixed(1)}% > ${USDA_DGA_LIMITS.satFatMaxPercentKcal}%`);
    }

    // Sodium by age
    const sodiumLimit = getSodiumLimitByAge(ageYears);
    if ((totals.sodium_mg || 0) > sodiumLimit) {
        issues.push(`Sodio ${Math.round(totals.sodium_mg || 0)}mg > ${sodiumLimit}mg`);
    }

    // Added sugar per meal <=10g (snacks stricter)
    plan.meals.forEach(meal => {
        const addSug = meal.totals.added_sugars_g || 0;
        const maxAllowed = meal.type === 'snack'
            ? Math.min(USDA_DGA_LIMITS.maxAddedSugarPerMeal_g, 5)
            : USDA_DGA_LIMITS.maxAddedSugarPerMeal_g;
        if (addSug > maxAllowed) {
            issues.push(`${meal.type}: azúcares añadidos ${addSug.toFixed(1)}g > ${maxAllowed}g`);
        }
    });

    // Fiber minimum scaled
    const fiberMin = (targetKcal / 1000) * USDA_DGA_LIMITS.fiberPer1000Kcal_g;
    if ((totals.fiber || 0) < fiberMin) {
        issues.push(`Fibra ${(totals.fiber || 0).toFixed(1)}g < objetivo ${fiberMin.toFixed(1)}g`);
    }

    // Servings by group
    const targets = getDietAdjustedServingTargets(targetKcal, dietType, conditions);
    if (targets) {
        const s = countServingsByGroup(plan);
        const check = (key: keyof ServingTargets, val: number) => {
            const t = targets[key];
            if (!t) return;
            if (val < t.min) issues.push(`${key} ${val.toFixed(2)} < min ${t.min}`);
            if (val > t.max) issues.push(`${key} ${val.toFixed(2)} > max ${t.max}`);
        };
        check('vegetables', s.vegetables);
        check('fruits', s.fruits);
        check('dairy', s.dairy);
        check('protein', s.protein);
        check('wholeGrains', s.wholeGrains);
        check('healthyFats', s.healthyFats);
    }

    return { isValid: issues.length === 0, issues };
}

export function computeMealBudgets(targetKcal: number, ageYears?: number, share: number = 0.33) {
    const sodiumLimit = getSodiumLimitByAge(ageYears);
    const fatKcalMax = targetKcal * (USDA_DGA_LIMITS.satFatMaxPercentKcal / 100);
    const satFatMax_g = fatKcalMax / 9;
    return {
        maxAddedSugar_g: USDA_DGA_LIMITS.maxAddedSugarPerMeal_g,
        maxSodium_mg: sodiumLimit * share,
        maxSatFat_g: satFatMax_g * share,
    };
}
