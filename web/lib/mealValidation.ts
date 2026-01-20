// Meal Plan Validation System
import { MealPlan, WeeklyMealPlan } from './mealGenerator';

export interface PlanValidation {
    isValid: boolean;
    issues: string[];
    warnings: string[];
    metrics: {
        caloriesDeviation: number;
        proteinDeviation: number;
        varietyScore: number;
        repetitionCount: number;
    };
}

export function validateMealPlan(
    plan: MealPlan,
    targetCalories: number,
    targetProtein: number
): PlanValidation {
    const issues: string[] = [];
    const warnings: string[] = [];
    
    // 1. Validate calories (±10% acceptable)
    const calDev = ((plan.totals.kcal - targetCalories) / targetCalories) * 100;
    if (Math.abs(calDev) > 15) {
        issues.push(`Calorías fuera de rango: ${plan.totals.kcal} kcal (${calDev > 0 ? '+' : ''}${calDev.toFixed(1)}%)`);
    } else if (Math.abs(calDev) > 10) {
        warnings.push(`Calorías ligeramente desviadas: ${calDev > 0 ? '+' : ''}${calDev.toFixed(1)}%`);
    }
    
    // 2. Validate protein (±15% acceptable)
    const protDev = ((plan.totals.protein - targetProtein) / targetProtein) * 100;
    if (protDev < -20) {
        issues.push(`Proteína baja: ${Math.round(plan.totals.protein)}g (${protDev.toFixed(1)}%)`);
    } else if (protDev > 20) {
        issues.push(`Proteína alta: ${Math.round(plan.totals.protein)}g (+${protDev.toFixed(1)}%)`);
    } else if (protDev < -15) {
        warnings.push(`Proteína ligeramente baja: ${protDev.toFixed(1)}%`);
    } else if (protDev > 15) {
        warnings.push(`Proteína ligeramente alta: +${protDev.toFixed(1)}%`);
    }
    
    // 3. Validate variety (no more than 2 repetitions)
    const foodCounts: Record<string, number> = {};
    plan.meals.forEach(meal => {
        meal.items.forEach(item => {
            foodCounts[item.food.id] = (foodCounts[item.food.id] || 0) + 1;
        });
    });
    
    const repetitions = Object.entries(foodCounts).filter(([_, count]) => count > 2);
    const repetitionCount = repetitions.length;
    
    if (repetitionCount > 0) {
        warnings.push(`Alimentos repetidos más de 2 veces en el día`);
    }
    
    // 4. Calculate variety score (0-100)
    const uniqueFoods = Object.keys(foodCounts).length;
    const totalItems = plan.meals.reduce((sum, m) => sum + m.items.length, 0);
    const varietyScore = Math.min(100, (uniqueFoods / totalItems) * 100);
    
    return {
        isValid: issues.length === 0,
        issues,
        warnings,
        metrics: {
            caloriesDeviation: calDev,
            proteinDeviation: protDev,
            varietyScore,
            repetitionCount
        }
    };
}

export function validateWeeklyPlan(
    weekPlan: WeeklyMealPlan,
    targetCalories: number,
    targetProtein: number
): PlanValidation {
    const allIssues: string[] = [];
    const allWarnings: string[] = [];
    let totalVarietyScore = 0;
    let totalRepetitions = 0;
    
    weekPlan.days.forEach((day, idx) => {
        const validation = validateMealPlan(day, targetCalories, targetProtein);
        
        if (!validation.isValid) {
            allIssues.push(`Día ${idx + 1}: ${validation.issues.join(', ')}`);
        }
        
        allWarnings.push(...validation.warnings.map(w => `Día ${idx + 1}: ${w}`));
        totalVarietyScore += validation.metrics.varietyScore;
        totalRepetitions += validation.metrics.repetitionCount;
    });
    
    // Validate weekly variety
    const allFoods: Record<string, number> = {};
    weekPlan.days.forEach(day => {
        day.meals.forEach(meal => {
            meal.items.forEach(item => {
                allFoods[item.food.id] = (allFoods[item.food.id] || 0) + 1;
            });
        });
    });
    
    const weeklyUnique = Object.keys(allFoods).length;
    if (weeklyUnique < 15) {
        allWarnings.push(`Poca variedad semanal: solo ${weeklyUnique} alimentos únicos (recomendado: 20+)`);
    }
    
    return {
        isValid: allIssues.length === 0,
        issues: allIssues,
        warnings: allWarnings,
        metrics: {
            caloriesDeviation: 0,
            proteinDeviation: 0,
            varietyScore: totalVarietyScore / 7,
            repetitionCount: totalRepetitions
        }
    };
}
