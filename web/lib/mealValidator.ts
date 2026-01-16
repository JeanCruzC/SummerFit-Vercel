// ============================================================================
// MEAL VALIDATION SYSTEM
// Production-Grade Validation with USDA DGA 2025-2030 Standards
// ============================================================================

import { Meal, MealPlan, MacroTotals, WeeklyMealPlan } from './mealGenerator';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  category: 'calories' | 'protein' | 'carbs' | 'fat' | 'balance' | 'variety' | 'portion';
  message: string;
  actual?: number;
  expected?: number;
  deviation?: number;
}

export interface MealValidationResult {
  isValid: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  metrics: {
    calorieDeviation: number;
    proteinDeviation: number;
    carbDeviation: number;
    fatDeviation: number;
    macroBalance: {
      proteinPct: number;
      carbPct: number;
      fatPct: number;
    };
  };
}

export interface DayValidationResult {
  isValid: boolean;
  score: number;
  issues: ValidationIssue[];
  mealResults: Map<string, MealValidationResult>;
  dailyMetrics: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    calorieDeviation: number;
    proteinDeviation: number;
  };
}

export interface WeekValidationResult {
  isValid: boolean;
  score: number;
  issues: ValidationIssue[];
  dayResults: Map<string, DayValidationResult>;
  weeklyMetrics: {
    avgCalories: number;
    avgProtein: number;
    varietyScore: number;
    consistencyScore: number;
  };
}

// ============================================================================
// VALIDATION THRESHOLDS (USDA DGA 2025-2030)
// ============================================================================

const CALORIE_TOLERANCE = {
  ACCEPTABLE: 0.10,  // ±10% is acceptable
  WARNING: 0.15,     // ±15% triggers warning
  ERROR: 0.25        // ±25% is error
} as const;

const PROTEIN_TOLERANCE = {
  ACCEPTABLE: 0.15,  // ±15% is acceptable
  WARNING: 0.20,     // ±20% triggers warning
  ERROR: 0.30        // ±30% is error
} as const;

const MACRO_BALANCE_RANGES = {
  protein: { min: 10, max: 35, ideal: { min: 15, max: 30 } },
  carbs: { min: 45, max: 65, ideal: { min: 50, max: 60 } },
  fat: { min: 20, max: 35, ideal: { min: 25, max: 30 } }
} as const;

const PORTION_LIMITS = {
  MIN_MEAL_CALORIES: 200,
  MAX_MEAL_CALORIES: 1200,
  MIN_PROTEIN_PER_MEAL: 15,
  MAX_PROTEIN_PER_MEAL: 60,
  MIN_ITEMS_PER_MEAL: 2,
  MAX_ITEMS_PER_MEAL: 6
} as const;

const VARIETY_THRESHOLDS = {
  MIN_UNIQUE_PROTEINS_WEEK: 5,
  MIN_UNIQUE_CARBS_WEEK: 5,
  MIN_UNIQUE_VEGETABLES_WEEK: 7,
  MAX_REPETITIONS_WEEK: 3
} as const;

// ============================================================================
// 1. SINGLE MEAL VALIDATION
// ============================================================================

/**
 * Validates a single meal against nutritional targets
 * 
 * @param meal - Meal to validate
 * @param targets - Expected nutritional targets
 * @returns Detailed validation result with score and issues
 */
