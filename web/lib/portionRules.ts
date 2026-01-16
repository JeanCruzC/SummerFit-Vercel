// ============================================================================
// INTELLIGENT PORTION CONTROL SYSTEM
// Based on USDA Dietary Guidelines for Americans 2025-2030
// Production-Grade Implementation with Full Validation
// ============================================================================

import { SimpleFoodItem, MealItem } from './mealGenerator';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PortionCalculationContext {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  existingItems: MealItem[];
  dietType: string;
  userConditions?: string[];
  targetCalories: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
}

export interface PortionValidationResult {
  isValid: boolean;
  finalPortion: number;
  appliedRules: string[];
  warnings: string[];
  errors: string[];
  metadata: {
    idealPortion: number;
    densityLimit: number;
    contextMultiplier: number;
    finalMultiplier: number;
  };
}

export interface NutritionalRole {
  isPrimaryProtein: boolean;
  isPrimaryCarb: boolean;
  isPrimaryFat: boolean;
  isFiber: boolean;
  isMicronutrientRich: boolean;
}

// ============================================================================
// CONSTANTS - USDA DGA 2025-2030 BASED
// ============================================================================

const CALORIC_DENSITY_THRESHOLDS = {
  VERY_HIGH: 400,  // >400 kcal/100g: Oils, nuts, seeds
  HIGH: 250,       // 250-400: Cheese, fatty meats, dried fruits
  MODERATE: 150,   // 150-250: Lean meats, pasta, bread
  LOW: 50,         // 50-150: Vegetables, fruits, yogurt
  VERY_LOW: 0      // <50: Leafy greens, cucumber, celery
} as const;

const MAX_PORTIONS_BY_DENSITY = {
  VERY_HIGH: 50,   // Max 50g for oils/nuts
  HIGH: 100,       // Max 100g for cheese/fatty meat
  MODERATE: 200,   // Max 200g for lean protein/grains
  LOW: 300,        // Max 300g for vegetables/fruits
  VERY_LOW: 400    // Max 400g for leafy greens
} as const;

const PROTEIN_THRESHOLDS = {
  PRIMARY_SOURCE: 15,      // ≥15g/100g = primary protein (USDA)
  SECONDARY_SOURCE: 8,     // 8-15g/100g = secondary protein
  MINIMAL: 3               // 3-8g/100g = minimal protein
} as const;

const CARB_THRESHOLDS = {
  PRIMARY_SOURCE: 20,      // ≥20g/100g = primary carb
  SECONDARY_SOURCE: 10,    // 10-20g/100g = secondary carb
  LOW_CARB: 5              // <5g/100g = low carb
} as const;

const FAT_THRESHOLDS = {
  PRIMARY_SOURCE: 30,      // ≥30g/100g = primary fat
  HIGH_FAT: 15,            // 15-30g/100g = high fat
  MODERATE_FAT: 5          // 5-15g/100g = moderate fat
} as const;

const MEAL_CONTEXT_MULTIPLIERS = {
  breakfast: 0.85,
  lunch: 1.15,
  dinner: 1.0,
  snack: 0.6
} as const;

const DIET_TYPE_ADJUSTMENTS = {
  keto: { carb_multiplier: 0.3, fat_multiplier: 1.3, protein_multiplier: 1.1 },
  low_carb: { carb_multiplier: 0.6, fat_multiplier: 1.1, protein_multiplier: 1.0 },
  high_protein: { carb_multiplier: 0.9, fat_multiplier: 0.9, protein_multiplier: 1.3 },
  vegan: { carb_multiplier: 1.1, fat_multiplier: 1.0, protein_multiplier: 1.0 },
  vegetarian: { carb_multiplier: 1.05, fat_multiplier: 1.0, protein_multiplier: 1.0 },
  diabetes_friendly: { carb_multiplier: 0.7, fat_multiplier: 0.9, protein_multiplier: 1.1 },
  balanced: { carb_multiplier: 1.0, fat_multiplier: 1.0, protein_multiplier: 1.0 }
} as const;

const ABSOLUTE_LIMITS = {
  MIN_PORTION: 20,         // Minimum 20g to be meaningful
  MAX_PORTION: 500,        // Absolute maximum 500g per food item
  MIN_PROTEIN_PORTION: 60, // Minimum 60g for protein sources
  MAX_VEGETABLE_COUNT: 3,  // Max 3 different vegetables per meal
  MAX_PROTEIN_COUNT: 1,    // Max 1 primary protein per meal
  MAX_CARB_COUNT: 1        // Max 1 primary carb per meal
} as const;

