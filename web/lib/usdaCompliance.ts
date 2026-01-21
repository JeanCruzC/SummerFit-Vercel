import type { MealPlan, Meal, MacroTotals, SimpleFoodItem } from './mealGenerator';

export const USDA_DGA_LIMITS = {
    maxAddedSugarPerMeal_g: 10,
    fiberPer1000Kcal_g: 14, // AI 28 g @ 2000 kcal
    satFatMaxPercentKcal: 10,
};

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

export function getSodiumLimitByAge(ageYears?: number): number {
    if (!ageYears || ageYears >= 14) return 2300;
    if (ageYears >= 9) return 1800;
    if (ageYears >= 4) return 1500;
    return 1200;
}

export function isWholeGrain(food: SimpleFoodItem): boolean {
    const carbs = food.carbs || 0;
    const fiber = food.fiber || 0;
    if (carbs <= 0) return false;
    return fiber >= carbs / 8;
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

function gramsToServings(grams: number, group: keyof ServingCount): number {
    const base = SERVING_GRAMS[group] || 100;
    return grams / base;
}

export function countServingsByGroup(plan: MealPlan): ServingCount {
    const totals: ServingCount = { vegetables: 0, fruits: 0, dairy: 0, protein: 0, wholeGrains: 0, healthyFats: 0 };

    const addServings = (group: keyof ServingCount, grams: number) => {
        if (!grams || grams <= 0) return;
        totals[group] += gramsToServings(grams, group);
    };

    plan.meals.forEach(meal => {
        meal.items.forEach(item => {
            const f = item.food;
            const grams = item.portion_g || 0;

            switch (f.category) {
                case 'vegetable':
                    addServings('vegetables', grams);
                    break;
                case 'fruit':
                    addServings('fruits', grams);
                    break;
                case 'dairy':
                case 'beverage':
                    addServings('dairy', grams);
                    break;
                case 'protein':
                case 'legume':
                    addServings('protein', grams);
                    break;
                case 'carb':
                    if (isWholeGrain(f)) {
                        // cooked grain? use 90g cooked if serving_size hints "cup"
                        const base = f.serving_unit && f.serving_unit.toLowerCase().includes('cup') ? Math.max(90, f.serving_size || 90) : 30;
                        totals.wholeGrains += grams / base;
                    }
                    break;
                case 'fat':
                    addServings('healthyFats', grams);
                    break;
                default:
                    break;
            }
        });
    });

    return totals;
}

export type USDAValidation = { isValid: boolean; issues: string[] };

export function validateUSDAHard(plan: MealPlan, targetKcal: number, ageYears?: number): USDAValidation {
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

    // Added sugar per meal <=10g
    plan.meals.forEach(meal => {
        const addSug = meal.totals.added_sugars_g || 0;
        if (addSug > USDA_DGA_LIMITS.maxAddedSugarPerMeal_g) {
            issues.push(`${meal.type}: azúcares añadidos ${addSug.toFixed(1)}g > 10g`);
        }
    });

    // Fiber minimum scaled
    const fiberMin = (targetKcal / 1000) * USDA_DGA_LIMITS.fiberPer1000Kcal_g;
    if ((totals.fiber || 0) < fiberMin) {
        issues.push(`Fibra ${(totals.fiber || 0).toFixed(1)}g < objetivo ${fiberMin.toFixed(1)}g`);
    }

    // Servings by group
    const targets = getDailyServingTargets(targetKcal);
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