export function validateMeal(
  meal: Meal,
  targets: {
    minCalories: number;
    maxCalories: number;
    minProtein: number;
    maxProtein?: number;
    dietType?: string;
  }
): MealValidationResult {
  const issues: ValidationIssue[] = [];
  let score = 100;

  // ========================================
  // INPUT VALIDATION
  // ========================================

  if (!meal) {
    return {
      isValid: false,
      score: 0,
      issues: [{ severity: 'error', category: 'calories', message: 'Meal object is null' }],
      metrics: {
        calorieDeviation: 0,
        proteinDeviation: 0,
        carbDeviation: 0,
        fatDeviation: 0,
        macroBalance: { proteinPct: 0, carbPct: 0, fatPct: 0 }
      }
    };
  }

  if (!meal.totals || !meal.items || !Array.isArray(meal.items)) {
    issues.push({
      severity: 'error',
      category: 'calories',
      message: 'Meal structure is invalid'
    });
    score = 0;
  }

  const totals = meal.totals;

  // ========================================
  // CALORIE VALIDATION
  // ========================================

  const targetCalories = (targets.minCalories + targets.maxCalories) / 2;
  const calorieDeviation = Math.abs(totals.kcal - targetCalories) / targetCalories;

  if (totals.kcal < targets.minCalories) {
    const deficit = targets.minCalories - totals.kcal;
    const severity = calorieDeviation > CALORIE_TOLERANCE.ERROR ? 'error' : 
                     calorieDeviation > CALORIE_TOLERANCE.WARNING ? 'warning' : 'info';
    
    issues.push({
      severity,
      category: 'calories',
      message: `Calorías insuficientes: ${totals.kcal} kcal (objetivo: ${targets.minCalories}-${targets.maxCalories})`,
      actual: totals.kcal,
      expected: targetCalories,
      deviation: -deficit
    });

    score -= calorieDeviation > CALORIE_TOLERANCE.ERROR ? 30 : 
             calorieDeviation > CALORIE_TOLERANCE.WARNING ? 15 : 5;
  } else if (totals.kcal > targets.maxCalories) {
    const excess = totals.kcal - targets.maxCalories;
    const severity = calorieDeviation > CALORIE_TOLERANCE.ERROR ? 'error' : 
                     calorieDeviation > CALORIE_TOLERANCE.WARNING ? 'warning' : 'info';
    
    issues.push({
      severity,
      category: 'calories',
      message: `Calorías excesivas: ${totals.kcal} kcal (objetivo: ${targets.minCalories}-${targets.maxCalories})`,
      actual: totals.kcal,
      expected: targetCalories,
      deviation: excess
    });

    score -= calorieDeviation > CALORIE_TOLERANCE.ERROR ? 30 : 
             calorieDeviation > CALORIE_TOLERANCE.WARNING ? 15 : 5;
  }

  // ========================================
  // PROTEIN VALIDATION
  // ========================================

  const proteinDeviation = Math.abs(totals.protein - targets.minProtein) / targets.minProtein;

  if (totals.protein < targets.minProtein) {
    const deficit = targets.minProtein - totals.protein;
    const severity = proteinDeviation > PROTEIN_TOLERANCE.ERROR ? 'error' : 
                     proteinDeviation > PROTEIN_TOLERANCE.WARNING ? 'warning' : 'info';
    
    issues.push({
      severity,
      category: 'protein',
      message: `Proteína insuficiente: ${totals.protein}g (mínimo: ${targets.minProtein}g)`,
      actual: totals.protein,
      expected: targets.minProtein,
      deviation: -deficit
    });

    score -= proteinDeviation > PROTEIN_TOLERANCE.ERROR ? 25 : 
             proteinDeviation > PROTEIN_TOLERANCE.WARNING ? 12 : 5;
  } else if (targets.maxProtein && totals.protein > targets.maxProtein) {
    const excess = totals.protein - targets.maxProtein;
    
    issues.push({
      severity: 'warning',
      category: 'protein',
      message: `Proteína excesiva: ${totals.protein}g (máximo: ${targets.maxProtein}g)`,
      actual: totals.protein,
      expected: targets.maxProtein,
      deviation: excess
    });

    score -= 10;
  }

  // ========================================
  // MACRO BALANCE VALIDATION
  // ========================================

  const totalCals = totals.kcal || 1; // Avoid division by zero
  const proteinPct = (totals.protein * 4 / totalCals) * 100;
  const carbPct = (totals.carbs * 4 / totalCals) * 100;
  const fatPct = (totals.fat * 9 / totalCals) * 100;

  // Protein balance
  if (proteinPct < MACRO_BALANCE_RANGES.protein.min) {
    issues.push({
      severity: 'warning',
      category: 'balance',
      message: `Proteína muy baja: ${proteinPct.toFixed(1)}% (mínimo: ${MACRO_BALANCE_RANGES.protein.min}%)`,
      actual: proteinPct,
      expected: MACRO_BALANCE_RANGES.protein.ideal.min
    });
    score -= 10;
  } else if (proteinPct > MACRO_BALANCE_RANGES.protein.max) {
    issues.push({
      severity: 'warning',
      category: 'balance',
      message: `Proteína muy alta: ${proteinPct.toFixed(1)}% (máximo: ${MACRO_BALANCE_RANGES.protein.max}%)`,
      actual: proteinPct,
      expected: MACRO_BALANCE_RANGES.protein.ideal.max
    });
    score -= 10;
  }

  // Carb balance (skip for keto)
  if (targets.dietType !== 'keto') {
    if (carbPct < MACRO_BALANCE_RANGES.carbs.min) {
      issues.push({
        severity: 'info',
        category: 'balance',
        message: `Carbohidratos bajos: ${carbPct.toFixed(1)}% (mínimo: ${MACRO_BALANCE_RANGES.carbs.min}%)`,
        actual: carbPct,
        expected: MACRO_BALANCE_RANGES.carbs.ideal.min
      });
      score -= 5;
    } else if (carbPct > MACRO_BALANCE_RANGES.carbs.max) {
      issues.push({
        severity: 'warning',
        category: 'balance',
        message: `Carbohidratos altos: ${carbPct.toFixed(1)}% (máximo: ${MACRO_BALANCE_RANGES.carbs.max}%)`,
        actual: carbPct,
        expected: MACRO_BALANCE_RANGES.carbs.ideal.max
      });
      score -= 8;
    }
  }

  // Fat balance
  if (fatPct < MACRO_BALANCE_RANGES.fat.min) {
    issues.push({
      severity: 'warning',
      category: 'balance',
      message: `Grasa muy baja: ${fatPct.toFixed(1)}% (mínimo: ${MACRO_BALANCE_RANGES.fat.min}%)`,
      actual: fatPct,
      expected: MACRO_BALANCE_RANGES.fat.ideal.min
    });
    score -= 10;
  } else if (fatPct > MACRO_BALANCE_RANGES.fat.max && targets.dietType !== 'keto') {
    issues.push({
      severity: 'warning',
      category: 'balance',
      message: `Grasa muy alta: ${fatPct.toFixed(1)}% (máximo: ${MACRO_BALANCE_RANGES.fat.max}%)`,
      actual: fatPct,
      expected: MACRO_BALANCE_RANGES.fat.ideal.max
    });
    score -= 10;
  }

  // ========================================
  // PORTION VALIDATION
  // ========================================

  if (meal.items.length < PORTION_LIMITS.MIN_ITEMS_PER_MEAL) {
    issues.push({
      severity: 'warning',
      category: 'portion',
      message: `Muy pocos alimentos: ${meal.items.length} (mínimo: ${PORTION_LIMITS.MIN_ITEMS_PER_MEAL})`,
      actual: meal.items.length,
      expected: PORTION_LIMITS.MIN_ITEMS_PER_MEAL
    });
    score -= 10;
  } else if (meal.items.length > PORTION_LIMITS.MAX_ITEMS_PER_MEAL) {
    issues.push({
      severity: 'info',
      category: 'portion',
      message: `Muchos alimentos: ${meal.items.length} (máximo recomendado: ${PORTION_LIMITS.MAX_ITEMS_PER_MEAL})`,
      actual: meal.items.length,
      expected: PORTION_LIMITS.MAX_ITEMS_PER_MEAL
    });
    score -= 5;
  }

  // Check for absurd portions
  meal.items.forEach(item => {
    if (item.portion_g > 500) {
      issues.push({
        severity: 'error',
        category: 'portion',
        message: `Porción absurda: ${item.food.name_es} ${item.portion_g}g (máximo: 500g)`,
        actual: item.portion_g,
        expected: 500
      });
      score -= 20;
    } else if (item.portion_g < 20) {
      issues.push({
        severity: 'warning',
        category: 'portion',
        message: `Porción muy pequeña: ${item.food.name_es} ${item.portion_g}g (mínimo: 20g)`,
        actual: item.portion_g,
        expected: 20
      });
      score -= 5;
    }
  });

  // ========================================
  // FINAL SCORE CALCULATION
  // ========================================

  score = Math.max(0, Math.min(100, score));
  const isValid = score >= 60 && issues.filter(i => i.severity === 'error').length === 0;

  return {
    isValid,
    score,
    issues,
    metrics: {
      calorieDeviation,
      proteinDeviation,
      carbDeviation: 0, // Can be calculated if needed
      fatDeviation: 0,  // Can be calculated if needed
      macroBalance: {
        proteinPct,
        carbPct,
        fatPct
      }
    }
  };
}