// ============================================================================
// 1. CALORIC DENSITY ANALYSIS
// ============================================================================

/**
 * Determines maximum safe portion based on caloric density
 * Prevents absurd portions like 350g of nuts or 500g of cheese
 * 
 * @param food - Food item to analyze
 * @returns Maximum portion in grams based on USDA density guidelines
 */
export function getMaxPortionByDensity(food: SimpleFoodItem): number {
  // Input validation
  if (!food) {
    console.error('[portionRules] getMaxPortionByDensity: food is null/undefined');
    return ABSOLUTE_LIMITS.MAX_PORTION;
  }

  if (typeof food.kcal !== 'number' || food.kcal < 0) {
    console.warn(`[portionRules] Invalid kcal for food ${food.id}: ${food.kcal}`);
    return ABSOLUTE_LIMITS.MAX_PORTION;
  }

  const kcalPer100g = food.kcal;

  // Apply USDA density-based limits
  if (kcalPer100g > CALORIC_DENSITY_THRESHOLDS.VERY_HIGH) {
    return MAX_PORTIONS_BY_DENSITY.VERY_HIGH;
  }
  if (kcalPer100g > CALORIC_DENSITY_THRESHOLDS.HIGH) {
    return MAX_PORTIONS_BY_DENSITY.HIGH;
  }
  if (kcalPer100g > CALORIC_DENSITY_THRESHOLDS.MODERATE) {
    return MAX_PORTIONS_BY_DENSITY.MODERATE;
  }
  if (kcalPer100g > CALORIC_DENSITY_THRESHOLDS.LOW) {
    return MAX_PORTIONS_BY_DENSITY.LOW;
  }

  return MAX_PORTIONS_BY_DENSITY.VERY_LOW;
}

// ============================================================================
// 2. NUTRITIONAL ROLE CLASSIFICATION
// ============================================================================

/**
 * Determines if food is a primary protein source (≥15g/100g)
 * Used to prevent multiple proteins in same meal
 */
export function isPrimaryProtein(food: SimpleFoodItem): boolean {
  if (!food || typeof food.protein !== 'number') {
    console.warn(`[portionRules] isPrimaryProtein: Invalid food data`);
    return false;
  }
  return food.protein >= PROTEIN_THRESHOLDS.PRIMARY_SOURCE;
}

/**
 * Determines if food is a primary carbohydrate source (≥20g/100g)
 * Excludes vegetables to allow multiple veggie servings
 */
export function isPrimaryCarb(food: SimpleFoodItem): boolean {
  if (!food || typeof food.carbs !== 'number') {
    console.warn(`[portionRules] isPrimaryCarb: Invalid food data`);
    return false;
  }
  return food.carbs >= CARB_THRESHOLDS.PRIMARY_SOURCE &&
    food.category !== 'vegetable';
}

/**
 * Determines if food is a primary fat source (≥30g/100g)
 */
export function isPrimaryFat(food: SimpleFoodItem): boolean {
  if (!food || typeof food.fat !== 'number') {
    console.warn(`[portionRules] isPrimaryFat: Invalid food data`);
    return false;
  }
  return food.fat >= FAT_THRESHOLDS.PRIMARY_SOURCE;
}

/**
 * Comprehensive nutritional role analysis
 * Returns all roles a food plays in the meal
 */
export function analyzeNutritionalRole(food: SimpleFoodItem): NutritionalRole {
  if (!food) {
    return {
      isPrimaryProtein: false,
      isPrimaryCarb: false,
      isPrimaryFat: false,
      isFiber: false,
      isMicronutrientRich: false
    };
  }

  const fiber = food.fiber || 0;
  const hasMicros = food.micros && Object.values(food.micros).some(v => v && v > 0);

  return {
    isPrimaryProtein: isPrimaryProtein(food),
    isPrimaryCarb: isPrimaryCarb(food),
    isPrimaryFat: isPrimaryFat(food),
    isFiber: fiber >= 3, // High fiber: ≥3g/100g
    isMicronutrientRich: !!hasMicros
  };
}