// ============================================================================
// 2. DAILY PLAN VALIDATION
// ============================================================================

/**
 * Validates a full day meal plan
 * 
 * @param plan - Daily meal plan to validate
 * @param targets - Daily nutritional targets
 * @returns Comprehensive day validation result
 */
export function validateDayPlan(
  plan: MealPlan,
  targets: {
    dailyCalories: number;
    dailyProtein: number;
    dietType?: string;
  }
): DayValidationResult {
  const issues: ValidationIssue[] = [];
  const mealResults = new Map<string, MealValidationResult>();
  let totalScore = 0;

  // ========================================
  // INPUT VALIDATION
  // ========================================

  if (!plan || !plan.meals || !Array.isArray(plan.meals)) {
    return {
      isValid: false,
      score: 0,
      issues: [{ severity: 'error', category: 'calories', message: 'Plan structure is invalid' }],
      mealResults,
      dailyMetrics: {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        calorieDeviation: 0,
        proteinDeviation: 0
      }
    };
  }

  // ========================================
  // VALIDATE EACH MEAL
  // ========================================

  const mealCalorieTargets: Record<string, number> = {
    breakfast: 0.25,
    lunch: 0.35,
    dinner: 0.30,
    snack: 0.10
  };

  plan.meals.forEach(meal => {
    const mealTarget = mealCalorieTargets[meal.type] || 0.25;
    const targetCals = targets.dailyCalories * mealTarget;
    const targetProtein = targets.dailyProtein * mealTarget;

    const result = validateMeal(meal, {
      minCalories: targetCals * 0.85,
      maxCalories: targetCals * 1.15,
      minProtein: targetProtein * 0.85,
      maxProtein: targetProtein * 1.15,
      dietType: targets.dietType
    });

    mealResults.set(meal.id, result);
    totalScore += result.score;

    // Propagate critical issues to day level
    result.issues.filter(i => i.severity === 'error').forEach(issue => {
      issues.push({
        ...issue,
        message: `${meal.type_es}: ${issue.message}`
      });
    });
  });

  // ========================================
  // DAILY TOTALS VALIDATION
  // ========================================

  const dailyTotals = plan.totals;
  const calorieDeviation = Math.abs(dailyTotals.kcal - targets.dailyCalories) / targets.dailyCalories;
  const proteinDeviation = Math.abs(dailyTotals.protein - targets.dailyProtein) / targets.dailyProtein;

  if (calorieDeviation > CALORIE_TOLERANCE.WARNING) {
    issues.push({
      severity: calorieDeviation > CALORIE_TOLERANCE.ERROR ? 'error' : 'warning',
      category: 'calories',
      message: `Total diario: ${dailyTotals.kcal} kcal (objetivo: ${targets.dailyCalories} kcal, desviación: ${(calorieDeviation * 100).toFixed(1)}%)`,
      actual: dailyTotals.kcal,
      expected: targets.dailyCalories,
      deviation: dailyTotals.kcal - targets.dailyCalories
    });
  }

  if (proteinDeviation > PROTEIN_TOLERANCE.WARNING) {
    issues.push({
      severity: proteinDeviation > PROTEIN_TOLERANCE.ERROR ? 'error' : 'warning',
      category: 'protein',
      message: `Proteína diaria: ${dailyTotals.protein}g (objetivo: ${targets.dailyProtein}g, desviación: ${(proteinDeviation * 100).toFixed(1)}%)`,
      actual: dailyTotals.protein,
      expected: targets.dailyProtein,
      deviation: dailyTotals.protein - targets.dailyProtein
    });
  }

  // ========================================
  // FINAL SCORE
  // ========================================

  const avgScore = plan.meals.length > 0 ? totalScore / plan.meals.length : 0;
  const isValid = avgScore >= 60 && issues.filter(i => i.severity === 'error').length === 0;

  return {
    isValid,
    score: Math.round(avgScore),
    issues,
    mealResults,
    dailyMetrics: {
      totalCalories: dailyTotals.kcal,
      totalProtein: dailyTotals.protein,
      totalCarbs: dailyTotals.carbs,
      totalFat: dailyTotals.fat,
      calorieDeviation,
      proteinDeviation
    }
  };
}