// ============================================================================
// 3. DUPLICATION PREVENTION
// ============================================================================

/**
 * Prevents duplicate nutritional roles in same meal
 * Examples prevented:
 * - Chicken + Beef (two primary proteins)
 * - Rice + Pasta (two primary carbs)
 * - Olive oil + Avocado (two primary fats)
 * 
 * @param existingItems - Foods already in the meal
 * @param candidate - Food being considered for addition
 * @returns true if candidate can be added, false if it duplicates a role
 */
export function preventRoleDuplication(
  existingItems: MealItem[],
  candidate: SimpleFoodItem
): boolean {
  // Input validation
  if (!candidate) {
    console.error('[portionRules] preventRoleDuplication: candidate is null');
    return false;
  }

  if (!Array.isArray(existingItems)) {
    console.warn('[portionRules] preventRoleDuplication: existingItems is not an array');
    existingItems = [];
  }

  // Analyze existing meal composition
  const existingRoles = {
    primaryProteins: existingItems.filter(i => i.food && isPrimaryProtein(i.food)),
    primaryCarbs: existingItems.filter(i => i.food && isPrimaryCarb(i.food)),
    primaryFats: existingItems.filter(i => i.food && isPrimaryFat(i.food)),
    vegetables: existingItems.filter(i => i.food && i.food.category === 'vegetable')
  };

  const candidateRole = analyzeNutritionalRole(candidate);

  // RULE 1: Maximum 1 primary protein per meal
  if (candidateRole.isPrimaryProtein && existingRoles.primaryProteins.length >= ABSOLUTE_LIMITS.MAX_PROTEIN_COUNT) {
    console.log(`[portionRules] Blocked: ${candidate.name_es} - Already has primary protein`);
    return false;
  }

  // RULE 2: Maximum 1 primary carb per meal (excluding vegetables)
  if (candidateRole.isPrimaryCarb && existingRoles.primaryCarbs.length >= ABSOLUTE_LIMITS.MAX_CARB_COUNT) {
    console.log(`[portionRules] Blocked: ${candidate.name_es} - Already has primary carb`);
    return false;
  }

  // RULE 3: Maximum 1 primary fat per meal
  if (candidateRole.isPrimaryFat && existingRoles.primaryFats.length >= 1) {
    console.log(`[portionRules] Blocked: ${candidate.name_es} - Already has primary fat`);
    return false;
  }

  // RULE 4: Maximum 3 vegetables per meal (avoid salad overload)
  if (candidate.category === 'vegetable' && existingRoles.vegetables.length >= ABSOLUTE_LIMITS.MAX_VEGETABLE_COUNT) {
    console.log(`[portionRules] Blocked: ${candidate.name_es} - Already has ${existingRoles.vegetables.length} vegetables`);
    return false;
  }

  // RULE 5: Prevent exact duplicate foods
  const isDuplicate = existingItems.some(i => i.food && i.food.id === candidate.id);
  if (isDuplicate) {
    console.log(`[portionRules] Blocked: ${candidate.name_es} - Exact duplicate`);
    return false;
  }

  return true;
}

// ============================================================================
// 4. MEAL CONTEXT APPROPRIATENESS
// ============================================================================

/**
 * Validates if food is appropriate for specific meal type
 * Uses AI-tagged meal_times when available, falls back to category rules
 * 
 * Examples:
 * - Salmon: appropriate for lunch/dinner, not breakfast
 * - Oatmeal: appropriate for breakfast, not dinner
 * - Nuts: appropriate for snacks, any meal
 */