// ============================================================================
// 3. WEEKLY PLAN VALIDATION
// ============================================================================

/**
 * Validates a full week meal plan with variety analysis
 * 
 * @param weekPlan - Weekly meal plan to validate
 * @param targets - Daily nutritional targets
 * @returns Comprehensive week validation result
 */
export function validateWeekPlan(
  weekPlan: WeeklyMealPlan,
  targets: {
    dailyCalories: number;
    dailyProtein: number;
    dietType?: string;
  }
): WeekValidationResult {
  const issues: ValidationIssue[] = [];
  const dayResults = new Map<string, DayValidationResult>();
  let totalScore = 0;

  // ========================================
  // INPUT VALIDATION
  // ========================================

  if (!weekPlan || !weekPlan.days || !Array.isArray(weekPlan.days)) {
    return {
      isValid: false,
      score: 0,
      issues: [{ severity: 'error', category: 'calories', message: 'Week plan structure is invalid' }],
      dayResults,
      weeklyMetrics: {
        avgCalories: 0,
        avgProtein: 0,
        varietyScore: 0,
        consistencyScore: 0
      }
    };
  }

  // ========================================
  // VALIDATE EACH DAY
  // ========================================

  weekPlan.days.forEach(day => {
    const result = validateDayPlan(day, targets);
    dayResults.set(day.id, result);
    totalScore += result.score;

    // Propagate critical issues
    result.issues.filter(i => i.severity === 'error').forEach(issue => {
      issues.push({
        ...issue,
        message: `${day.name_es}: ${issue.message}`
      });
    });
  });

  // ========================================
  // VARIETY ANALYSIS
  // ========================================

  const allFoods = new Map<string, number>();
  const proteinFoods = new Set<string>();
  const carbFoods = new Set<string>();
  const vegetableFoods = new Set<string>();

  weekPlan.days.forEach(day => {
    day.meals.forEach(meal => {
      meal.items.forEach(item => {
        const foodId = item.food.id;
        allFoods.set(foodId, (allFoods.get(foodId) || 0) + 1);

        if (item.food.category === 'protein') proteinFoods.add(foodId);
        if (item.food.category === 'carb') carbFoods.add(foodId);
        if (item.food.category === 'vegetable') vegetableFoods.add(foodId);
      });
    });
  });

  // Check variety thresholds
  if (proteinFoods.size < VARIETY_THRESHOLDS.MIN_UNIQUE_PROTEINS_WEEK) {
    issues.push({
      severity: 'warning',
      category: 'variety',
      message: `Poca variedad de proteínas: ${proteinFoods.size} diferentes (mínimo: ${VARIETY_THRESHOLDS.MIN_UNIQUE_PROTEINS_WEEK})`,
      actual: proteinFoods.size,
      expected: VARIETY_THRESHOLDS.MIN_UNIQUE_PROTEINS_WEEK
    });
  }

  if (vegetableFoods.size < VARIETY_THRESHOLDS.MIN_UNIQUE_VEGETABLES_WEEK) {
    issues.push({
      severity: 'warning',
      category: 'variety',
      message: `Poca variedad de vegetales: ${vegetableFoods.size} diferentes (mínimo: ${VARIETY_THRESHOLDS.MIN_UNIQUE_VEGETABLES_WEEK})`,
      actual: vegetableFoods.size,
      expected: VARIETY_THRESHOLDS.MIN_UNIQUE_VEGETABLES_WEEK
    });
  }

  // Check for excessive repetition
  allFoods.forEach((count, foodId) => {
    if (count > VARIETY_THRESHOLDS.MAX_REPETITIONS_WEEK) {
      issues.push({
        severity: 'info',
        category: 'variety',
        message: `Alimento repetido ${count} veces en la semana (máximo recomendado: ${VARIETY_THRESHOLDS.MAX_REPETITIONS_WEEK})`,
        actual: count,
        expected: VARIETY_THRESHOLDS.MAX_REPETITIONS_WEEK
      });
    }
  });

  const varietyScore = Math.min(100, (proteinFoods.size + carbFoods.size + vegetableFoods.size) * 3);

  // ========================================
  // CONSISTENCY ANALYSIS
  // ========================================

  const dailyCalories = weekPlan.days.map(d => d.totals.kcal);
  const avgCalories = dailyCalories.reduce((a, b) => a + b, 0) / dailyCalories.length;
  const calorieVariance = dailyCalories.reduce((sum, cal) => sum + Math.pow(cal - avgCalories, 2), 0) / dailyCalories.length;
  const calorieStdDev = Math.sqrt(calorieVariance);
  const consistencyScore = Math.max(0, 100 - (calorieStdDev / avgCalories * 100));

  // ========================================
  // FINAL SCORE
  // ========================================

  const avgScore = weekPlan.days.length > 0 ? totalScore / weekPlan.days.length : 0;
  const finalScore = Math.round((avgScore * 0.7) + (varietyScore * 0.2) + (consistencyScore * 0.1));
  const isValid = finalScore >= 60 && issues.filter(i => i.severity === 'error').length === 0;

  return {
    isValid,
    score: finalScore,
    issues,
    dayResults,
    weeklyMetrics: {
      avgCalories: Math.round(avgCalories),
      avgProtein: Math.round(weekPlan.days.reduce((sum, d) => sum + d.totals.protein, 0) / weekPlan.days.length),
      varietyScore: Math.round(varietyScore),
      consistencyScore: Math.round(consistencyScore)
    }
  };
}

// ============================================================================
// 4. UTILITY FUNCTIONS
// ============================================================================

/**
 * Formats validation issues for display
 */
export function formatValidationIssues(issues: ValidationIssue[]): string {
  if (issues.length === 0) return '✅ Sin problemas detectados';

  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const infos = issues.filter(i => i.severity === 'info');

  let output = '';

  if (errors.length > 0) {
    output += '❌ ERRORES:\n';
    errors.forEach(e => output += `  • ${e.message}\n`);
  }

  if (warnings.length > 0) {
    output += '\n⚠️  ADVERTENCIAS:\n';
    warnings.forEach(w => output += `  • ${w.message}\n`);
  }

  if (infos.length > 0) {
    output += '\nℹ️  INFORMACIÓN:\n';
    infos.forEach(i => output += `  • ${i.message}\n`);
  }

  return output;
}

/**
 * Gets validation summary statistics
 */
export function getValidationSummary(result: DayValidationResult | WeekValidationResult): {
  totalIssues: number;
  errors: number;
  warnings: number;
  infos: number;
  scoreGrade: string;
} {
  const errors = result.issues.filter(i => i.severity === 'error').length;
  const warnings = result.issues.filter(i => i.severity === 'warning').length;
  const infos = result.issues.filter(i => i.severity === 'info').length;

  let scoreGrade = 'F';
  if (result.score >= 90) scoreGrade = 'A';
  else if (result.score >= 80) scoreGrade = 'B';
  else if (result.score >= 70) scoreGrade = 'C';
  else if (result.score >= 60) scoreGrade = 'D';

  return {
    totalIssues: result.issues.length,
    errors,
    warnings,
    infos,
    scoreGrade
  };
}