export function isFoodAppropriateForMeal(
  food: SimpleFoodItem,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
): boolean {
  // Input validation
  if (!food) {
    console.error('[portionRules] isFoodAppropriateForMeal: food is null');
    return false;
  }

  if (!mealType || !['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)) {
    console.warn(`[portionRules] Invalid mealType: ${mealType}`);
    return true; // Permissive fallback
  }

  // Priority 1: Use AI-tagged meal_times if available
  if (food.meal_times && Array.isArray(food.meal_times) && food.meal_times.length > 0) {
    const isTagged = food.meal_times.includes(mealType);

    // Special case: snacks can include fruits and nuts even without explicit tag
    if (mealType === 'snack' && !isTagged) {
      if (['fruit', 'fat', 'dairy'].includes(food.category)) {
        return true;
      }
    }

    return isTagged;
  }

  // Priority 2: Category-based rules (fallback)
  switch (mealType) {
    case 'breakfast':
      // Breakfast: carbs, fruits, dairy, eggs
      return ['carb', 'fruit', 'dairy'].includes(food.category) ||
        (food.category === 'protein' && food.id === 'eggs');

    case 'snack':
      // Snacks: fruits, nuts, dairy, light proteins
      return ['fruit', 'fat', 'dairy'].includes(food.category) ||
        (food.category === 'protein' && food.protein > 10 && food.kcal < 200);

    case 'lunch':
    case 'dinner':
      // Lunch/Dinner: everything allowed
      return true;

    default:
      return true;
  }
}

// ============================================================================
// 5. OPTIMAL PORTION CALCULATOR (CORE ALGORITHM)
// ============================================================================

/**
 * Calculates optimal portion size using multi-factor analysis
 * 
 * Factors considered:
 * 1. Nutritional target (protein/carbs/calories)
 * 2. Caloric density limits
 * 3. Meal context (breakfast vs dinner)
 * 4. Diet type (keto vs balanced)
 * 5. Existing meal composition
 * 6. Food category and role
 * 
 * @param food - Food item to portion
 * @param target - Nutritional targets for this food
 * @param context - Full meal context
 * @returns Validated portion calculation result
 */
export function calculateOptimalPortion(
  food: SimpleFoodItem,
  target: { kcal?: number; protein?: number; carbs?: number; fat?: number },
  context: PortionCalculationContext
): PortionValidationResult {
  const appliedRules: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  // ========================================
  // VALIDATION PHASE
  // ========================================

  if (!food) {
    errors.push('Food object is null or undefined');
    return {
      isValid: false,
      finalPortion: 0,
      appliedRules,
      warnings,
      errors,
      metadata: { idealPortion: 0, densityLimit: 0, contextMultiplier: 1, finalMultiplier: 1 }
    };
  }

  if (!target || (target.kcal === undefined && target.protein === undefined && target.carbs === undefined)) {
    errors.push('No valid nutritional target provided');
    return {
      isValid: false,
      finalPortion: 0,
      appliedRules,
      warnings,
      errors,
      metadata: { idealPortion: 0, densityLimit: 0, contextMultiplier: 1, finalMultiplier: 1 }
    };
  }

  if (!context || !context.mealType) {
    errors.push('Invalid meal context');
    return {
      isValid: false,
      finalPortion: 0,
      appliedRules,
      warnings,
      errors,
      metadata: { idealPortion: 0, densityLimit: 0, contextMultiplier: 1, finalMultiplier: 1 }
    };
  }

  // ========================================
  // STEP 1: CALCULATE IDEAL PORTION
  // ========================================

  let idealPortion = 100; // Default baseline
  let targetType: 'protein' | 'carbs' | 'kcal' | 'fat' = 'kcal';

  // Priority order: protein > carbs > fat > calories
  if (target.protein !== undefined && target.protein > 0 && food.protein > 0) {
    idealPortion = (target.protein / food.protein) * 100;
    targetType = 'protein';
    appliedRules.push(`Target: ${target.protein}g protein`);
  } else if (target.carbs !== undefined && target.carbs > 0 && food.carbs > 0) {
    idealPortion = (target.carbs / food.carbs) * 100;
    targetType = 'carbs';
    appliedRules.push(`Target: ${target.carbs}g carbs`);
  } else if (target.fat !== undefined && target.fat > 0 && food.fat > 0) {
    idealPortion = (target.fat / food.fat) * 100;
    targetType = 'fat';
    appliedRules.push(`Target: ${target.fat}g fat`);
  } else if (target.kcal !== undefined && target.kcal > 0 && food.kcal > 0) {
    idealPortion = (target.kcal / food.kcal) * 100;
    targetType = 'kcal';
    appliedRules.push(`Target: ${target.kcal} kcal`);
  } else {
    warnings.push('No valid target-to-food macro match, using default 100g');
  }

  // ========================================
  // STEP 2: APPLY DENSITY LIMIT
  // ========================================

  const densityLimit = getMaxPortionByDensity(food);
  appliedRules.push(`Density limit: ${densityLimit}g (${food.kcal} kcal/100g)`);

  if (idealPortion > densityLimit) {
    warnings.push(`Ideal portion ${Math.round(idealPortion)}g exceeds density limit ${densityLimit}g`);
    idealPortion = densityLimit;
  }

  // ========================================
  // STEP 3: MEAL CONTEXT ADJUSTMENT
  // ========================================

  let contextMultiplier = MEAL_CONTEXT_MULTIPLIERS[context.mealType] || 1.0;
  appliedRules.push(`Meal context (${context.mealType}): ${contextMultiplier}x`);

  // ========================================
  // STEP 4: DIET TYPE ADJUSTMENT
  // ========================================

  const dietKey = context.dietType.toLowerCase().replace(/[^a-z_]/g, '_');
  const dietAdjustment = DIET_TYPE_ADJUSTMENTS[dietKey as keyof typeof DIET_TYPE_ADJUSTMENTS] ||
    DIET_TYPE_ADJUSTMENTS.balanced;

  let dietMultiplier = 1.0;

  if (food.category === 'carb' || food.carbs > 15) {
    dietMultiplier *= dietAdjustment.carb_multiplier;
    appliedRules.push(`Diet carb adjustment (${context.dietType}): ${dietAdjustment.carb_multiplier}x`);
  }
  if (food.category === 'fat' || food.fat > 15) {
    dietMultiplier *= dietAdjustment.fat_multiplier;
    appliedRules.push(`Diet fat adjustment (${context.dietType}): ${dietAdjustment.fat_multiplier}x`);
  }
  if (food.category === 'protein' || food.protein > 15) {
    dietMultiplier *= dietAdjustment.protein_multiplier;
    appliedRules.push(`Diet protein adjustment (${context.dietType}): ${dietAdjustment.protein_multiplier}x`);
  }

  // ========================================
  // STEP 5: CATEGORY-SPECIFIC RULES
  // ========================================

  let categoryMultiplier = 1.0;

  if (food.category === 'vegetable') {
    // Vegetables: encourage larger portions
    categoryMultiplier = 1.2;
    appliedRules.push('Vegetable bonus: 1.2x');
  } else if (food.category === 'fruit') {
    // Fruits: moderate portions
    categoryMultiplier = 0.9;
    appliedRules.push('Fruit moderation: 0.9x');
  } else if (food.category === 'fat') {
    // Fats: strict control
    categoryMultiplier = 0.7;
    appliedRules.push('Fat restriction: 0.7x');
  }

  // ========================================
  // STEP 6: CALCULATE FINAL PORTION
  // ========================================

  const finalMultiplier = contextMultiplier * dietMultiplier * categoryMultiplier;
  let finalPortion = Math.round(idealPortion * finalMultiplier);

  appliedRules.push(`Final multiplier: ${finalMultiplier.toFixed(2)}x`);

  // ========================================
  // STEP 7: APPLY ABSOLUTE LIMITS
  // ========================================

  // Minimum portion
  if (finalPortion < ABSOLUTE_LIMITS.MIN_PORTION) {
    warnings.push(`Portion ${finalPortion}g below minimum, setting to ${ABSOLUTE_LIMITS.MIN_PORTION}g`);
    finalPortion = ABSOLUTE_LIMITS.MIN_PORTION;
  }

  // Maximum portion
  if (finalPortion > ABSOLUTE_LIMITS.MAX_PORTION) {
    warnings.push(`Portion ${finalPortion}g exceeds absolute maximum, capping at ${ABSOLUTE_LIMITS.MAX_PORTION}g`);
    finalPortion = ABSOLUTE_LIMITS.MAX_PORTION;
  }

  // Protein-specific minimum
  if (food.category === 'protein' && finalPortion < ABSOLUTE_LIMITS.MIN_PROTEIN_PORTION) {
    warnings.push(`Protein portion ${finalPortion}g below minimum, setting to ${ABSOLUTE_LIMITS.MIN_PROTEIN_PORTION}g`);
    finalPortion = ABSOLUTE_LIMITS.MIN_PROTEIN_PORTION;
  }

  // Round to nearest 5g for cleaner portions
  finalPortion = Math.round(finalPortion / 5) * 5;
  appliedRules.push(`Rounded to nearest 5g: ${finalPortion}g`);

  // ========================================
  // STEP 8: FINAL VALIDATION
  // ========================================

  const isValid = errors.length === 0 && finalPortion >= ABSOLUTE_LIMITS.MIN_PORTION;

  return {
    isValid,
    finalPortion,
    appliedRules,
    warnings,
    errors,
    metadata: {
      idealPortion: Math.round(idealPortion),
      densityLimit,
      contextMultiplier,
      finalMultiplier
    }
  };
}

// ============================================================================
// 6. VARIETY MANAGER (ANTI-REPETITION)
// ============================================================================

/**
 * Manages food variety across meals to prevent repetition
 * Tracks usage with time-based cooldowns
 */
export class VarietyManager {
  private usedFoods: Map<string, Date> = new Map();
  private cooldownHours: number;

  constructor(cooldownHours: number = 12) {
    if (cooldownHours < 0 || cooldownHours > 168) {
      console.warn(`[VarietyManager] Invalid cooldown ${cooldownHours}h, using default 12h`);
      cooldownHours = 12;
    }
    this.cooldownHours = cooldownHours;
  }

  /**
   * Marks a food as used with current timestamp
   */
  markUsed(foodId: string): void {
    if (!foodId) {
      console.warn('[VarietyManager] markUsed: foodId is empty');
      return;
    }
    this.usedFoods.set(foodId, new Date());
  }

  /**
   * Checks if food is in cooldown period
   */
  isInCooldown(foodId: string): boolean {
    if (!foodId) return false;

    const lastUsed = this.usedFoods.get(foodId);
    if (!lastUsed) return false;

    const hoursSince = (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60);
    return hoursSince < this.cooldownHours;
  }

  /**
   * Filters foods to only available (not in cooldown)
   */
  getAvailableFoods(foods: SimpleFoodItem[]): SimpleFoodItem[] {
    if (!Array.isArray(foods)) {
      console.warn('[VarietyManager] getAvailableFoods: foods is not an array');
      return [];
    }

    return foods.filter(f => f && !this.isInCooldown(f.id));
  }

  /**
   * Resets all cooldowns
   */
  reset(): void {
    this.usedFoods.clear();
  }

  /**
   * Gets usage statistics
   */
  getStats(): { totalUsed: number; inCooldown: number; available: number } {
    const now = Date.now();
    let inCooldown = 0;

    this.usedFoods.forEach((lastUsed) => {
      const hoursSince = (now - lastUsed.getTime()) / (1000 * 60 * 60);
      if (hoursSince < this.cooldownHours) {
        inCooldown++;
      }
    });

    return {
      totalUsed: this.usedFoods.size,
      inCooldown,
      available: this.usedFoods.size - inCooldown
    };
  }
}

// ============================================================================
// 7. UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates if a food meets minimum nutritional standards
 */
export function isNutritionallyViable(food: SimpleFoodItem): boolean {
  if (!food) return false;

  // Must have at least one significant macronutrient
  const hasSignificantMacro =
    food.protein >= 3 ||
    food.carbs >= 5 ||
    food.fat >= 3 ||
    food.kcal >= 20;

  if (!hasSignificantMacro) {
    console.warn(`[portionRules] Food ${food.id} (${food.name_es}) has insufficient macros: Kcal:${food.kcal} P:${food.protein} C:${food.carbs} F:${food.fat}`);
    return false;
  }

  return true;
}

/**
 * Logs portion calculation for debugging
 */
export function logPortionCalculation(
  food: SimpleFoodItem,
  result: PortionValidationResult
): void {
  console.log(`\n[PORTION CALC] ${food.name_es} (${food.id})`);
  console.log(`  ✓ Final: ${result.finalPortion}g`);
  console.log(`  📊 Ideal: ${result.metadata.idealPortion}g`);
  console.log(`  🔒 Density Limit: ${result.metadata.densityLimit}g`);
  console.log(`  📐 Multiplier: ${result.metadata.finalMultiplier.toFixed(2)}x`);

  if (result.appliedRules.length > 0) {
    console.log(`  📋 Rules Applied:`);
    result.appliedRules.forEach(rule => console.log(`     - ${rule}`));
  }

  if (result.warnings.length > 0) {
    console.log(`  ⚠️  Warnings:`);
    result.warnings.forEach(warn => console.log(`     - ${warn}`));
  }

  if (result.errors.length > 0) {
    console.log(`  ❌ Errors:`);
    result.errors.forEach(err => console.log(`     - ${err}`));
  }
}
