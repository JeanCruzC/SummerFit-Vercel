// Simple Meal Plan Generator
// Uses basic groceries (chicken, rice, potato, etc.) not complex recipes

import { calculateBMR, calculateTDEE, calculateMacros } from './nutrition';
import { DIET_MACROS } from './diets';
import { foodCache } from './foodCache';
import {
    getMaxPortionByDensity,
    isPrimaryProtein,
    isPrimaryCarb,
    isPrimaryFat,
    preventRoleDuplication,
    isFoodAppropriateForMeal,
    calculateOptimalPortion,
    VarietyManager as PortionVarietyManager,
    analyzeNutritionalRole,
    isNutritionallyViable,
    logPortionCalculation,
    type PortionCalculationContext
} from './portionRules';
import { assignRole } from './roleMapper';
import { validateUSDAHard, computeMealBudgets, isWholeGrain, getDietAdjustedServingTargets, countServingsByGroup, getUSDAComplianceMode, normalizeDietType, getFunctionalCategory } from './usdaCompliance';

let glpkInstance: any | null = null;
async function getGlpk() {
    if (glpkInstance) return glpkInstance;
    const mod: any = await import('glpk.js');
    const glpk = mod.default || mod;
    glpkInstance = await glpk();
    return glpkInstance;
}

// Basic food items with nutrition per 100g
export interface SimpleFoodItem {
    id: string;
    name: string;
    name_es: string;
    emoji: string;
    category: 'protein' | 'carb' | 'vegetable' | 'fat' | 'fruit' | 'dairy' | 'condiment' | 'beverage' | 'legume';
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sodium_mg?: number;
    sugar_g?: number;
    added_sugars_g?: number;
    sat_fat_g?: number;
    usda_group?: 'protein' | 'dairy' | 'vegetable' | 'fruit' | 'whole_grain' | 'refined_grain' | 'fat' | 'condiment';
    serving_equiv_grams?: number; // explicit USDA serving equivalent in grams if known
    processing_level?: 'minimally_processed' | 'processed' | 'ultra_processed';
    is_whole_grain?: boolean;
    data_quality_flags?: Record<string, unknown> | string;
    // Clinical Micros (Values per 100g)
    micros?: {
        iron_mg?: number;    // Hierro (Pregnancy/Anemia)
        calcium_mg?: number; // Calcio (Bones/Menopause)
        zinc_mg?: number;    // Zinc (Immune/Metabolism)
        vit_c_mg?: number;   // Vit C (Immunity/Iron Abs)
        vit_d_iu?: number;   // Vit D (Mood/Bones)
        folate_mcg?: number; // Folato (Pregnancy)
        magnesium_mg?: number; // Magnesio (Sleep/Muscle)
        omega3_g?: number;   // Omega 3 (Brain/Inflammation)
        potassium_mg?: number; // Potasio (Blood Pressure)
        vit_a_iu?: number;   // Vit A (Vision/Immunity)
        vit_e_mg?: number;   // Vit E (Skin/Antioxidant)
        vit_b12_mcg?: number; // B12 (Energy/Veganism)
        colina_mg?: number;  // Colina (Brain/Pregnancy)
    };
    cooking_states?: string[];
    portion_g: number; // Standard portion in grams
    // Smart Portions
    serving_size?: number;
    serving_unit?: string;
    // AI Metadata
    meal_times?: string[];
    is_common_staple?: boolean;
}

const MICRO_KEYS = [
    'calcium_mg',
    'iron_mg',
    'potassium_mg',
    'magnesium_mg',
    'folate_mcg',
    'vitamin_b12_ug',
    'vitamin_a_iu',
    'vitamin_c_mg',
    'vitamin_d_iu'
] as const;
type MicroKey = typeof MICRO_KEYS[number];
const MICRO_MIN_RATIO = 1.0;
const MICRO_DATA_COVERAGE_MIN = 0.15;

// Basic groceries database - simple foods only
// ENRICHED WITH CLINICAL DATA + PORTION UNITS (Approx USDA values)
export const SIMPLE_FOODS: SimpleFoodItem[] = [
    // PROTEINS
    { id: 'chicken_breast', name: 'Chicken Breast', name_es: 'Pechuga de Pollo', emoji: '🍗', category: 'protein', kcal: 165, protein: 31, carbs: 0, fat: 3.6, portion_g: 150, serving_size: 120, serving_unit: 'fillet', micros: { iron_mg: 1, magnesium_mg: 29 }, cooking_states: ['grilled', 'baked', 'boiled'] },
    { id: 'chicken_thigh', name: 'Chicken Thigh', name_es: 'Muslo de Pollo', emoji: '🍗', category: 'protein', kcal: 209, protein: 26, carbs: 0, fat: 10.9, portion_g: 150, serving_size: 52, serving_unit: 'thigh', micros: { iron_mg: 1.3, magnesium_mg: 24 }, cooking_states: ['grilled', 'baked'] },
    { id: 'beef_ground', name: 'Ground Beef (lean)', name_es: 'Carne Molida', emoji: '🥩', category: 'protein', kcal: 250, protein: 26, carbs: 0, fat: 15, portion_g: 150, serving_size: 85, serving_unit: 'serving (3 oz)', micros: { iron_mg: 2.6, magnesium_mg: 21 }, cooking_states: ['cooked'] },
    { id: 'beef_steak', name: 'Beef Steak', name_es: 'Bistec de Res', emoji: '🥩', category: 'protein', kcal: 271, protein: 26, carbs: 0, fat: 18, portion_g: 150, serving_size: 85, serving_unit: 'steak (3 oz)', micros: { iron_mg: 2.1, magnesium_mg: 21 }, cooking_states: ['grilled', 'pan-fried'] },
    { id: 'pork_loin', name: 'Pork Loin', name_es: 'Lomo de Cerdo', emoji: '🐷', category: 'protein', kcal: 143, protein: 27, carbs: 0, fat: 3.5, portion_g: 150, serving_size: 85, serving_unit: 'chop (3 oz)', micros: { iron_mg: 0.9, magnesium_mg: 29 }, cooking_states: ['grilled', 'baked'] },
    { id: 'fish_tilapia', name: 'Tilapia', name_es: 'Tilapia', emoji: '🐟', category: 'protein', kcal: 96, protein: 20, carbs: 0, fat: 1.7, portion_g: 150, serving_size: 87, serving_unit: 'fillet', micros: { iron_mg: 0.6, calcium_mg: 10 }, cooking_states: ['grilled', 'baked', 'pan-fried'] },
    { id: 'fish_salmon', name: 'Salmon', name_es: 'Salmón', emoji: '🐟', category: 'protein', kcal: 208, protein: 20, carbs: 0, fat: 13, portion_g: 150, serving_size: 85, serving_unit: 'fillet (3 oz)', micros: { omega3_g: 2.3, vit_d_iu: 500, calcium_mg: 9 }, cooking_states: ['grilled', 'baked'] },
    { id: 'tuna_canned', name: 'Tuna (canned)', name_es: 'Atún en Lata', emoji: '🐟', category: 'protein', kcal: 116, protein: 26, carbs: 0, fat: 1, portion_g: 100, serving_size: 85, serving_unit: 'can (3 oz)', micros: { iron_mg: 1.5, omega3_g: 0.3 }, cooking_states: ['canned'] },
    { id: 'eggs', name: 'Eggs', name_es: 'Huevos', emoji: '🥚', category: 'protein', kcal: 155, protein: 13, carbs: 1.1, fat: 11, portion_g: 100, serving_size: 50, serving_unit: 'large egg', micros: { vit_d_iu: 87, iron_mg: 1.8, folate_mcg: 47, colina_mg: 250 }, cooking_states: ['boiled', 'scrambled', 'fried'] },
    { id: 'turkey_breast', name: 'Turkey Breast', name_es: 'Pechuga de Pavo', emoji: '🦃', category: 'protein', kcal: 135, protein: 30, carbs: 0, fat: 1, portion_g: 150, serving_size: 85, serving_unit: 'slice (3 oz)', micros: { iron_mg: 1.1, magnesium_mg: 30 }, cooking_states: ['grilled', 'baked'] },

    // CARBS
    { id: 'rice_white', name: 'White Rice', name_es: 'Arroz Blanco', emoji: '🍚', category: 'carb', kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, portion_g: 150, serving_size: 158, serving_unit: 'cup cooked', micros: { iron_mg: 1.2 }, cooking_states: ['cooked'] },
    { id: 'rice_brown', name: 'Brown Rice', name_es: 'Arroz Integral', emoji: '🍚', category: 'carb', kcal: 111, protein: 2.6, carbs: 23, fat: 0.9, fiber: 1.8, portion_g: 150, serving_size: 158, serving_unit: 'cup cooked', micros: { magnesium_mg: 43, iron_mg: 0.5 }, cooking_states: ['cooked'] },
    { id: 'potato', name: 'Potato', name_es: 'Papa', emoji: '🥔', category: 'carb', kcal: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2, portion_g: 200, serving_size: 150, serving_unit: 'medium', micros: { vit_c_mg: 19, potassium_mg: 421 }, cooking_states: ['boiled', 'baked', 'mashed'] },
    { id: 'sweet_potato', name: 'Sweet Potato', name_es: 'Camote', emoji: '🍠', category: 'carb', kcal: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3, portion_g: 200, serving_size: 130, serving_unit: 'medium', micros: { vit_a_iu: 14000, vit_c_mg: 2.4 }, cooking_states: ['boiled', 'baked'] },
    { id: 'pasta', name: 'Pasta', name_es: 'Pasta', emoji: '🍝', category: 'carb', kcal: 131, protein: 5, carbs: 25, fat: 1.1, portion_g: 150, serving_size: 140, serving_unit: 'cup cooked', micros: { iron_mg: 1.3 }, cooking_states: ['cooked'] },
    { id: 'oats', name: 'Oatmeal', name_es: 'Avena', emoji: '🌾', category: 'carb', kcal: 68, protein: 2.4, carbs: 12, fat: 1.4, fiber: 1.7, portion_g: 200, serving_size: 234, serving_unit: 'cup cooked', micros: { iron_mg: 1.0, magnesium_mg: 27 }, cooking_states: ['cooked'] },
    { id: 'bread_whole', name: 'Whole Wheat Bread', name_es: 'Pan Integral', emoji: '🍞', category: 'carb', kcal: 247, protein: 13, carbs: 41, fat: 3.4, fiber: 7, portion_g: 60, serving_size: 28, serving_unit: 'slice', micros: { iron_mg: 2.5, magnesium_mg: 82 }, cooking_states: ['toasted'] },
    { id: 'quinoa', name: 'Quinoa', name_es: 'Quinua', emoji: '🌾', category: 'carb', kcal: 120, protein: 4.4, carbs: 21, fat: 1.9, fiber: 2.8, portion_g: 150, serving_size: 185, serving_unit: 'cup cooked', micros: { iron_mg: 1.5, magnesium_mg: 64, folate_mcg: 42 }, cooking_states: ['cooked'] },
    { id: 'beans_black', name: 'Black Beans', name_es: 'Frijoles Negros', emoji: '🫘', category: 'legume', kcal: 132, protein: 8.9, carbs: 24, fat: 0.5, fiber: 8.7, portion_g: 150, serving_size: 172, serving_unit: 'cup cooked', micros: { iron_mg: 2.1, folate_mcg: 149, magnesium_mg: 70 }, cooking_states: ['cooked'] },
    { id: 'lentils', name: 'Lentils', name_es: 'Lentejas', emoji: '🫘', category: 'legume', kcal: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 7.9, portion_g: 150, serving_size: 198, serving_unit: 'cup cooked', micros: { iron_mg: 3.3, folate_mcg: 181, magnesium_mg: 36 }, cooking_states: ['cooked'] },

    // VEGETABLES
    { id: 'broccoli', name: 'Broccoli', name_es: 'Brócoli', emoji: '🥦', category: 'vegetable', kcal: 35, protein: 2.4, carbs: 7, fat: 0.4, fiber: 3.3, portion_g: 100, serving_size: 91, serving_unit: 'cup chopped', micros: { vit_c_mg: 89, calcium_mg: 47, folate_mcg: 63 }, cooking_states: ['steamed', 'raw', 'sautéed'] },
    { id: 'spinach', name: 'Spinach', name_es: 'Espinaca', emoji: '🥬', category: 'vegetable', kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, portion_g: 100, serving_size: 30, serving_unit: 'cup raw', micros: { iron_mg: 2.7, calcium_mg: 99, folate_mcg: 194, vit_a_iu: 9000 }, cooking_states: ['raw', 'sautéed'] },
    { id: 'lettuce', name: 'Lettuce', name_es: 'Lechuga', emoji: '🥬', category: 'vegetable', kcal: 15, protein: 1.4, carbs: 2.9, fat: 0.2, fiber: 1.3, portion_g: 80, serving_size: 36, serving_unit: 'cup shredded', micros: { vit_a_iu: 7000 }, cooking_states: ['raw'] },
    { id: 'tomato', name: 'Tomato', name_es: 'Tomate', emoji: '🍅', category: 'vegetable', kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, portion_g: 100, serving_size: 123, serving_unit: 'medium', micros: { vit_c_mg: 13 }, cooking_states: ['raw', 'cooked'] },
    { id: 'cucumber', name: 'Cucumber', name_es: 'Pepino', emoji: '🥒', category: 'vegetable', kcal: 16, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5, portion_g: 100, serving_size: 104, serving_unit: 'cup sliced', micros: {}, cooking_states: ['raw'] },
    { id: 'carrot', name: 'Carrot', name_es: 'Zanahoria', emoji: '🥕', category: 'vegetable', kcal: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, portion_g: 100, serving_size: 61, serving_unit: 'medium', micros: { vit_a_iu: 16000 }, cooking_states: ['raw', 'cooked'] },
    { id: 'onion', name: 'Onion', name_es: 'Cebolla', emoji: '🧅', category: 'vegetable', kcal: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7, portion_g: 50, serving_size: 110, serving_unit: 'medium', micros: {}, cooking_states: ['raw', 'sautéed'] },
    { id: 'pepper_bell', name: 'Bell Pepper', name_es: 'Pimiento', emoji: '🫑', category: 'vegetable', kcal: 31, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1, portion_g: 100, serving_size: 119, serving_unit: 'medium', micros: { vit_c_mg: 127 }, cooking_states: ['raw', 'sautéed'] },
    { id: 'zucchini', name: 'Zucchini', name_es: 'Zapallo Italiano', emoji: '🥒', category: 'vegetable', kcal: 17, protein: 1.2, carbs: 3.1, fat: 0.3, fiber: 1, portion_g: 150, serving_size: 124, serving_unit: 'cup sliced', micros: { potassium_mg: 261 }, cooking_states: ['sautéed', 'grilled'] },
    { id: 'green_beans', name: 'Green Beans', name_es: 'Vainitas', emoji: '🌿', category: 'vegetable', kcal: 31, protein: 1.8, carbs: 7, fat: 0.1, fiber: 3.4, portion_g: 100, serving_size: 100, serving_unit: 'cup', micros: { vit_c_mg: 12 }, cooking_states: ['steamed', 'sautéed'] },

    // FATS
    { id: 'avocado', name: 'Avocado', name_es: 'Palta', emoji: '🥑', category: 'fat', kcal: 160, protein: 2, carbs: 9, fat: 15, fiber: 7, sodium_mg: 7, sugar_g: 0.7, sat_fat_g: 2.1, portion_g: 100, serving_size: 201, serving_unit: 'whole', micros: { potassium_mg: 485, folate_mcg: 81 }, cooking_states: ['raw'] },
    { id: 'olive_oil', name: 'Olive Oil', name_es: 'Aceite de Oliva', emoji: '🫒', category: 'fat', kcal: 884, protein: 0, carbs: 0, fat: 100, sodium_mg: 2, sugar_g: 0, sat_fat_g: 14, portion_g: 15, serving_size: 14, serving_unit: 'tbsp', micros: { vit_e_mg: 14 }, cooking_states: ['raw'] },
    { id: 'almonds', name: 'Almonds', name_es: 'Almendras', emoji: '🌰', category: 'fat', kcal: 579, protein: 21, carbs: 22, fat: 50, fiber: 12, sodium_mg: 1, sugar_g: 4, sat_fat_g: 4, portion_g: 30, serving_size: 28, serving_unit: 'oz (23 almonds)', micros: { magnesium_mg: 270, calcium_mg: 269, iron_mg: 3.7 }, cooking_states: ['raw'] },
    { id: 'peanut_butter', name: 'Peanut Butter', name_es: 'Mantequilla de Maní', emoji: '🥜', category: 'fat', kcal: 588, protein: 25, carbs: 20, fat: 50, fiber: 6, sodium_mg: 400, sugar_g: 9, sat_fat_g: 10, portion_g: 30, serving_size: 32, serving_unit: 'tbsp (2)', micros: { magnesium_mg: 154 }, cooking_states: ['raw'] },

    // FRUITS
    { id: 'banana', name: 'Banana', name_es: 'Plátano', emoji: '🍌', category: 'fruit', kcal: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, portion_g: 120, serving_size: 118, serving_unit: 'medium', micros: { potassium_mg: 358 }, cooking_states: ['raw'] },
    { id: 'apple', name: 'Apple', name_es: 'Manzana', emoji: '🍎', category: 'fruit', kcal: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, portion_g: 180, serving_size: 182, serving_unit: 'medium', micros: { vit_c_mg: 4.6 }, cooking_states: ['raw'] },
    { id: 'orange', name: 'Orange', name_es: 'Naranja', emoji: '🍊', category: 'fruit', kcal: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4, portion_g: 150, serving_size: 131, serving_unit: 'medium', micros: { vit_c_mg: 53, folate_mcg: 30 }, cooking_states: ['raw'] },
    { id: 'strawberries', name: 'Strawberries', name_es: 'Fresas', emoji: '🍓', category: 'fruit', kcal: 32, protein: 0.7, carbs: 8, fat: 0.3, fiber: 2, portion_g: 150, serving_size: 152, serving_unit: 'cup', micros: { vit_c_mg: 58, folate_mcg: 24 }, cooking_states: ['raw'] },

    // DAIRY
    { id: 'milk', name: 'Milk (low fat)', name_es: 'Leche Descremada', emoji: '🥛', category: 'dairy', kcal: 42, protein: 3.4, carbs: 5, fat: 1, sodium_mg: 50, sugar_g: 5, sat_fat_g: 0.6, portion_g: 250, serving_size: 244, serving_unit: 'cup', micros: { calcium_mg: 125, vit_d_iu: 100 }, cooking_states: ['raw'] },
    { id: 'yogurt_greek', name: 'Greek Yogurt', name_es: 'Yogurt Griego', emoji: '🥛', category: 'dairy', kcal: 59, protein: 10, carbs: 3.6, fat: 0.7, sodium_mg: 36, sugar_g: 3, sat_fat_g: 0.2, portion_g: 170, serving_size: 170, serving_unit: 'container', micros: { calcium_mg: 110, vit_b12_mcg: 0.75 }, cooking_states: ['raw'] },
    { id: 'cheese', name: 'Cheese', name_es: 'Queso', emoji: '🧀', category: 'dairy', kcal: 402, protein: 25, carbs: 1.3, fat: 33, sodium_mg: 621, sugar_g: 0.5, sat_fat_g: 19, portion_g: 30, serving_size: 28, serving_unit: 'slice (1 oz)', micros: { calcium_mg: 721 }, cooking_states: ['raw'] },
];


export interface MealPlan {
    id: string;
    name: string;
    name_es: string;
    meals: Meal[];
    totals: MacroTotals;
    deviations?: string[];
}

export interface Meal {
    id: string;
    type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    type_es: string;
    items: MealItem[];
    totals: MacroTotals;
}

export interface MealItem {
    food: SimpleFoodItem;
    portion_g: number;
    cooking_state?: string;
    macros: MacroTotals;
}

export type WeeklyDayAssignments = {
    proteinId?: string;
    vegetableId?: string;
    wholeGrainId?: string;
    fatId?: string;
    fruitId?: string;
    dairyId?: string;
};

export interface MacroTotals {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sodium_mg?: number;
    sugar_g?: number;
    added_sugars_g?: number;
    sat_fat_g?: number;
    micros?: {
        calcium_mg?: number;
        iron_mg?: number;
        potassium_mg?: number;
        magnesium_mg?: number;
        folate_mcg?: number;
        vitamin_b12_ug?: number;
        vitamin_a_iu?: number;
        vitamin_c_mg?: number;
        vitamin_d_iu?: number;
    };
}

// Whitelist of onboarding foods (IDs from Supabase) to keep generation aligned with user-selected simple ingredients.
// Only these IDs (or a user-subset via availableFoods) are eligible for automatic generation.
const ONBOARDING_FOOD_IDS: Set<string> = new Set([
    // Proteins
    '28346', '28237', '28639', '28726', '28775', '29568', '28519', '28277', '28293', '29891', '33146', '33238', '33239',
    // Carbs / Legumes
    '30817', '30829', '29844', '32117', '31979', '29840', '29776', '29831', '32374', '30815', '30766', '30773', '32198', '30580', '30796', '30013', '30124', '30237', '30240', '30497',
    // Vegetables
    '32204', '32134', '32058', '32075', '32029', '32210', '32199', '32223', '32188', '31989', '32182', '32193', '32181', '32195', '32192', '32108', '32216', '32184', '32185', '32218', '32200', '32208', '33240',
    // Fats / Nuts / Seeds
    '31638', '29934', '29952', '29904', '29939', '29908', '29946', '32504', '30005', '27881', '28002',
    // Dairy / Plant milks
    '27800', '27829', '28160', '28124', '27824', '27820', '27828',
    // Fruits
    '31639', '31698', '31630', '31690', '31675', '31621', '31590', '31586', '31654', '31620', '31685', '31669', '31664', '31652', '31663', '31656', '31618', '31649',
    // Condiments / spices
    '32500', '29857', '32148', '32593', '33241', '33242', '33243'
]);

// Map normalized Spanish names to IDs for pantry matching by name/search_term.
const NAME_TO_ID: Record<string, string> = {
    // Proteins
    'pollo': '28346', 'carne': '28237', 'pescado': '28639', 'atun': '28726', 'atún': '28726',
    'langostinos': '28775', 'huevo': '29568', 'huevos': '29568', 'pavo': '28519', 'chancho': '28277', 'cerdo': '28277',
    'jamon': '28293', 'jamón': '28293', 'tofu': '29891', 'carne de soya': '29866', 'tempeh': '33238',
    'seitan': '33239', 'seitán': '33239', 'proteina en polvo': '33146', 'proteína en polvo': '33146',
    'pechuga': '28346', 'pechuga de pollo': '28346', 'pollo pechuga': '28346',
    'salmon': '28639', 'salmón': '28639', 'tilapia': '28639',
    // Carbs / Legumes
    'arroz': '30817', 'arroz blanco': '30817', 'arroz integral': '30829', 'brown rice': '30829', 'papa': '29844', 'papas': '29844',
    'camote': '32117', 'yuca': '31979', 'lentejas': '29840', 'lenteja': '29840', 'frijoles': '29776', 'frijol': '29776',
    'garbanzos': '29831', 'garbanzo': '29831', 'arvejas': '32374', 'arveja': '32374', 'quinua': '30815', 'quinoa': '30815',
    'pasta': '30766', 'pasta integral': '30773', 'whole grain pasta': '30773', 'fideos': '30766',
    'choclo': '32198', 'maiz': '32198', 'maíz': '32198',
    'popcorn': '30580', 'palomitas': '30580', 'avena': '30796', 'pan': '30013', 'pan integral': '30124', 'whole wheat bread': '30124',
    'tortilla': '30237', 'tortilla integral': '30240', 'whole wheat tortilla': '30240', 'cereal': '30497',
    // Vegetables
    'lechuga': '32204', 'tomate': '32134', 'tomates': '32134', 'brocoli': '32058', 'brócoli': '32058', 'brocolis': '32058',
    'zanahoria': '32075', 'zanahorias': '32075', 'espinaca': '32029', 'espinacas': '32029',
    'cebolla': '32210', 'cebollas': '32210', 'pepino': '32199', 'pepinos': '32199',
    'zapallo italiano': '32223', 'calabacin': '32223', 'calabacín': '32223', 'zucchini': '32223',
    'repollo': '32188', 'col': '32188', 'acelga': '31989', 'acelgas': '31989',
    'esparrago': '32182', 'espárrago': '32182', 'esparragos': '32182', 'espárragos': '32182',
    'apio': '32193', 'cebollin': '33240', 'cebollín': '33240', 'cebollino': '33240',
    'alcachofa': '32181', 'albahaca': '32195', 'coliflor': '32192', 'zapallo': '32108',
    'pimiento': '32216', 'pimientos': '32216', 'pimiento rojo': '32216', 'pimiento verde': '32216',
    'vainitas': '32184', 'judias verdes': '32184', 'judías verdes': '32184', 'ejotes': '32184',
    'betarraga': '32185', 'remolacha': '32185', 'rabano': '32218', 'rábano': '32218',
    'berenjena': '32200', 'berenjenas': '32200', 'champiñones': '32208', 'hongos': '32208', 'champinones': '32208',
    'ajo': '33240',
    // Fats / Nuts / Seeds
    'palta': '31638', 'aguacate': '31638', 'avocado': '31638', 'mani': '29934', 'maní': '29934', 'cacahuate': '29934',
    'mantequilla de mani': '29952', 'mantequilla de maní': '29952', 'crema de mani': '29952',
    'almendras': '29904', 'almendra': '29904', 'pecanas': '29939', 'nuez pecana': '29939',
    'cashews': '29908', 'anacardos': '29908', 'marañon': '29908', 'nueces': '29946', 'nuez': '29946',
    'aceitunas': '32504', 'olivas': '32504', 'chia': '30005', 'chía': '30005', 'semillas de chia': '30005',
    'chocolate': '27881', 'chocolate oscuro': '27881', 'cacao en polvo': '28002', 'cacao': '28002',
    'aceite de oliva': '27881', 'aceite': '27881',
    // Dairy / plant milks
    'leche': '27800', 'leche entera': '27800', 'leche descremada': '27800', 'yogurt': '27829', 'yogur': '27829',
    'yogurt griego': '27829', 'queso blanco': '28160', 'queso fresco': '28160', 'queso amarillo': '28124',
    'queso cheddar': '28124', 'queso': '28160', 'bebida de almendras': '27824', 'leche de almendras': '27824',
    'bebida de soya': '27820', 'leche de soya': '27820', 'bebida de coco': '27828', 'leche de coco': '27828',
    // Fruits
    'platano': '31639', 'plátano': '31639', 'banana': '31639', 'banano': '31639',
    'fresas': '31698', 'fresa': '31698', 'frutillas': '31698', 'manzana': '31630', 'manzanas': '31630',
    'arandanos': '31690', 'arándanos': '31690', 'blueberries': '31690', 'mora azul': '31690',
    'pina': '31675', 'piña': '31675', 'anana': '31675', 'ananás': '31675',
    'papaya': '31621', 'mandarina': '31590', 'mandarinas': '31590', 'naranja': '31586', 'naranjas': '31586',
    'kiwi': '31654', 'kiwis': '31654', 'mango': '31620', 'mangos': '31620',
    'sandia': '31685', 'sandía': '31685', 'patilla': '31685', 'pera': '31669', 'peras': '31669',
    'durazno': '31664', 'duraznos': '31664', 'melocoton': '31664', 'melocotón': '31664',
    'uvas': '31652', 'uva': '31652', 'granadilla': '31663', 'maracuya': '31663', 'maracuyá': '31663',
    'melon': '31656', 'melón': '31656', 'datiles': '31618', 'dátiles': '31618', 'pitahaya': '31649',
    // Condiments
    'mostaza': '32500', 'sillao': '29857', 'salsa de soya': '29857', 'salsa de tomate': '32148', 'ketchup': '32148',
    'vinagre': '32593',
    'curry': '32593', 'pimenton': '33241', 'pimentón': '33241', 'paprika': '33241',
    'curcuma': '33242', 'cúrcuma': '33242', 'canela': '33243',
    'oregano': '32195', 'orégano': '32195'
};

const resolvePantryTerms = (userPantryTerms?: string[]) => {
    const ids = new Set<string>();
    const unmatched: string[] = [];
    if (!userPantryTerms || userPantryTerms.length === 0) {
        return { ids, unmatched };
    }
    const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    userPantryTerms.forEach(raw => {
        if (raw === null || raw === undefined) return;
        const maybeId = String(raw);
        if (/^\d+$/.test(maybeId)) {
            ids.add(maybeId);
            return;
        }
        const mapped = NAME_TO_ID[norm(maybeId)] || fuzzyMatchPantryTerm(maybeId, NAME_TO_ID);
        if (mapped) {
            ids.add(mapped);
        } else {
            unmatched.push(maybeId);
        }
    });
    return { ids, unmatched };
};

// RDA Profile for sex/age-specific micronutrient targets
interface RDAProfile {
    gender?: 'male' | 'female' | string;
    age?: number;
    lifeStage?: 'pregnancy' | 'lactation' | 'menopause' | 'standard' | string;
}

// Get RDA targets based on demographic profile
function getRDATargets(profile?: RDAProfile): Record<string, number> {
    const isFemale = profile?.gender === 'female';
    const age = profile?.age || 30;
    const lifeStage = profile?.lifeStage || 'standard';

    // Pregnancy/Lactation special cases
    if (lifeStage === 'pregnancy') {
        return {
            calcium_mg: 1000,
            iron_mg: 27,         // Much higher in pregnancy
            potassium_mg: 2900,
            magnesium_mg: 400,
            folate_mcg: 600,     // Critical for neural tube
            vitamin_b12_ug: 2.6,
            vitamin_a_iu: 2567,  // ~770 mcg RAE
            vitamin_c_mg: 85,
            vitamin_d_iu: 600,
        };
    }
    if (lifeStage === 'lactation') {
        return {
            calcium_mg: 1000,
            iron_mg: 9,
            potassium_mg: 2800,
            magnesium_mg: 360,
            folate_mcg: 500,
            vitamin_b12_ug: 2.8,
            vitamin_a_iu: 4333,  // ~1300 mcg RAE (higher for milk)
            vitamin_c_mg: 120,
            vitamin_d_iu: 600,
        };
    }

    // Age-specific adjustments
    if (age >= 51) {
        // Adults 51+
        return {
            calcium_mg: 1200,    // Higher for bone health
            iron_mg: isFemale ? 8 : 8, // Post-menopause women need less
            potassium_mg: 4700,
            magnesium_mg: isFemale ? 320 : 420,
            folate_mcg: 400,
            vitamin_b12_ug: 2.4,
            vitamin_a_iu: isFemale ? 2333 : 3000, // ~700/900 mcg RAE
            vitamin_c_mg: isFemale ? 75 : 90,
            vitamin_d_iu: 800,   // Higher for 51+
        };
    }

    // Standard adults 19-50
    return {
        calcium_mg: 1000,
        iron_mg: isFemale ? 18 : 8, // Pre-menopausal women need more
        potassium_mg: isFemale ? 2600 : 3400,
        magnesium_mg: isFemale ? 310 : 400,
        folate_mcg: 400,
        vitamin_b12_ug: 2.4,
        vitamin_a_iu: isFemale ? 2333 : 3000, // ~700/900 mcg RAE
        vitamin_c_mg: isFemale ? 75 : 90,
        vitamin_d_iu: 600,
    };
}

// Fuzzy matching utility for pantry terms that don't match exactly
function fuzzyMatchPantryTerm(term: string, nameToIdMap: Record<string, string>): string | undefined {
    const normTerm = term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    // 1. Exact match
    if (nameToIdMap[normTerm]) return nameToIdMap[normTerm];

    // 2. Partial match (term contains key or key contains term)
    for (const [key, id] of Object.entries(nameToIdMap)) {
        if (normTerm.includes(key) || key.includes(normTerm)) {
            return id;
        }
    }

    // 3. Word-based matching (any word in term matches any key)
    const termWords = normTerm.split(/\s+/);
    for (const word of termWords) {
        if (word.length < 3) continue; // Skip short words
        for (const [key, id] of Object.entries(nameToIdMap)) {
            if (key.includes(word) || word.includes(key)) {
                return id;
            }
        }
    }

    return undefined;
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

// If fiber is missing in the DB, estimate it from macros/category to keep USDA guardrails meaningful.
function estimateFiberPer100g(food: SimpleFoodItem): number {
    const carbs = food.carbs || 0;
    const kcal = food.kcal || 0;
    const nameMix = `${food.name || ''} ${food.name_es || ''}`.toLowerCase();

    // Helper: detect whole grains / high-fiber staples
    const isWholeGrain = /integral|whole|bran|oat|avena|quinoa|quinua|trigo|centeno/.test(nameMix);
    const isRoot = /papa|potato|camote|yuca|cassava|sweet potato|taro/.test(nameMix);
    const isNutSeed = /almond|almendra|peanut|man[ií]|nut|nuez|chia|linaza|sesame|ajonjol[ií]/.test(nameMix);

    switch (food.category) {
        case 'legume': {
            // Legumes typically 6–9 g/100g; scale with carbs to avoid over/under shooting.
            return clamp(carbs * 0.35, 4, 9);
        }
        case 'vegetable': {
            // Non-starchy veggies cluster 1.5–4 g/100g.
            return clamp(carbs * 0.4, 1.5, 5);
        }
        case 'fruit': {
            // Fruits: 1.5–4.5 g/100g depending on pulp/peel.
            return clamp(carbs * 0.25, 1.5, 4.5);
        }
        case 'carb': {
            // Grain/tuber carbs: base fiber proportional to carbs; boost if whole-grain.
            const base = clamp(carbs * 0.1, 0.5, 3.5);
            const bonus = isWholeGrain ? 1.5 : isRoot ? 0.5 : 0;
            return clamp(base + bonus, 0.5, 6);
        }
        case 'fat': {
            // Nuts/seeds carry fiber; oils do not.
            if (isNutSeed) return clamp(kcal * 0.01, 2, 12); // ~2–12 g depending on density
            return 0;
        }
        default:
            return 0;
    }
}

function resolveFiberPer100g(food: SimpleFoodItem): number {
    const dbFiber = food.fiber ?? 0;
    if (dbFiber > 0) return dbFiber;
    return estimateFiberPer100g(food);
}

// Calculate macros for a portion
function calculateItemMacros(food: SimpleFoodItem, portion_g: number): MacroTotals {
    const factor = portion_g / 100;
    const fiberPer100 = resolveFiberPer100g(food);
    return {
        kcal: Math.round(food.kcal * factor),
        protein: Math.round(food.protein * factor * 10) / 10,
        carbs: Math.round(food.carbs * factor * 10) / 10,
        fat: Math.round(food.fat * factor * 10) / 10,
        fiber: Math.round(fiberPer100 * factor * 10) / 10,
        sodium_mg: food.sodium_mg ? Math.round(food.sodium_mg * factor) : 0,
        sugar_g: food.sugar_g ? Math.round(food.sugar_g * factor * 10) / 10 : 0,
        added_sugars_g: food.added_sugars_g ? Math.round(food.added_sugars_g * factor * 10) / 10 : 0,
        sat_fat_g: food.sat_fat_g ? Math.round(food.sat_fat_g * factor * 10) / 10 : 0,
        micros: {
            calcium_mg: food.micros?.calcium_mg ? Math.round(food.micros.calcium_mg * factor * 10) / 10 : 0,
            iron_mg: food.micros?.iron_mg ? Math.round(food.micros.iron_mg * factor * 10) / 10 : 0,
            potassium_mg: food.micros?.potassium_mg ? Math.round(food.micros.potassium_mg * factor * 10) / 10 : 0,
            magnesium_mg: food.micros?.magnesium_mg ? Math.round(food.micros.magnesium_mg * factor * 10) / 10 : 0,
            folate_mcg: food.micros?.folate_mcg ? Math.round(food.micros.folate_mcg * factor * 10) / 10 : 0,
            vitamin_b12_ug: food.micros?.vit_b12_mcg
                ? Math.round(food.micros.vit_b12_mcg * factor * 10) / 10
                : (food.micros as any)?.vitamin_b12_ug
                    ? Math.round(((food.micros as any).vitamin_b12_ug as number) * factor * 10) / 10
                    : 0,
            vitamin_a_iu: food.micros?.vit_a_iu
                ? Math.round(food.micros.vit_a_iu * factor * 10) / 10
                : 0,
            vitamin_c_mg: food.micros?.vit_c_mg ? Math.round(food.micros.vit_c_mg * factor * 10) / 10 : 0,
            vitamin_d_iu: food.micros?.vit_d_iu
                ? Math.round(food.micros.vit_d_iu * factor * 10) / 10
                : 0,
        }
    };
}

const getPortionBoundsForFood = (food: SimpleFoodItem) => {
    const baseServing = food.serving_equiv_grams || food.serving_size || food.portion_g || 100;
    let minG = 30;
    let maxG = 300;
    const ensureBounds = () => {
        if (maxG < minG) maxG = minG;
    };
    switch (food.category) {
        case 'fat': {
            const base = Math.max(5, Math.round(baseServing));
            minG = Math.max(5, Math.round(base * 0.6));
            maxG = Math.min(120, Math.round(base * 2));
            break;
        }
        case 'condiment':
            minG = 2; maxG = 15; break;
        case 'vegetable': {
            const base = Math.round(baseServing);
            minG = Math.max(60, Math.round(base * 0.8));
            maxG = Math.min(250, Math.round(base * 3));
            break;
        }
        case 'fruit': {
            const base = Math.round(baseServing);
            minG = Math.max(100, Math.round(base * 0.8));
            maxG = Math.min(250, Math.round(base * 2));
            break;
        }
        case 'beverage':
        case 'dairy':
            minG = 150; maxG = 300; break;
        case 'legume':
        case 'carb': {
            const whole = isWholeGrain(food);
            const base = Math.round(baseServing);
            if (whole) {
                minG = Math.max(60, Math.round(base * 0.6));
                maxG = Math.min(250, Math.round(base * 1.8));
            } else {
                minG = Math.max(80, Math.round(base * 0.7));
                maxG = Math.min(260, Math.round(base * 1.6));
            }
            break;
        }
        case 'protein':
            minG = 120; maxG = 200; break;
        default:
            minG = Math.max(50, Math.round(baseServing * 0.8));
            maxG = Math.min(240, Math.round(baseServing * 2));
            break;
    }
    ensureBounds();
    return { minG, maxG };
};

const adjustToServingBounds = (food: SimpleFoodItem, grams: number): number => {
    const { minG, maxG } = getPortionBoundsForFood(food);
    return Math.max(minG, Math.min(maxG, grams));
};

const resolveMicroPer100g = (food: SimpleFoodItem, key: MicroKey): number => {
    const micros = food.micros || {};
    switch (key) {
        case 'vitamin_b12_ug':
            return micros.vit_b12_mcg || (micros as any).vitamin_b12_ug || 0;
        case 'vitamin_a_iu':
            return micros.vit_a_iu || 0;
        case 'vitamin_c_mg':
            return micros.vit_c_mg || 0;
        case 'vitamin_d_iu':
            return micros.vit_d_iu || 0;
        default:
            return (micros as any)[key] || 0;
    }
};

const estimateServingGramsForGroup = (
    food: SimpleFoodItem,
    group: 'vegetables' | 'fruits' | 'dairy' | 'protein' | 'wholeGrains' | 'healthyFats'
): number => {
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
    const defaults: Record<string, number> = {
        vegetables: 90,
        fruits: 150,
        dairy: 244,
        protein: 85,
        wholeGrains: 30,
        healthyFats: 5,
    };
    return defaults[group] || 100;
};

const servingsForGroup = (
    food: SimpleFoodItem,
    grams: number,
    group: 'vegetables' | 'fruits' | 'dairy' | 'protein' | 'wholeGrains' | 'healthyFats'
): number => {
    if (group === 'healthyFats') {
        const fatGrams = (food.fat || 0) * grams / 100;
        return fatGrams > 0 ? fatGrams / 5 : 0;
    }
    const base = estimateServingGramsForGroup(food, group);
    return grams / base;
};

const assessPantryFeasibility = (
    foods: SimpleFoodItem[],
    numMeals: number,
    targetCalories: number,
    dietType: string,
    conditions: string[],
    rdaProfile?: RDAProfile
): { ok: boolean; issues: string[] } => {
    const issues: string[] = [];
    const servingTargets = getDietAdjustedServingTargets(targetCalories, dietType, conditions);
    const usdaMode = getUSDAComplianceMode(dietType, conditions);
    const normalizedDiet = normalizeDietType(dietType);
    if (servingTargets) {
        const maxItemsPerMeal = 6;
        const groupDefs: Array<{
            key: keyof typeof servingTargets;
            label: string;
            filter: (f: SimpleFoodItem) => boolean;
            group: 'vegetables' | 'fruits' | 'dairy' | 'protein' | 'wholeGrains' | 'healthyFats';
        }> = [
                { key: 'vegetables', label: 'verduras', filter: f => getFunctionalCategory(f) === 'vegetable', group: 'vegetables' },
                { key: 'fruits', label: 'frutas', filter: f => getFunctionalCategory(f) === 'fruit', group: 'fruits' },
                { key: 'dairy', label: 'lácteos', filter: f => getFunctionalCategory(f) === 'dairy' || getFunctionalCategory(f) === 'beverage', group: 'dairy' },
                { key: 'protein', label: 'proteínas', filter: f => getFunctionalCategory(f) === 'protein' || getFunctionalCategory(f) === 'legume', group: 'protein' },
                { key: 'wholeGrains', label: 'granos integrales', filter: f => isWholeGrain(f), group: 'wholeGrains' },
                { key: 'healthyFats', label: 'grasas saludables', filter: f => getFunctionalCategory(f) === 'fat', group: 'healthyFats' },
            ];

        groupDefs.forEach(def => {
            if (servingTargets[def.key].min <= 0) return;
            const candidates = foods.filter(def.filter);
            if (candidates.length === 0) {
                issues.push(`No hay alimentos para ${def.label}`);
                return;
            }
            const servingsPerFood = candidates.map(f => {
                const maxG = getPortionBoundsForFood(f).maxG;
                return servingsForGroup(f, maxG, def.group);
            }).sort((a, b) => b - a);
            const maxPerMeal = servingsPerFood.slice(0, maxItemsPerMeal).reduce((sum, v) => sum + v, 0);
            const maxDaily = maxPerMeal * Math.max(numMeals, 1);
            if (maxDaily < servingTargets[def.key].min) {
                issues.push(`No alcanzan ${def.label}: máximo ${maxDaily.toFixed(1)} vs objetivo ${servingTargets[def.key].min}`);
            }
        });
    }

    if (rdaProfile) {
        const targets = getRDATargets(rdaProfile);
        const maxItemsPerMeal = 6;
        MICRO_KEYS.forEach(key => {
            const target = targets[key] || 0;
            if (!target) return;
            const perFood = foods.map(f => {
                const maxG = getPortionBoundsForFood(f).maxG;
                const per100 = resolveMicroPer100g(f, key);
                return (per100 * maxG) / 100;
            }).filter(v => v > 0).sort((a, b) => b - a);
            const coverage = perFood.length / Math.max(foods.length, 1);
            if (coverage < MICRO_DATA_COVERAGE_MIN) {
                console.warn(`  ⚠️ Datos insuficientes para validar ${key} (${Math.round(coverage * 100)}%)`);
                return;
            }
            const maxPerMeal = perFood.slice(0, maxItemsPerMeal).reduce((sum, v) => sum + v, 0);
            const maxDaily = maxPerMeal * Math.max(numMeals, 1);
            if (maxDaily < target * MICRO_MIN_RATIO) {
                issues.push(`No alcanza ${key}: máximo ${Math.round(maxDaily)} < objetivo ${target}`);
            }
        });
    }

    return { ok: issues.length === 0, issues };
};

const applyDietFiltersForFeasibility = (
    foods: SimpleFoodItem[],
    dietType: string,
    conditions: string[]
): SimpleFoodItem[] => {
    let filtered = [...foods];
    if (dietType === 'keto') {
        filtered = filtered.filter(f => {
            const cat = getFunctionalCategory(f);
            return cat !== 'carb' &&
                cat !== 'legume' &&
                !(cat === 'fruit' && (f.carbs || 0) > 10) &&
                !(cat === 'dairy' && (f.carbs || 0) > 5);
        });
    }
    if (dietType === 'vegan') {
        filtered = filtered.filter(f => {
            const cat = getFunctionalCategory(f);
            return !['protein', 'dairy'].includes(cat) ||
                cat === 'legume' ||
                f.name.toLowerCase().includes('bean') ||
                f.name.toLowerCase().includes('lentil') ||
                f.name.toLowerCase().includes('tofu') ||
                f.name.toLowerCase().includes('chickpea');
        });
    }
    if (dietType === 'vegetarian') {
        filtered = filtered.filter(f => {
            const cat = getFunctionalCategory(f);
            if (cat === 'protein') {
                const nm = f.name.toLowerCase();
                return nm.includes('egg') || nm.includes('tofu') || nm.includes('bean') || nm.includes('lentil') || nm.includes('chickpea');
            }
            return true;
        });
    }
    if (dietType === 'diabetes_friendly' || conditions.includes('diabetes_type_2')) {
        filtered = filtered.filter(f =>
            !(getFunctionalCategory(f) === 'carb' && (f.carbs || 0) > 25 && !(f.fiber && f.fiber > 3))
        );
    }
    return filtered;
};

const hasDuplicateIds = (mealItems: { food: SimpleFoodItem }[]): boolean => {
    const seen = new Set<string>();
    for (const mi of mealItems) {
        const id = String(mi.food.id);
        if (seen.has(id)) return true;
        seen.add(id);
    }
    return false;
};

// Sum macros from multiple items
function sumMacros(items: MacroTotals[]): MacroTotals {
    return items.reduce((acc, item) => ({
        kcal: acc.kcal + item.kcal,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
        fiber: (acc.fiber || 0) + (item.fiber || 0),
        sodium_mg: (acc.sodium_mg || 0) + (item.sodium_mg || 0),
        sugar_g: (acc.sugar_g || 0) + (item.sugar_g || 0),
        added_sugars_g: (acc.added_sugars_g || 0) + (item.added_sugars_g || 0),
        sat_fat_g: (acc.sat_fat_g || 0) + (item.sat_fat_g || 0),
        micros: {
            calcium_mg: (acc.micros?.calcium_mg || 0) + (item.micros?.calcium_mg || 0),
            iron_mg: (acc.micros?.iron_mg || 0) + (item.micros?.iron_mg || 0),
            potassium_mg: (acc.micros?.potassium_mg || 0) + (item.micros?.potassium_mg || 0),
            magnesium_mg: (acc.micros?.magnesium_mg || 0) + (item.micros?.magnesium_mg || 0),
            folate_mcg: (acc.micros?.folate_mcg || 0) + (item.micros?.folate_mcg || 0),
            vitamin_b12_ug: (acc.micros?.vitamin_b12_ug || 0) + (item.micros?.vitamin_b12_ug || 0),
            vitamin_a_iu: (acc.micros?.vitamin_a_iu || 0) + (item.micros?.vitamin_a_iu || 0),
            vitamin_c_mg: (acc.micros?.vitamin_c_mg || 0) + (item.micros?.vitamin_c_mg || 0),
            vitamin_d_iu: (acc.micros?.vitamin_d_iu || 0) + (item.micros?.vitamin_d_iu || 0),
        }
    }), { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium_mg: 0, sugar_g: 0, added_sugars_g: 0, sat_fat_g: 0, micros: {} });
}

// Get foods by category
export function getFoodsByCategory(category: SimpleFoodItem['category']): SimpleFoodItem[] {
    return SIMPLE_FOODS.filter(f => f.category === category);
}

// Fetch foods from Supabase database with smart ordering
// Falls back to SIMPLE_FOODS if DB unavailable
export async function getFoodsFromDB(
    category: 'protein' | 'carb' | 'vegetable' | 'fat' | 'fruit' | 'dairy',
    limit: number = 20,
    nutrientPriorities: string[] = [],
    mealContext: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null = null
): Promise<SimpleFoodItem[]> {
    // Check cache first
    const cacheKey = `${category}_${mealContext || 'all'}`;
    const cached = foodCache.get(cacheKey);
    if (cached) {
        console.log(`✅ Cache hit: ${cacheKey}`);
        return cached.slice(0, limit);
    }

    try {
        // Use relative path to avoid path-alias resolution issues when running via tsx
        const { createClient } = await import('./supabase/client');
        const supabase = createClient();

        const categoryMap: Record<string, string[]> = {
            'protein': ['proteina', 'carne', 'pescado', 'mariscos', 'huevo'],
            'carb': ['carbohidrato', 'grano', 'cereal', 'pan', 'pasta', 'arroz'],
            'vegetable': ['verdura', 'vegetal', 'hortaliza'],
            'fat': ['grasa', 'aceite', 'nuez', 'semilla'],
            'fruit': ['fruta'],
            'dairy': ['lacteo', 'leche', 'queso', 'yogurt']
        };

        const categories = categoryMap[category] || [category];

        let query = supabase
            .from('foods')
            .select('*');

        // 1. Context Filter (AI Powered)
        // If we know it's "breakfast", only get foods tagged for breakfast
        if (mealContext) {
            // Using 'cs' (contains) for array column
            // We use standard english keys: ['breakfast', 'lunch', 'dinner', 'snack']
            query = query.contains('meal_times', [mealContext]);
        }

        // 2. Category Filter
        const categoryConditions = categories.map(c => `culinary_category.ilike.%${c}%`).join(',');
        query = query.or(categoryConditions);

        // 3. Smart Sorting
        // Priority 1: Common Staples (TRUE first)
        // Priority 2: Simple Ingredients (TRUE first)
        // Priority 3: Custom Priority (Ascending)
        query = query
            .order('is_common_staple', { ascending: false, nullsFirst: false })
            .order('is_simple_ingredient', { ascending: false, nullsFirst: false })
            .order('priority', { ascending: true, nullsFirst: true })
            .limit(limit * 2);

        const { data, error } = await query;

        if (error || !data || data.length === 0) {
            console.warn('DB fetch failed or empty for', category, mealContext);
            return SIMPLE_FOODS.filter(f => f.category === category).slice(0, limit);
        }

        // Transform
        const transformed: SimpleFoodItem[] = data.map(d => {
            let sSize = d.serving_size;
            let sUnit = d.serving_unit;
            // (Smart defaults logic omitted for brevity, keeping existing if needed, 
            // but relying more on DB data now)

            // Name Cleaning (Remove USDA clutter)
            let cleanName = d.name_es || d.name;
            cleanName = cleanName.split(',')[0]; // Take first part "Pollo" instead of "Pollo, crudo, sin piel"
            if (cleanName.length > 30) cleanName = cleanName.substring(0, 30) + '...';

            return {
                id: String(d.id),
                name: d.name,
                name_es: cleanName, // Use cleaned name
                emoji: d.emoji || '🍽️',
                category: category,
                kcal: d.kcal_per_100g || 0,
                protein: d.protein_g_per_100g || 0,
                carbs: d.carbs_g_per_100g || 0,
                fat: d.fat_g_per_100g || 0,
                portion_g: 100,
                serving_size: sSize || 100,
                serving_unit: sUnit || 'g',
                meal_times: d.meal_times || [],
                is_common_staple: d.is_common_staple || false,
                micros: {
                    iron_mg: d.iron_mg || 0,
                    calcium_mg: d.calcium_mg || 0,
                    magnesium_mg: d.magnesium_mg || 0,
                    zinc_mg: d.zinc_mg || 0,
                    potassium_mg: d.potassium_mg || 0,
                    vit_c_mg: d.vitamin_c_mg || 0,
                    vit_d_iu: d.vitamin_d_iu || 0,
                    vit_a_iu: d.vitamin_a_iu || 0,
                    vit_b12_mcg: d.vitamin_b12_ug || 0,
                    folate_mcg: d.folate_ug || 0,
                    fiber: d.fiber_g || 0,
                }
            };
        });

        // Cache the results
        foodCache.set(cacheKey, transformed);
        console.log(`💾 Cached: ${cacheKey} (${transformed.length} items)`);

        return transformed;

    } catch (err) {
        console.warn('getFoodsFromDB crash:', err);
        return SIMPLE_FOODS.filter(f => f.category === category).slice(0, limit);
    }
}

// Helper to rank foods based on micronutrient priorities
function rankFoodsByNutrients(foods: SimpleFoodItem[], priorities: string[]): SimpleFoodItem[] {
    if (!priorities || priorities.length === 0) return foods;

    // Clone to sort
    return [...foods].sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;

        priorities.forEach(nutrient => {
            // @ts-ignore - access dynamic property
            const valA = a.micros?.[nutrient] || 0;
            // @ts-ignore
            const valB = b.micros?.[nutrient] || 0;
            scoreA += valA;
            scoreB += valB;
        });

        // Add a small random jitter to avoid identical sorting for same scores
        return (scoreB - scoreA) || (Math.random() - 0.5);
    });
}

// Variety Manager - Prevents food repetition by ID AND by ROLE
// Now tracks both individual foods AND nutritional roles to prevent same-category repetition
class VarietyManager {
    private usedFoods: Map<string, Date> = new Map();
    private usedRoles: Map<string, Date> = new Map(); // KEY: "mealType_role" (e.g., "lunch_primaryProtein")
    private defaultCooldown: number;

    constructor(cooldownHours: number = 12) {
        this.defaultCooldown = cooldownHours;
    }

    markUsed(foodId: string, mealType?: string, assignedRole?: string): void {
        // Track by food ID
        this.usedFoods.set(foodId, new Date());

        // Also track by ROLE within this meal type to prevent same role in same meal
        if (assignedRole && mealType) {
            const roleKey = `${mealType}_${assignedRole}`;
            this.usedRoles.set(roleKey, new Date());
            console.log(`[VARIETY] Marked role used: ${roleKey} for food ${foodId}`);
        }
    }

    shouldSkip(foodId: string, cooldownHours: number = 12): boolean {
        const lastUsed = this.usedFoods.get(foodId);
        if (!lastUsed) return false;

        const hoursSince = (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60);
        return hoursSince < cooldownHours;
    }

    // NEW: Check if a role has been used recently in this meal type
    shouldSkipByRole(mealType: string, role: string, cooldownHours: number = 0): boolean {
        const roleKey = `${mealType}_${role}`;
        const lastUsed = this.usedRoles.get(roleKey);
        if (!lastUsed) return false;

        const hoursSince = (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60);
        const shouldSkip = hoursSince < cooldownHours;

        if (shouldSkip) {
            console.log(`[VARIETY] Skipping role ${roleKey} - used ${hoursSince.toFixed(1)}h ago`);
        }
        return shouldSkip;
    }

    getAvailableFoods(foods: SimpleFoodItem[], cooldownHours?: number): SimpleFoodItem[] {
        const cd = typeof cooldownHours === 'number' ? cooldownHours : this.defaultCooldown;
        return foods.filter(f => !this.shouldSkip(f.id, cd));
    }

    getRoleStatus(mealType: string, role: string): string {
        const roleKey = `${mealType}_${role}`;
        const lastUsed = this.usedRoles.get(roleKey);
        if (!lastUsed) return 'AVAILABLE';

        const hoursSince = (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60);
        return `USED ${hoursSince.toFixed(1)}h ago`;
    }

    reset(): void {
        this.usedFoods.clear();
        this.usedRoles.clear();
    }
}

// Format meal plan as readable text
export function formatMealPlan(plan: MealPlan): string {
    let output = `📋 ${plan.name_es}\n`;
    output += `═══════════════════════════════════\n\n`;

    for (const meal of plan.meals) {
        output += `🍽️ ${meal.type_es}\n`;
        output += `───────────────────────────────────\n`;

        for (const item of meal.items) {
            const state = item.cooking_state ? ` (${item.cooking_state})` : '';
            output += `  ${item.food.emoji} ${item.food.name_es}${state} - ${item.portion_g}g\n`;
            output += `     ${item.macros.kcal} kcal | P: ${item.macros.protein}g | C: ${item.macros.carbs}g | G: ${item.macros.fat}g\n`;
        }

        output += `  ─────────\n`;
        output += `  Total: ${meal.totals.kcal} kcal | P: ${meal.totals.protein}g | C: ${meal.totals.carbs}g | G: ${meal.totals.fat}g\n\n`;
    }

    output += `═══════════════════════════════════\n`;
    output += `📊 TOTAL DEL DÍA\n`;
    output += `  🔥 ${plan.totals.kcal} kcal\n`;
    output += `  🥩 Proteína: ${plan.totals.protein}g\n`;
    output += `  🍞 Carbohidratos: ${plan.totals.carbs}g\n`;
    output += `  🥑 Grasa: ${plan.totals.fat}g\n`;

    return output;
}

export interface WeeklyMealPlan {
    id: string;
    days: MealPlan[];
    week_totals: MacroTotals;
}

// ============================================================
// ASYNC VERSIONS - USE DATABASE INSTEAD OF HARDCODED FOODS
// ============================================================

// UNIFIED QUERY: Pre-load ALL food categories from Supabase in 1 single query
async function loadFoodsFromDB(nutrientPriorities: string[] = [], requiredFoodIds: string[] = []): Promise<SimpleFoodItem[]> {
    try {
        // Use relative path to avoid path-alias resolution issues when running via tsx
        const { createClient } = await import('./supabase/client');
        const supabase = createClient();

        // ✅ UNIFIED QUERY: Load ALL foods in 1 call (instead of 6 separate queries)
        // PRIORITIZATION: Tier 1 (Whole Foods) > Tier 2 (Processed). Tier 3 (Restaurant) excluded from auto-generation.
        const { data, error } = await supabase
            .from('foods')
            .select('*')
            .eq('is_simple_ingredient', true)
            //.eq('is_common_staple', true) // Relaxed to allow more variety if fits Tier 1/2
            .in('food_tier', [1, 2])     // Only Tier 1 & 2 allowed for generation
            .order('priority', { ascending: true }) // CRITICAL: Prefer "Clean" foods (Prio 1) over standard DB
            .order('food_tier', { ascending: true })
            .order('food_tier', { ascending: true }) // Priority: Tier 1 first
            .order('priority', { ascending: true, nullsFirst: true })
            .limit(600); // Enough to cover all categories with variety

        if (error || !data || data.length === 0) {
            console.warn('Unified food fetch failed, using fallback');
            return SIMPLE_FOODS;
        }

        console.log(`✅ Loaded ${data.length} foods in 1 unified query (vs 6 separate)`);

        const resolveCategoryFromUsdaGroup = (groupRaw: string): SimpleFoodItem['category'] | null => {
            const g = (groupRaw || '').toLowerCase();
            if (!g) return null;
            if (g.includes('whole_grain') || g.includes('refined_grain') || g.includes('grain')) return 'carb';
            if (g.includes('vegetable')) return 'vegetable';
            if (g.includes('fruit')) return 'fruit';
            if (g.includes('dairy')) return 'dairy';
            if (g.includes('legume') || g.includes('bean') || g.includes('pulse')) return 'legume';
            if (g.includes('protein') || g.includes('meat') || g.includes('seafood') || g.includes('poultry')) return 'protein';
            if (g.includes('fat') || g.includes('oil')) return 'fat';
            if (g.includes('condiment') || g.includes('sauce')) return 'condiment';
            if (g.includes('beverage')) return 'beverage';
            return null;
        };

        const mapRow = (d: any): SimpleFoodItem => {
            // Detect category based on culinary_category field
            // Detect category based on MULTIPLE fields (category, category_es, culinary_category)
            let category: SimpleFoodItem['category'] | 'other' = 'other'; // Change default to 'other' to avoid protein pollution
            const dbUsdaGroup = d.usda_group || d.usda_food_group || '';
            const usdaCategory = resolveCategoryFromUsdaGroup(dbUsdaGroup);

            // Combine all category fields for search
            const catSearch = (
                (d.category || '') + ' ' +
                (d.category_es || '') + ' ' +
                (d.culinary_category || '') + ' ' +
                (d.name || '') + ' ' +
                (d.name_es || '')
            ).toLowerCase();

            const isLegume = catSearch.includes('legumbre') || catSearch.includes('bean') || catSearch.includes('lentil') || catSearch.includes('chickpea') || catSearch.includes('garbanzo') || catSearch.includes('frijol') || catSearch.includes('frejol') || catSearch.includes('alubia') || catSearch.includes('haba') || catSearch.includes('pallar');

            if (usdaCategory) {
                category = usdaCategory;

                // CRITICAL OVERRIDE: High-fat fruits/veg must be 'fat' for logic to work (Avocado, Olives, Coconut)
                if (catSearch.includes('avocado') || catSearch.includes('palta') ||
                    catSearch.includes('olive') || catSearch.includes('aceituna') ||
                    catSearch.includes('coconut') || catSearch.includes('coco')) {
                    category = 'fat';
                }

                if (usdaCategory === 'carb' && isLegume) {
                    category = 'legume';
                }
            } else if (catSearch.includes('proteina') || catSearch.includes('carne') || catSearch.includes('pescado') || catSearch.includes('mariscos') || catSearch.includes('huevo') || catSearch.includes('chicken') || catSearch.includes('beef') || catSearch.includes('pork') || catSearch.includes('turkey') || catSearch.includes('fish') || catSearch.includes('meat') || catSearch.includes('egg') || catSearch.includes('tofu')) {
                category = 'protein';
            } else if (isLegume) {
                category = 'legume';
            } else if (catSearch.includes('carbohidrato') || catSearch.includes('grano') || catSearch.includes('cereal') || catSearch.includes('pan') || catSearch.includes('pasta') || catSearch.includes('arroz') || catSearch.includes('rice') || catSearch.includes('bread') || catSearch.includes('oat') || catSearch.includes('quinoa') || catSearch.includes('quinua') || catSearch.includes('kiwicha') || catSearch.includes('potato') || catSearch.includes('camote') || catSearch.includes('yuca') || catSearch.includes('cassava') || catSearch.includes('papa')) {
                category = 'carb';
            } else if (catSearch.includes('verdura') || catSearch.includes('vegetal') || catSearch.includes('hortaliza') || catSearch.includes('vegetable') || catSearch.includes('spinach') || catSearch.includes('broccoli') || catSearch.includes('lettuce') || catSearch.includes('zucchini') || catSearch.includes('tomato')) {
                category = 'vegetable';
            } else if (catSearch.includes('grasa') || catSearch.includes('aceite') || catSearch.includes('nuez') || catSearch.includes('semilla') || catSearch.includes('oil') || catSearch.includes('nut') || catSearch.includes('seed') || catSearch.includes('avocado') || catSearch.includes('palta')) {
                category = 'fat';
            } else if (catSearch.includes('fruta') || catSearch.includes('fruit') || catSearch.includes('apple') || catSearch.includes('banana') || catSearch.includes('berry') || catSearch.includes('orange')) {
                category = 'fruit';
            } else if (catSearch.includes('lacteo') || catSearch.includes('leche') || catSearch.includes('queso') || catSearch.includes('yogurt') || catSearch.includes('dairy') || catSearch.includes('milk') || catSearch.includes('cheese')) {
                category = 'dairy';
            } else {
                // Fallback: Macro-based classification if text fails
                // (Useful for "NFS" items or poorly named ones)
                const p = (d.protein_g_per_100g || 0) * 4;
                const c = (d.carbs_g_per_100g || 0) * 4;
                const f = (d.fat_g_per_100g || 0) * 9;

                if (p > c && p > f && p > 50) category = 'protein'; // Only if significant calories
                else if (c > p && c > f) category = 'carb'; // Broad carb check (includes fruit/veg, refinement needed?)
                // Refinements:
                if (category === 'carb') {
                    if ((d.sugar_g || d.sugars_g || 0) > 15) category = 'fruit'; // High sugar -> Fruit-ish
                    if ((d.fiber_g || d.fiber_g_per_100g || 0) > 2 && (d.kcal_per_100g || 0) < 60) category = 'vegetable'; // Low cal high fiber
                }

                if (f > p && f > c) category = 'fat';

                // Final safety: if nothing matched
                if (category === 'other') category = 'condiment'; // Or treat as condiment if unknown
            }

            // Clean up name (remove USDA clutter)
            let cleanName = d.name_es || d.name;
            cleanName = cleanName.split(',')[0]; // Take first part
            if (cleanName.length > 30) cleanName = cleanName.substring(0, 30) + '...';

            const dbGroupNorm = String(dbUsdaGroup || '').toLowerCase();
            const wholeGrainDetected = Boolean(d.is_whole_grain) ||
                dbUsdaGroup === 'whole_grain' ||
                (dbGroupNorm.includes('whole') && dbGroupNorm.includes('grain')) ||
                /(integral|whole|bran|oat|avena|quinoa|quinua|trigo|centeno)/.test(catSearch);

            // Smart defaults for serving size
            let sSize = d.serving_size || 100;
            const sUnitRaw = d.serving_unit || 'g';
            const sUnit = sUnitRaw.toLowerCase();
            // USDA-equivalent grams heuristics by category
            let servingEquiv = sSize;
            if (category === 'vegetable') {
                servingEquiv = sUnit.includes('cup') ? 90 : 90;
            }
            if (category === 'fruit') {
                servingEquiv = sUnit.includes('cup') ? 150 : 150;
            }
            if (category === 'dairy') {
                if (sUnit.includes('cup')) servingEquiv = 244;
                else if (sUnit.includes('container') && sSize >= 120) servingEquiv = sSize;
                else servingEquiv = sSize >= 120 ? sSize : 244;
            }
            if (category === 'protein' || category === 'legume') servingEquiv = 85;
            if (category === 'carb') {
                if (sUnit.includes('cup')) servingEquiv = 90;
                else if (sUnit.includes('slice') || sUnit.includes('tortilla')) servingEquiv = 30;
                else if (sUnit.includes('oz')) servingEquiv = 28;
                else servingEquiv = sSize >= 40 ? sSize : 60;
            }
            if (category === 'fat') {
                if (sUnit.includes('tbsp')) servingEquiv = 14;
                else if (sUnit.includes('tsp')) servingEquiv = 5;
                else if (catSearch.includes('avocado') || catSearch.includes('palta')) servingEquiv = 50;
                else if (catSearch.includes('nut') || catSearch.includes('seed') || catSearch.includes('almond') || catSearch.includes('peanut') || catSearch.includes('chia') || catSearch.includes('flax')) servingEquiv = 14;
                else servingEquiv = 20;
            }

            const processing_level: SimpleFoodItem['processing_level'] =
                d.processing_level ||
                (d.food_tier === 1 ? 'minimally_processed'
                    : d.food_tier === 2 ? 'processed'
                        : 'ultra_processed');

            const normalizeServingEquiv = (raw: number, fallback: number): number => {
                if (!raw || raw <= 0) return fallback;
                switch (category) {
                    case 'vegetable':
                        return raw >= 60 && raw <= 200 ? raw : fallback;
                    case 'fruit':
                        return raw >= 80 && raw <= 250 ? raw : fallback;
                    case 'dairy':
                        return raw >= 100 && raw <= 300 ? raw : fallback;
                    case 'protein':
                    case 'legume':
                        return raw >= 60 && raw <= 150 ? raw : fallback;
                    case 'carb':
                        return raw >= 20 && raw <= 150 ? raw : fallback;
                    case 'fat': {
                        const isAvocado = catSearch.includes('avocado') || catSearch.includes('palta');
                        const isOil = catSearch.includes('oil') || catSearch.includes('aceite');
                        const isNutSeed = /(nut|seed|almond|peanut|chia|linaza|pecan|cashew|pistach)/.test(catSearch);
                        if (isOil) return raw >= 3 && raw <= 15 ? raw : fallback;
                        if (isAvocado) return raw >= 30 && raw <= 80 ? raw : fallback;
                        if (isNutSeed) return raw >= 8 && raw <= 30 ? raw : fallback;
                        return raw >= 5 && raw <= 30 ? raw : fallback;
                    }
                    default:
                        return fallback;
                }
            };

            const qualityFlags = (() => {
                const raw = (d as any).data_quality_flags;
                if (!raw) return undefined;
                if (typeof raw === 'string') {
                    try {
                        return JSON.parse(raw) as Record<string, unknown>;
                    } catch {
                        return raw;
                    }
                }
                if (typeof raw === 'object') return raw as Record<string, unknown>;
                return undefined;
            })();

            return {
                id: String(d.id),
                name: d.name,
                name_es: cleanName,
                emoji: d.emoji || '🍽️',
                category,
                usda_group: category === 'carb'
                    ? (isLegume ? 'protein' : wholeGrainDetected ? 'whole_grain' : 'refined_grain')
                    : (category as any),
                serving_equiv_grams: normalizeServingEquiv(Number(d.serving_equiv_grams || 0), servingEquiv),
                processing_level,
                is_whole_grain: Boolean(d.is_whole_grain) || wholeGrainDetected,
                data_quality_flags: qualityFlags,
                kcal: d.kcal_per_100g || 0,
                protein: d.protein_g_per_100g || 0,
                carbs: d.carbs_g_per_100g || 0,
                fat: d.fat_g_per_100g || 0,
                portion_g: 100,
                serving_size: sSize,
                serving_unit: sUnitRaw,
                meal_times: d.meal_times || [],
                is_common_staple: d.is_common_staple || false,
                cooking_states: d.cooking_states || [],
                fiber: d.fiber_g || d.fiber_g_per_100g || 0,
                sodium_mg: d.sodium_mg || d.sodium_mg_per_100g || 0,
                sugar_g: d.sugar_g || d.sugars_g || d.sugar_g_per_100g || 0,
                added_sugars_g: d.added_sugars_g_per_100g || d.added_sugars_g || d.added_sugars || 0,
                sat_fat_g: d.saturated_fat_g_per_100g || 0,
                micros: {
                    iron_mg: d.iron_mg || 0,
                    calcium_mg: d.calcium_mg || 0,
                    magnesium_mg: d.magnesium_mg || 0,
                    zinc_mg: d.zinc_mg || 0,
                    potassium_mg: d.potassium_mg || 0,
                    vit_c_mg: d.vitamin_c_mg || 0,
                    vit_d_iu: d.vitamin_d_iu || 0,
                    vit_a_iu: d.vitamin_a_iu || 0,
                    vit_b12_mcg: d.vitamin_b12_ug || 0,
                    folate_mcg: d.folate_ug || 0,
                    omega3_g: d.omega3_g || 0,
                    colina_mg: d.colina_mg || 0,
                }
            };
        };

        // Transform raw DB data to SimpleFoodItem format
        const transformed: SimpleFoodItem[] = data.map(mapRow);

        if (requiredFoodIds.length > 0) {
            const missing = requiredFoodIds.filter(id => !transformed.find(f => String(f.id) === String(id)));
            if (missing.length > 0) {
                const { data: extraData, error: extraError } = await supabase
                    .from('foods')
                    .select('*')
                    .in('id', missing);
                if (!extraError && extraData && extraData.length > 0) {
                    const extraFoods = extraData.map(mapRow);
                    extraFoods.forEach(f => {
                        if (!transformed.find(existing => String(existing.id) === String(f.id))) {
                            transformed.push(f);
                        }
                    });
                }
            }
        }

        // Cache the entire result for future use
        const cacheKey = 'all_foods_unified';
        foodCache.set(cacheKey, transformed);
        console.log(`💾 Cached: ${cacheKey} (${transformed.length} total items across all categories)`);

        return transformed;

    } catch (err) {
        console.warn('loadFoodsFromDB crash:', err);
        return SIMPLE_FOODS;
    }
}

// Generate meal using DB-loaded foods with INTELLIGENT PORTION CONTROL
async function generateMealFromFoods(
    type: Meal['type'],
    targetCalories: number,
    foods: SimpleFoodItem[],
    dietType: string = 'balanced',
    conditions: string[] = [],
    nutrientPriorities: string[] = [],
    targetProteinGrams?: number,
    varietyManager?: VarietyManager,
    dayTargetCalories?: number,
    ageYears?: number,
    microTargets?: MacroTotals['micros'],
    groupTargets?: {
        vegMinServings?: number;
        fruitMinServings?: number;
        dairyMinServings?: number;
        fatMinServings?: number;
        wholeGrainMinServings?: number;
        vegMaxServings?: number;
        fruitMaxServings?: number;
        dairyMaxServings?: number;
        fatMaxServings?: number;
        wholeGrainMaxServings?: number;
    },
    requiredFoodIds?: string[]
): Promise<Meal> {
    const typeNames: Record<string, string> = {
        breakfast: 'Desayuno',
        lunch: 'Almuerzo',
        dinner: 'Cena',
        snack: 'Snack',
    };

    console.log(`\n🍽️  [MEAL GEN] Generating ${type} - Target: ${targetCalories} kcal, ${targetProteinGrams || 'auto'}g protein`);
    // Redeploy trigger: Force Vercel build

    // ========================================
    // PHASE 1: FOOD FILTERING & VALIDATION
    // ========================================

    let filteredFoods = [...foods].filter(f => {
        // Basic validation
        if (!f || !isNutritionallyViable(f)) {
            return false;
        }

        // Meal appropriateness check
        if (!isFoodAppropriateForMeal(f, type)) {
            return false;
        }

        // CULINARY SENSE CHECK: Reject ingredients that are not "Foods" (Powders, Flours, Spices)
        // fitia_plus_fndds base has ingredients like "Cacao En Polvo" or "Harina" which macros-wise look like food
        // but are NOT suitable as a main dish.
        const lowerName = f.name.toLowerCase();
        const lowerNameEs = (f.name_es || '').toLowerCase();
        const badKeywords = [
            'powder', 'polvo',
            'flour', 'harina',
            'starch', 'almidón',
            'yeast', 'levadura',
            'baking', 'hornear',
            'extract', 'extracto',
            'spice', 'especia',
            'sauce', 'salsa',  // Unless specifically handled
            'dressing', 'aderezo',
            'paste', 'pasta de', // "Pasta" is fine, "Pasta de tomate" is bad. 
            'concentrate', 'concentrado',
            'shortening', 'manteca vegetal',
            'syrup', 'jarabe'
        ];

        // Exception: "Pasta" (noodles) is okay, but "Pasta de tomate" (Tomato paste) is not.
        const isPasta = (lowerName.includes('pasta') || lowerNameEs.includes('pasta')) &&
            !lowerName.includes('paste') && !lowerNameEs.includes('pasta de');

        if (!isPasta) {
            if (badKeywords.some(k => lowerName.includes(k) || lowerNameEs.includes(k))) {
                return false;
            }
        }

        return true;
    });

    console.log(`  📋 After appropriateness filter: ${filteredFoods.length} foods`);

    // Apply diet-specific filters
    if (dietType === 'keto') {
        filteredFoods = filteredFoods.filter(f =>
            f.category !== 'carb' &&
            f.category !== 'legume' &&
            !(f.category === 'fruit' && f.carbs > 10) &&
            !(f.category === 'dairy' && f.carbs > 5)
        );
        console.log(`  🥑 Keto filter: ${filteredFoods.length} foods`);
    }
    if (dietType === 'vegan') {
        filteredFoods = filteredFoods.filter(f =>
            !['protein', 'dairy'].includes(f.category) ||
            f.category === 'legume' ||
            f.name.toLowerCase().includes('bean') ||
            f.name.toLowerCase().includes('lentil') ||
            f.name.toLowerCase().includes('tofu') ||
            f.name.toLowerCase().includes('chickpea')
        );
        console.log(`  🌱 Vegan filter: ${filteredFoods.length} foods`);
    }
    if (dietType === 'vegetarian') {
        filteredFoods = filteredFoods.filter(f => {
            if (f.category === 'protein') {
                const nm = f.name.toLowerCase();
                return nm.includes('egg') || nm.includes('tofu') || nm.includes('bean') || nm.includes('lentil') || nm.includes('chickpea');
            }
            // Legumes are in their own bucket now and allowed
            return true;
        });
        console.log(`  🥚 Vegetarian filter: ${filteredFoods.length} foods`);
    }
    if (dietType === 'diabetes_friendly' || conditions.includes('diabetes_type_2')) {
        filteredFoods = filteredFoods.filter(f =>
            !(f.category === 'carb' && f.carbs > 25 && !f.fiber)
        );
        console.log(`  💉 Diabetes filter: ${filteredFoods.length} foods`);
    }

    const requiredSet = new Set((requiredFoodIds || []).map(id => String(id)));
    const requiredFoods = requiredSet.size
        ? filteredFoods.filter(f => requiredSet.has(String(f.id)))
        : [];
    if (requiredSet.size && requiredFoods.length < requiredSet.size) {
        const missing = Array.from(requiredSet).filter(id => !requiredFoods.find(f => String(f.id) === id));
        throw new Error(`No se pudieron aplicar alimentos requeridos para ${type}: ${missing.join(', ')}`);
    }

    // Categorize foods by ROLE (Strong Typing)
    // This replaces the old macro-based fuzzy matching with strict Role enforcement
    const buckets: Record<string, SimpleFoodItem[]> = {
        protein: [],
        carb: [],
        veggie: [],
        fat: [],
        fruit: [],
        dairy: [],
        legume: [],
        condiment: [],
        beverage: []
    };

    filteredFoods.forEach(f => {
        const role = assignRole(f);
        if (!buckets[role]) {
            buckets[role] = [];
        }
        buckets[role].push(f);
    });

    // If critical buckets are empty, supplement with staples (still respecting pantry whitelist via filteredFoods)
    const findByIds = (ids: string[]) => ids
        .map(id => filteredFoods.find(f => f.id === id))
        .filter(Boolean) as SimpleFoodItem[];
    if (buckets.protein.length === 0) buckets.protein.push(...findByIds(['28346', '28519', '29568'])); // pollo, pavo, huevo
    if (buckets.fat.length === 0) buckets.fat.push(...findByIds(['31638', '27881'])); // palta, aceite
    if (buckets.dairy.length === 0) buckets.dairy.push(...findByIds(['27829', '27800'])); // yogurt, leche
    const hasWholeGrain = buckets.carb.some(c => isWholeGrain(c));
    if (!hasWholeGrain) buckets.carb.push(...findByIds(['30013', '30815'])); // pan integral, quinua

    console.log(`  📊 Buckets: P=${buckets.protein.length}, C=${buckets.carb.length}, V=${buckets.veggie.length}, L=${buckets.legume.length}, F=${buckets.fat.length}, D=${buckets.dairy.length}, Cnd=${buckets.condiment.length}`);

    // Map old variable names to new buckets for compatibility with rest of function
    // But logically we should use the buckets directly.
    let proteins = buckets.protein;
    let carbs = buckets.carb;
    let vegetables = buckets.veggie;
    let fats = buckets.fat;
    let fruits = buckets.fruit;
    let dairy = buckets.dairy;
    let legumes = buckets.legume;

    // Special Case: Vegans/Vegetarians count legumes as proteins
    const legumeBlocked = varietyManager ? varietyManager.shouldSkipByRole('any', 'legume', 24) : false;

    if (dietType === 'vegan' || dietType === 'vegetarian') {
        // Legumes can act as proteins for plant-based diets
        proteins = legumeBlocked ? proteins : [...proteins, ...legumes];
    }

    console.log(`  📊 Categories: P=${proteins.length}, C=${carbs.length}, V=${vegetables.length}, L=${legumes.length}, F=${fats.length}, Fr=${fruits.length}, D=${dairy.length}`);

    const applyVariety = (list: SimpleFoodItem[], cooldownHours: number, minUnique: number = 2) => {
        if (!varietyManager) return list;
        if (list.length <= minUnique) return list; // Allow repeats when pantry is small
        return varietyManager.getAvailableFoods(list, cooldownHours);
    };

    // Apply variety filtering (but relax for scarce groups needed for USDA)
    if (varietyManager) {
        const beforeVariety = proteins.length + carbs.length + vegetables.length + legumes.length + fats.length + fruits.length + dairy.length;
        const wholeGrainCount = carbs.filter(c => isWholeGrain(c)).length;
        const carbMinUnique = wholeGrainCount <= 1 ? carbs.length : 2;

        proteins = applyVariety(proteins, 24, 2);
        carbs = applyVariety(carbs, 24, carbMinUnique);
        vegetables = applyVariety(vegetables, 24, 2);
        legumes = applyVariety(legumes, 24, 1);
        fats = applyVariety(fats, 12, 2);
        fruits = applyVariety(fruits, 12, 2);
        dairy = applyVariety(dairy, 12, 2);

        const afterVariety = proteins.length + carbs.length + vegetables.length + legumes.length + fats.length + fruits.length + dairy.length;
        console.log(`  🔄 Variety filter: ${beforeVariety} → ${afterVariety} foods`);
    }

    // ========================================
    // PHASE 2: MEAL COMPOSITION PLANNING
    // ========================================

    const items: MealItem[] = [];

    // Get diet macros
    const dietKeyMap: Record<string, string> = {
        'balanced': 'Estándar', 'keto': 'Keto', 'low_carb': 'Low-Carb',
        'vegan': 'Vegana', 'vegetarian': 'Vegetariana', 'paleo': 'Paleo',
        'mediterranean': 'Mediterránea', 'high_protein': 'Alta Proteína',
        'diabetes_friendly': 'Diabéticos', 'dash': 'DASH'
    };
    const lookupKey = dietKeyMap[dietType] || 'Estándar';
    // @ts-ignore
    const dietMacros = DIET_MACROS[lookupKey] || DIET_MACROS['Estándar'];
    const proteinRatio = dietMacros.protein_pct / 100;
    const carbRatio = dietMacros.carbs_pct / 100;
    const fatRatio = dietMacros.fat_pct / 100;

    console.log(`  🎯 Diet ratios (${dietType}): P=${(proteinRatio * 100).toFixed(0)}% C=${(carbRatio * 100).toFixed(0)}% F=${(fatRatio * 100).toFixed(0)}%`);

    // Calculate macro targets for this meal
    // If protein is provided in grams, allocate carbs/fat from remaining kcal to avoid over-budgeting
    const mealProteinTarget = typeof targetProteinGrams === 'number'
        ? targetProteinGrams
        : (targetCalories * proteinRatio) / 4;

    const proteinKcal = mealProteinTarget * 4;
    const remainingKcal = Math.max(0, targetCalories - proteinKcal);
    const cfSum = carbRatio + fatRatio;
    const carbShare = cfSum > 0 ? (carbRatio / cfSum) : 0.67;
    const fatShare = cfSum > 0 ? (fatRatio / cfSum) : 0.33;

    const mealCarbTarget = (remainingKcal * carbShare) / 4;
    const mealFatTarget = (remainingKcal * fatShare) / 9;

    console.log(`  🎯 Meal targets: ${mealProteinTarget.toFixed(1)}g P, ${mealCarbTarget.toFixed(1)}g C, ${mealFatTarget.toFixed(1)}g F`);

    // USDA/DGA Budgets per meal (sodio/azúcar/satfat)
    const share = dayTargetCalories ? Math.min(Math.max(targetCalories / dayTargetCalories, 0.15), 0.5) : 0.33;
    const mealBudgets = computeMealBudgets(dayTargetCalories || targetCalories, ageYears, share);
    if (type === 'snack') {
        mealBudgets.maxAddedSugar_g = Math.min(mealBudgets.maxAddedSugar_g, 5);
    }

    // ========================================
    // PHASE 3: FOOD SELECTION WITH INTELLIGENT PORTIONS
    // ========================================

    const portionContext: PortionCalculationContext = {
        mealType: type,
        existingItems: items,
        dietType,
        userConditions: conditions,
        targetCalories,
        targetProtein: mealProteinTarget,
        targetCarbs: mealCarbTarget,
        targetFat: mealFatTarget
    };

    // ===========================================================
    // OPTIMIZATION-BASED MEAL CONSTRUCTION (multi-factor scoring)
    // ===========================================================
    type ScoredItem = { food: SimpleFoodItem; portion_g: number; macros: MacroTotals; course: 'main' | 'side' | 'snack' };

    const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const getServingSize = (f: SimpleFoodItem): number => f.serving_size || f.portion_g || 100;
    const inferCourse = (f: SimpleFoodItem): 'main' | 'side' | 'snack' => {
        const s = getServingSize(f);
        const kcal = f.kcal || 0;
        if (kcal >= 120 && s >= 80 && ['protein', 'carb', 'legume', 'fat'].includes(f.category)) return 'main';
        if (s <= 40 || f.category === 'condiment') return 'snack';
        if (f.category === 'vegetable' || f.category === 'fruit') return 'side';
        if (f.category === 'dairy' && f.protein >= 8 && s >= 150) return 'main';
        return 'side';
    };
    const isSweetCereal = (f: SimpleFoodItem): boolean =>
        (f.sugar_g ?? 0) >= 10 && f.category === 'carb' && getServingSize(f) <= 80;
    const isFishFood = (f: SimpleFoodItem): boolean => {
        const nm = `${f.name} ${f.name_es}`.toLowerCase();
        return ['fish', 'tuna', 'atún', 'salmón', 'salmon', 'tilapia', 'pescado'].some(k => nm.includes(k));
    };

    const isUltraProcessedFood = (f: SimpleFoodItem): boolean => {
        const txt = `${norm(f.name)} ${norm(f.name_es)}`;
        const processedKeywords = [
            'jamon', 'ham', 'salchicha', 'sausage', 'mortadela', 'embutido',
            'pepperoni', 'hot dog', 'tocino', 'bacon', 'cereal azucar', 'granola',
            'barrita', 'ultra proces'
        ];
        const branded = (f as any).food_tier === 'Branded';
        const extremeSodiumSugar = (f.sodium_mg ?? 0) > 900 && (f.sugar_g ?? 0) > 20;
        return branded || extremeSodiumSugar || processedKeywords.some(k => txt.includes(k));
    };


    // Base quality/culinary penalty reused across selection
    const qualityPenalty = (f: SimpleFoodItem): number => {
        let p = 0;
        if ((f.sodium_mg ?? 0) > 700) p += 3;
        if ((f.sugar_g ?? 0) > 12 && f.category !== 'fruit') p += 3;
        if ((f.sat_fat_g ?? 0) > 6) p += 2;
        if (isUltraProcessedFood(f)) p += 4;
        if (f.data_quality_flags && typeof f.data_quality_flags === 'object') {
            const confidence = (f.data_quality_flags as any).confidence;
            if (typeof confidence === 'number' && confidence < 0.7) p += 2;
        }
        const course = inferCourse(f);
        const hasFish = items.some(i => isFishFood(i.food));
        const hasLegume = items.some(i => i.food.category === 'legume');
        if ((type === 'lunch' || type === 'dinner') && course === 'snack') p += 8;
        if ((type === 'lunch' || type === 'dinner') && isSweetCereal(f)) p += 10;
        if ((isFishFood(f) && hasLegume) || (f.category === 'legume' && hasFish)) p += 8;
        if ((type === 'lunch' || type === 'dinner') && f.category === 'carb') {
            if ((f.fiber ?? 0) < 2) p += 4;
            if ((f.sugar_g ?? 0) > 12) p += 6;
        }
        if ((type === 'lunch' || type === 'dinner') && f.category === 'vegetable') p -= 2;
        if (varietyManager && varietyManager.shouldSkip(f.id, 24)) p += 2;
        let bonus = 0;
        if ((f.fiber ?? 0) > 3) bonus += 1;
        if ((f.micros?.potassium_mg ?? 0) > 300) bonus += 0.5;
        if ((f.micros?.iron_mg ?? 0) > 2) bonus += 0.5;
        if ((f.micros?.magnesium_mg ?? 0) > 40) bonus += 0.5;
        return Math.max(0, p - bonus);
    };

    // Quality scoring function - lower is better
    const pickTop = (pool: SimpleFoodItem[], max: number) =>
        [...pool].sort((a, b) => qualityPenalty(a) - qualityPenalty(b)).slice(0, Math.min(max, pool.length));

    const proteinPoolBase = proteins.filter(p =>
        (p.protein >= 10 && ['protein', 'legume', 'dairy'].includes(p.category)) || p.protein >= 18
    );
    const proteinPool = pickTop(proteinPoolBase.length ? proteinPoolBase : proteins, 16);
    const carbPool = pickTop([...carbs, ...legumes], 16);
    const veggiePool = pickTop(vegetables, 14);
    const fatPool = pickTop(fats, 10);
    const fruitPool = pickTop(fruits, 7);
    const dairyPool = pickTop(
        dairy.filter(d => (d.sugar_g ?? 0) <= 12),
        8
    );

    // Scoring function for meal optimization - MUST be defined before solveWithMILP
    const evaluateMeal = (mealItems: ScoredItem[]): number => {
        const totals = sumMacros(mealItems.map(i => i.macros));
        const parts: number[] = [];
        const kcalDiff = (totals.kcal - targetCalories) / Math.max(targetCalories, 1);
        const proteinDiff = (totals.protein - mealProteinTarget) / Math.max(mealProteinTarget, 1);
        const proteinWeight = proteinDiff < 0 ? 1800 : 1200;
        parts.push(Math.pow(kcalDiff, 2) * 900);
        parts.push(Math.pow(proteinDiff, 2) * proteinWeight);

        const fatPct = totals.kcal > 0 ? ((totals.fat || 0) * 9 / totals.kcal) * 100 : 0;
        const satPct = totals.kcal > 0 ? ((totals.sat_fat_g || 0) * 9 / totals.kcal) * 100 : 0;
        const sugarPct = totals.kcal > 0 ? ((totals.sugar_g || 0) * 4 / totals.kcal) * 100 : 0;
        const addedPct = totals.kcal > 0 ? ((totals.added_sugars_g || 0) * 4 / totals.kcal) * 100 : 0;
        const fiberTarget = Math.max(10, (totals.kcal / 1000) * 14);
        const fiber = totals.fiber || 0;
        if (satPct > 10) parts.push(Math.pow(satPct - 10, 1.2) * 18);
        if (addedPct > 10) parts.push(Math.pow(addedPct - 10, 1.3) * 22);
        if (sugarPct > 15) parts.push(Math.pow(sugarPct - 15, 1.1) * 10);
        if (fatPct < 20) {
            const gap = (20 - fatPct) / 20;
            parts.push(Math.pow(gap, 2) * 1400);
        } else if (fatPct > 35) {
            const gap = (fatPct - 35) / 35;
            parts.push(Math.pow(gap, 2) * 900);
        }
        if (fiber < fiberTarget) {
            const gap = (fiberTarget - fiber) / fiberTarget;
            parts.push(Math.pow(gap, 2) * 1600);
        }
        if ((totals.sodium_mg || 0) > 2300) parts.push(Math.pow(((totals.sodium_mg || 0) - 2300) / 1000, 2) * 900);

        const hasFish = mealItems.some(i => isFishFood(i.food));
        const hasLegume = mealItems.some(i => i.food.category === 'legume');
        if (hasFish && hasLegume) parts.push(50);

        mealItems.forEach(i => {
            if ((type === 'lunch' || type === 'dinner') && i.course === 'snack') parts.push(20);
            const sweetCereal = isSweetCereal(i.food);
            if ((type === 'lunch' || type === 'dinner') && sweetCereal) parts.push(30);
            if (varietyManager && varietyManager.shouldSkip(i.food.id, 24)) parts.push(10);
        });

        const vegCount = mealItems.filter(i => i.food.category === 'vegetable').length;
        if ((type === 'lunch' || type === 'dinner') && vegCount === 0) parts.push(200);
        if (type === 'breakfast') {
            const fruitCount = mealItems.some(i => i.food.category === 'fruit');
            if (!fruitCount) parts.push(80);
        }

        const seen: Record<string, number> = {};
        mealItems.forEach(i => { seen[i.food.id] = (seen[i.food.id] || 0) + 1; });
        Object.values(seen).forEach(count => {
            if (count > 1) parts.push((count - 1) * 60);
        });

        const densityBonus = (fiber / Math.max(totals.kcal, 1)) * 1000;
        parts.push(-densityBonus);
        return parts.reduce((a, b) => a + b, 0);
    };

    // ------------------------
    // MILP solver (glpk.js) to enforce hard constraints
    // ------------------------
    const buildCandidateList = (): SimpleFoodItem[] => {
        const uniq: Record<string, boolean> = {};
        const add = (arr: SimpleFoodItem[], limit: number) => {
            arr.slice(0, limit).forEach(f => { if (!uniq[f.id]) uniq[f.id] = true; });
        };
        add(proteinPool, 10);
        add(carbPool, 10);
        add(veggiePool, 10);
        add(fatPool, 8);
        add(fruitPool, 8);
        add(dairyPool, 8);
        if (requiredFoods.length) add(requiredFoods, requiredFoods.length);
        return Object.keys(uniq).map(id => {
            return requiredFoods.find(f => f.id === id) ||
                proteinPool.find(f => f.id === id) ||
                carbPool.find(f => f.id === id) ||
                veggiePool.find(f => f.id === id) ||
                fatPool.find(f => f.id === id) ||
                fruitPool.find(f => f.id === id) ||
                dairyPool.find(f => f.id === id) as SimpleFoodItem;
        }).filter(Boolean);
    };

    const solveWithMILP = async (): Promise<ScoredItem[] | null> => {
        const candidates = buildCandidateList().filter(c => c.category !== 'condiment');
        if (candidates.length === 0) return null;
        const requiredIdSet = new Set(requiredFoods.map(f => String(f.id)));

        const glpk = await getGlpk();

        const vars: any[] = [];
        const subjectTo: any[] = [];
        const bounds: any[] = [];
        const binaries: string[] = [];

        const addConstraint = (name: string, vars: any[], bnds: any) => {
            subjectTo.push({ name, vars, bnds });
        };

        const kcalVars: any[] = [];
        const proteinVars: any[] = [];
        const carbsVars: any[] = [];
        const fatVars: any[] = [];
        const sugarVars: any[] = [];
        const sodiumVars: any[] = [];
        const satVars: any[] = [];
        const vegServVars: any[] = [];
        const fruitServVars: any[] = [];
        const dairyServVars: any[] = [];
        const fatServVars: any[] = [];
        const wholeServVars: any[] = [];
        const countVars: any[] = [];
        const microVars: Record<MicroKey, any[]> = MICRO_KEYS.reduce((acc, key) => {
            acc[key] = [];
            return acc;
        }, {} as Record<MicroKey, any[]>);
        candidates.forEach((f, idx) => {
            const { minG, maxG } = getPortionBoundsForFood(f);
            const xName = `x_${idx}`;
            const yName = `y_${idx}`;
            const perG = {
                kcal: (f.kcal || 0) / 100,
                protein: (f.protein || 0) / 100,
                carbs: (f.carbs || 0) / 100,
                fat: (f.fat || 0) / 100,
                sugar: (f.added_sugars_g || 0) / 100,
                sodium: (f.sodium_mg || 0) / 100,
                sat: (f.sat_fat_g || 0) / 100
            };
            MICRO_KEYS.forEach(key => {
                const microVal = resolveMicroPer100g(f, key);
                if (microVal > 0) {
                    microVars[key].push({ name: xName, coef: microVal / 100 });
                }
            });

            vars.push({ name: xName, coef: qualityPenalty(f) * 0.05 });
            bounds.push({ name: xName, type: glpk.GLP_DB, lb: 0, ub: maxG });

            vars.push({ name: yName, coef: 5 }); // small penalty for too many items
            bounds.push({ name: yName, type: glpk.GLP_DB, lb: 0, ub: 1 });
            binaries.push(yName);

            // link x_i to y_i
            addConstraint(`min_${idx}`, [{ name: xName, coef: 1 }, { name: yName, coef: -minG }], { type: glpk.GLP_LO, lb: 0, ub: 0 });
            addConstraint(`max_${idx}`, [{ name: xName, coef: 1 }, { name: yName, coef: -maxG }], { type: glpk.GLP_UP, ub: 0 });
            if (requiredIdSet.has(String(f.id))) {
                addConstraint(`req_${idx}`, [{ name: yName, coef: 1 }], { type: glpk.GLP_FX, lb: 1, ub: 1 });
            }

            kcalVars.push({ name: xName, coef: perG.kcal });
            proteinVars.push({ name: xName, coef: perG.protein });
            carbsVars.push({ name: xName, coef: perG.carbs });
            fatVars.push({ name: xName, coef: perG.fat });
            sugarVars.push({ name: xName, coef: perG.sugar });
            sodiumVars.push({ name: xName, coef: perG.sodium });
            satVars.push({ name: xName, coef: perG.sat });

            const fCat = getFunctionalCategory(f);

            if (fCat === 'vegetable') {
                vegServVars.push({ name: xName, coef: 1 / (f.serving_equiv_grams || 90) });
            }
            if (fCat === 'carb' && isWholeGrain(f)) {
                const base = f.serving_equiv_grams || 90;
                wholeServVars.push({ name: xName, coef: 1 / base });
            }
            if (fCat === 'dairy') {
                dairyServVars.push({ name: xName, coef: 1 / (f.serving_equiv_grams || 244) });
            }
            if (fCat === 'fat') {
                const fatPerG = perG.fat || 0;
                if (fatPerG > 0) {
                    fatServVars.push({ name: xName, coef: fatPerG / 5 });
                }
            }
            if (fCat === 'fruit') {
                fruitServVars.push({ name: xName, coef: 1 / (f.serving_equiv_grams || 150) });
            }
            countVars.push({ name: yName, coef: 1 });
        });

        const effectiveGroupTargets = groupTargets ? { ...groupTargets } : undefined;
        const missingGroups: string[] = [];
        if ((effectiveGroupTargets?.vegMinServings || 0) > 0 && vegServVars.length === 0) {
            missingGroups.push('verduras');
            effectiveGroupTargets!.vegMinServings = 0;
        }
        if ((effectiveGroupTargets?.fruitMinServings || 0) > 0 && fruitServVars.length === 0) {
            missingGroups.push('frutas');
            effectiveGroupTargets!.fruitMinServings = 0;
        }
        if ((effectiveGroupTargets?.dairyMinServings || 0) > 0 && dairyServVars.length === 0) {
            missingGroups.push('lácteos');
            effectiveGroupTargets!.dairyMinServings = 0;
        }
        if ((effectiveGroupTargets?.fatMinServings || 0) > 0 && fatServVars.length === 0) {
            missingGroups.push('grasas saludables');
            effectiveGroupTargets!.fatMinServings = 0;
        }
        if ((effectiveGroupTargets?.wholeGrainMinServings || 0) > 0 && wholeServVars.length === 0) {
            missingGroups.push('granos integrales');
            effectiveGroupTargets!.wholeGrainMinServings = 0;
        }
        if (missingGroups.length > 0) {
            console.warn(`  ⚠️ Sin opciones en esta comida para: ${missingGroups.join(', ')}. Se difiere a otras comidas.`);
        }

        // Calories equality with slack
        const devKcalPos = 'dev_kcal_pos';
        const devKcalNeg = 'dev_kcal_neg';
        bounds.push({ name: devKcalPos, type: glpk.GLP_LO, lb: 0 });
        bounds.push({ name: devKcalNeg, type: glpk.GLP_LO, lb: 0 });
        vars.push({ name: devKcalPos, coef: 1000 });
        vars.push({ name: devKcalNeg, coef: 1000 });
        addConstraint('kcal_eq', [...kcalVars, { name: devKcalPos, coef: -1 }, { name: devKcalNeg, coef: 1 }], { type: glpk.GLP_FX, lb: targetCalories, ub: targetCalories });

        // Protein equality with slack
        const devProtPos = 'dev_prot_pos';
        const devProtNeg = 'dev_prot_neg';
        bounds.push({ name: devProtPos, type: glpk.GLP_LO, lb: 0 });
        bounds.push({ name: devProtNeg, type: glpk.GLP_LO, lb: 0 });
        vars.push({ name: devProtPos, coef: 800 });
        vars.push({ name: devProtNeg, coef: 800 });
        addConstraint('protein_eq', [...proteinVars, { name: devProtPos, coef: -1 }, { name: devProtNeg, coef: 1 }], { type: glpk.GLP_FX, lb: mealProteinTarget, ub: mealProteinTarget });

        // Macro windows
        addConstraint('carbs_min', carbsVars, { type: glpk.GLP_LO, lb: mealCarbTarget * 0.6 });
        addConstraint('carbs_max', carbsVars, { type: glpk.GLP_UP, ub: mealCarbTarget * 1.4 });
        addConstraint('fat_min', fatVars, { type: glpk.GLP_LO, lb: mealFatTarget * 0.6 });
        addConstraint('fat_max', fatVars, { type: glpk.GLP_UP, ub: mealFatTarget * 1.5 });

        // Hard budgets
        addConstraint('sugar_max', sugarVars, { type: glpk.GLP_UP, ub: mealBudgets.maxAddedSugar_g });
        addConstraint('sodium_max', sodiumVars, { type: glpk.GLP_UP, ub: mealBudgets.maxSodium_mg });
        addConstraint('sat_max', satVars, { type: glpk.GLP_UP, ub: mealBudgets.maxSatFat_g });

        // Servings constraints
        if (effectiveGroupTargets?.vegMaxServings && vegServVars.length) {
            addConstraint('veg_max', vegServVars, { type: glpk.GLP_UP, ub: effectiveGroupTargets.vegMaxServings });
        }
        if (effectiveGroupTargets?.fruitMaxServings && fruitServVars.length) {
            addConstraint('fruit_max', fruitServVars, { type: glpk.GLP_UP, ub: effectiveGroupTargets.fruitMaxServings });
        }
        if (effectiveGroupTargets?.dairyMaxServings && dairyServVars.length) {
            addConstraint('dairy_max', dairyServVars, { type: glpk.GLP_UP, ub: effectiveGroupTargets.dairyMaxServings });
        }
        if (effectiveGroupTargets?.fatMaxServings && fatServVars.length) {
            addConstraint('fat_max', fatServVars, { type: glpk.GLP_UP, ub: effectiveGroupTargets.fatMaxServings });
        }
        if (effectiveGroupTargets?.wholeGrainMaxServings && wholeServVars.length) {
            addConstraint('whole_max', wholeServVars, { type: glpk.GLP_UP, ub: effectiveGroupTargets.wholeGrainMaxServings });
        }

        // Required group minimum servings (per-meal share)
        if (effectiveGroupTargets?.vegMinServings && vegServVars.length) {
            addConstraint('veg_min', vegServVars, { type: glpk.GLP_LO, lb: effectiveGroupTargets.vegMinServings });
        }
        if (effectiveGroupTargets?.fruitMinServings && fruitServVars.length) {
            addConstraint('fruit_min', fruitServVars, { type: glpk.GLP_LO, lb: effectiveGroupTargets.fruitMinServings });
        }
        if (effectiveGroupTargets?.dairyMinServings && dairyServVars.length) {
            addConstraint('dairy_min', dairyServVars, { type: glpk.GLP_LO, lb: effectiveGroupTargets.dairyMinServings });
        }
        if (effectiveGroupTargets?.fatMinServings && fatServVars.length) {
            addConstraint('fat_min', fatServVars, { type: glpk.GLP_LO, lb: effectiveGroupTargets.fatMinServings });
        }
        if (effectiveGroupTargets?.wholeGrainMinServings && wholeServVars.length) {
            addConstraint('whole_min', wholeServVars, { type: glpk.GLP_LO, lb: effectiveGroupTargets.wholeGrainMinServings });
        }

        addConstraint('count_max', countVars, { type: glpk.GLP_UP, ub: 6 });

        if (microTargets) {
            MICRO_KEYS.forEach(key => {
                const target = microTargets[key] || 0;
                if (!target || microVars[key].length === 0) return;
                addConstraint(`${key}_min`, microVars[key], { type: glpk.GLP_LO, lb: target });
            });
        }

        const lp = {
            name: 'meal_milp',
            objective: { direction: glpk.GLP_MIN, name: 'obj', vars },
            subjectTo,
            bounds,
            binaries
        };

        // Diagnostic: log constraint summary
        console.log(`  📐 MILP: ${candidates.length} candidates, ${subjectTo.length} constraints, ${binaries.length} binaries`);

        let result: any;
        try {
            result = glpk.solve(lp, { msgLevel: glpk.GLP_MSG_OFF });
        } catch (glpkError) {
            console.warn('  ⚠️ glpk.solve threw exception:', glpkError);
            return null;
        }

        if (!result) {
            console.warn('  ⚠️ glpk.solve returned null/undefined');
            return null;
        }
        if (!result.result) {
            console.warn('  ⚠️ glpk.solve result missing .result property:', JSON.stringify(result).slice(0, 200));
            return null;
        }
        if (result.result.status !== glpk.GLP_OPT) {
            const statusName = result.result.status === glpk.GLP_INFEAS ? 'INFEASIBLE'
                : result.result.status === glpk.GLP_UNBND ? 'UNBOUNDED'
                    : result.result.status === glpk.GLP_UNDEF ? 'UNDEFINED'
                        : `STATUS_${result.result.status}`;
            console.warn(`  ⚠️ MILP no encontró solución óptima: ${statusName}`);
            return null;
        }

        const chosen: ScoredItem[] = [];
        candidates.forEach((f, idx) => {
            const x = result.result.vars[`x_${idx}`] || 0;
            if (x > 0) {
                const portion = adjustToServingBounds(f, x);
                chosen.push({ food: f, portion_g: portion, macros: calculateItemMacros(f, portion), course: inferCourse(f) });
            }
        });
        return chosen;
    };


    const portionItem = (food: SimpleFoodItem, target: { protein?: number; carbs?: number; fat?: number; kcal?: number }): ScoredItem | null => {
        const res = calculateOptimalPortion(food, target, { ...portionContext, existingItems: items });
        if (!res.isValid) return null;
        const portion = adjustToServingBounds(food, res.finalPortion);
        return { food, portion_g: portion, macros: calculateItemMacros(food, portion), course: inferCourse(food) };
    };

    const randomPick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

    // First attempt: MILP solution to satisfy hard constraints
    let milpSolution: ScoredItem[] | null = null;
    try {
        milpSolution = await solveWithMILP();
    } catch (err) {
        console.warn('  ⚠️ MILP solver failed, falling back to heuristic:', err);
    }
    if (milpSolution && milpSolution.length) {
        milpSolution.forEach(i => items.push({
            food: i.food,
            portion_g: i.portion_g,
            cooking_state: i.food.cooking_states?.[0],
            macros: i.macros
        }));
        const finalTotals = sumMacros(items.map(i => i.macros));
        console.log(`  ✅ MILP meal built with ${items.length} items`);
        return {
            id: `meal_${type}_${Date.now()}`,
            type,
            type_es: typeNames[type] || type,
            items,
            totals: finalTotals
        };
    }
    const wholeGrainPool = carbPool.filter(f => isWholeGrain(f));
    const hasGroupMins = Boolean(groupTargets && (
        ((groupTargets.vegMinServings || 0) > 0 && veggiePool.length > 0) ||
        ((groupTargets.fruitMinServings || 0) > 0 && fruitPool.length > 0) ||
        ((groupTargets.dairyMinServings || 0) > 0 && dairyPool.length > 0) ||
        ((groupTargets.fatMinServings || 0) > 0 && fatPool.length > 0) ||
        ((groupTargets.wholeGrainMinServings || 0) > 0 && wholeGrainPool.length > 0)
    ));
    const microCandidates = buildCandidateList().filter(c => c.category !== 'condiment');
    const hasMicroData = MICRO_KEYS.some(key => microCandidates.some(f => resolveMicroPer100g(f, key) > 0));
    const hasMicroMins = Boolean(microTargets && hasMicroData && MICRO_KEYS.some(key => (microTargets[key] || 0) > 0));
    if (hasGroupMins || hasMicroMins) {
        console.warn('  ⚠️ MILP no pudo cumplir mínimos USDA por comida; continuando con heurística y validación diaria.');
    }

    // evaluateMeal moved to line ~1222 before solveWithMILP to fix hoisting

    const initialMeal = (): ScoredItem[] => {
        const meal: ScoredItem[] = [];
        const prot = proteinPool.length ? portionItem(randomPick(proteinPool), { protein: mealProteinTarget * 0.9 }) : null;
        if (prot) meal.push(prot);
        if (carbPool.length) {
            const carb = portionItem(randomPick(carbPool), { carbs: mealCarbTarget * 0.85 });
            if (carb) meal.push(carb);
        }
        const vegCount = (type === 'lunch' || type === 'dinner') ? 2 : 1;
        for (let i = 0; i < vegCount; i++) {
            if (veggiePool.length) {
                const v = portionItem(randomPick(veggiePool), { kcal: 60 });
                if (v && !meal.find(m => m.food.id === v.food.id)) meal.push(v);
            }
        }
        if ((type === 'breakfast' || type === 'snack') && fruitPool.length) {
            const fr = portionItem(randomPick(fruitPool), { kcal: 80 });
            if (fr) meal.push(fr);
        }
        return meal;
    };

    const optimizeMeal = (): ScoredItem[] => {
        let current = initialMeal();
        let currentCost = evaluateMeal(current);
        let best = current;
        let bestCost = currentCost;
        const iterations = 520;
        for (let it = 0; it < iterations; it++) {
            const candidate = [...current];
            const roles = ['protein', 'carb', 'veg', 'veg', 'fat', 'fruit', 'dairy'] as const;
            const role = roles[Math.floor(Math.random() * roles.length)];
            if (role === 'protein' && proteinPool.length) {
                const p = portionItem(randomPick(proteinPool), { protein: mealProteinTarget * 0.9 });
                if (p) {
                    const idx = candidate.findIndex(c => c.food.category === 'protein');
                    if (idx >= 0) candidate[idx] = p; else candidate.push(p);
                }
            } else if (role === 'carb' && carbPool.length) {
                const c = portionItem(randomPick(carbPool), { carbs: mealCarbTarget * 0.85 });
                if (c) {
                    const idx = candidate.findIndex(ci => ci.food.category === 'carb' || ci.food.category === 'legume');
                    if (idx >= 0) candidate[idx] = c; else candidate.push(c);
                }
            } else if (role === 'veg' && veggiePool.length) {
                const v = portionItem(randomPick(veggiePool), { kcal: 60 });
                if (v) {
                    const idx = candidate.findIndex(ci => ci.food.category === 'vegetable');
                    if (idx >= 0) candidate[idx] = v; else candidate.push(v);
                }
            } else if (role === 'fat' && fatPool.length) {
                const f = portionItem(randomPick(fatPool), { fat: mealFatTarget * 0.6 });
                if (f) {
                    const idx = candidate.findIndex(ci => ci.food.category === 'fat');
                    if (idx >= 0) candidate[idx] = f; else candidate.push(f);
                }
            } else if (role === 'fruit' && fruitPool.length && (type === 'breakfast' || type === 'snack')) {
                const fr = portionItem(randomPick(fruitPool), { kcal: 80 });
                if (fr) {
                    const idx = candidate.findIndex(ci => ci.food.category === 'fruit');
                    if (idx >= 0) candidate[idx] = fr; else candidate.push(fr);
                }
            } else if (role === 'dairy' && dairyPool.length) {
                const d = portionItem(randomPick(dairyPool), { protein: mealProteinTarget * 0.3, kcal: 120 });
                if (d) {
                    const idx = candidate.findIndex(ci => ci.food.category === 'dairy');
                    if (idx >= 0) candidate[idx] = d; else candidate.push(d);
                }
            }

            // Skip candidates with duplicate food IDs to avoid repeats (e.g., doble yogurt)
            if (hasDuplicateIds(candidate)) continue;

            const cost = evaluateMeal(candidate);
            // Simulated annealing with slower cooling for more exploration
            const temp = 1.5 + (iterations - it) / iterations;
            const accept = cost < currentCost || Math.exp((currentCost - cost) / temp) > Math.random();
            if (accept) {
                current = candidate;
                currentCost = cost;
            }
            if (cost < bestCost) {
                best = candidate;
                bestCost = cost;
            }
        }
        return best;
    };

    const optimizedItems = optimizeMeal();
    if (optimizedItems.length > 0) {
        optimizedItems.forEach(i => items.push({
            food: i.food,
            portion_g: i.portion_g,
            cooking_state: i.food.cooking_states?.[0],
            macros: i.macros
        }));
        const finalTotals = sumMacros(items.map(i => i.macros));
        const calorieDeviation = ((finalTotals.kcal - targetCalories) / targetCalories) * 100;
        const proteinDeviation = ((finalTotals.protein - mealProteinTarget) / mealProteinTarget) * 100;
        console.log(`  📊 Final totals: ${finalTotals.kcal} kcal (${calorieDeviation > 0 ? '+' : ''}${calorieDeviation.toFixed(1)}%), ${finalTotals.protein}g P (${proteinDeviation > 0 ? '+' : ''}${proteinDeviation.toFixed(1)}%)`);
        console.log(`  🍽️  Total items: ${items.length}`);
        return {
            id: `meal_${type}_${Date.now()}`,
            type,
            type_es: typeNames[type] || type,
            items,
            totals: finalTotals
        };
    }

    // STEP 1: Add primary protein


    // Pick best candidate by scoring (lower = better)
    const pickBest = (candidates: SimpleFoodItem[], scorer: (f: SimpleFoodItem) => number): SimpleFoodItem | undefined => {
        if (candidates.length === 0) return undefined;
        // Shuffle and pick lowest score
        const shuffled = [...candidates].sort(() => Math.random() - 0.5);
        let best = shuffled[0];
        let bestScore = scorer(best);
        for (let i = 1; i < shuffled.length; i++) {
            const s = scorer(shuffled[i]);
            if (s < bestScore) {
                best = shuffled[i];
                bestScore = s;
            }
        }
        return best;
    };

    let proteinSourceList = proteins;
    if (type === 'breakfast') {
        // Prefer high-protein dairy but allow regular dairy to avoid protein scarcity
        const breakfastDairy = dairy.filter(d => (d.sugar_g ?? 0) <= 12);
        proteinSourceList = [...proteins, ...breakfastDairy];
    } else if (type === 'snack') {
        const highProteinDairy = dairy.filter(d => d.protein >= 8 && (d.sugar_g ?? 0) <= 12);
        proteinSourceList = [...highProteinDairy, ...proteins, ...fats];
    }

    if (proteinSourceList.length > 0) {
        // Select protein using SCORING instead of random
        const proteinCandidates = proteinSourceList.slice(0, Math.min(10, proteinSourceList.length));

        // Score: prioritize protein density (protein per kcal) and low quality penalty
        const selectedProtein = pickBest(proteinCandidates, (f) => {
            const proteinPerKcal = f.kcal > 0 ? (f.protein * 4) / f.kcal : 0;
            const densityPenalty = proteinPerKcal > 0 ? (1 / proteinPerKcal) : 100;
            return densityPenalty + qualityPenalty(f);
        });

        // Check if this role was already used in this meal type
        if (selectedProtein && (!varietyManager || !varietyManager.shouldSkipByRole(type, 'primaryProtein', 0))) {
            if (preventRoleDuplication(items, selectedProtein)) {
                // Calculate optimal portion
                const portionResult = calculateOptimalPortion(
                    selectedProtein,
                    { protein: mealProteinTarget * 0.9 }, // Use 90% of target to leave room for other foods
                    portionContext
                );

                if (portionResult.isValid) {
                    // ENFORCE HARD LIMITS FROM ROLE MAPPER
                    const role = assignRole(selectedProtein);
                    // Import ROLE_CONSTRAINTS (we need to export it or inline check)
                    // Let's assume strict check:
                    let finalG = portionResult.finalPortion;
                    // Just simple hard caps based on typical serving sizes logic
                    if (role === 'condiment') finalG = Math.min(finalG, 15);
                    if (role === 'fat') finalG = Math.min(finalG, 60);
                    finalG = adjustToServingBounds(selectedProtein, finalG);

                    items.push({
                        food: selectedProtein,
                        portion_g: finalG,
                        cooking_state: selectedProtein.cooking_states?.[0],
                        macros: calculateItemMacros(selectedProtein, finalG)
                    });

                    if (varietyManager) varietyManager.markUsed(selectedProtein.id, type, 'primaryProtein');
                    if (varietyManager && selectedProtein.category === 'legume') {
                        varietyManager.markUsed(selectedProtein.id, 'any', 'legume');
                    }
                    console.log(`  ✅ Added protein: ${selectedProtein.name_es} ${finalG}g`);
                    logPortionCalculation(selectedProtein, portionResult);
                }
            }
        }
    }

    // STEP 2: Add primary carb (if not keto)
    // Template: Breakfast/Lunch/Dinner usually have a carb. Snack might not.
    if (dietType !== 'keto' && carbs.length > 0 && type !== 'snack') {
        const legumeCooldown = legumeBlocked;
        const carbPool = (!legumeCooldown && type !== 'breakfast')
            ? [...legumes, ...carbs]
            : carbs;

        // Avoid fish/legume combo (culinary compatibility)
        const primaryProtein = items.find(i => i.food.category === 'protein');
        const isFishProtein = primaryProtein ? (primaryProtein.food.name.toLowerCase().includes('fish') || primaryProtein.food.name.toLowerCase().includes('atún') || primaryProtein.food.name.toLowerCase().includes('tuna') || primaryProtein.food.name.toLowerCase().includes('salmon') || primaryProtein.food.name.toLowerCase().includes('tilapia')) : false;

        const carbCandidates = carbPool
            .filter(c => !(isFishProtein && c.category === 'legume')) // avoid tuna+beans style combo
            .slice(0, Math.min(10, carbPool.length));
        // Score: prefer high fiber, low sugar
        const selectedCarb = pickBest(carbCandidates, (f) => {
            const fiberBonus = (f.fiber ?? 0) > 3 ? -2 : 0;
            return qualityPenalty(f) + fiberBonus;
        });

        if (selectedCarb && (!varietyManager || !varietyManager.shouldSkipByRole(type, 'primaryCarb', 0))) {
            if (preventRoleDuplication(items, selectedCarb)) {
                const portionResult = calculateOptimalPortion(
                    selectedCarb,
                    { carbs: mealCarbTarget * 0.85 },
                    { ...portionContext, existingItems: items }
                );

                if (portionResult.isValid) {
                    let finalPortion = portionResult.finalPortion;
                    finalPortion = adjustToServingBounds(selectedCarb, finalPortion);

                    items.push({
                        food: selectedCarb,
                        portion_g: finalPortion,
                        cooking_state: selectedCarb.cooking_states?.[0],
                        macros: calculateItemMacros(selectedCarb, finalPortion)
                    });

                    if (varietyManager) varietyManager.markUsed(selectedCarb.id, type, 'primaryCarb');
                    if (varietyManager && selectedCarb.category === 'legume') {
                        // Mark global legume usage to limit to 1/day
                        varietyManager.markUsed(selectedCarb.id, 'any', 'legume');
                    }
                    console.log(`  ✅ Added carb: ${selectedCarb.name_es} ${finalPortion}g`);
                    logPortionCalculation(selectedCarb, portionResult);
                }
            }
        }
    }

    // STEP 3: Add vegetables (Lunch/Dinner: 2 servings. Breakfast: Optional)
    if (vegetables.length > 0) {
        // Enforce 2 veggies for Lunch/Dinner
        const numVeggies = (type === 'lunch' || type === 'dinner') ? 2 : 0;

        for (let i = 0; i < numVeggies; i++) {
            const veggieCandidates = vegetables.slice(0, Math.min(10, vegetables.length));
            // Score: prefer low sodium, high fiber veggies
            const selectedVeggie = pickBest(veggieCandidates, (f) => qualityPenalty(f));

            // Remove selected veggie from pool to avoid duplicates
            if (selectedVeggie) {
                vegetables = vegetables.filter(v => v.id !== selectedVeggie.id);
            }

            if (selectedVeggie && preventRoleDuplication(items, selectedVeggie)) {
                const portionResult = calculateOptimalPortion(
                    selectedVeggie,
                    { kcal: 50 }, // Vegetables: aim for ~50 kcal
                    { ...portionContext, existingItems: items }
                );

                if (portionResult.isValid) {
                    const finalPortion = adjustToServingBounds(selectedVeggie, portionResult.finalPortion);
                    items.push({
                        food: selectedVeggie,
                        portion_g: finalPortion,
                        cooking_state: selectedVeggie.cooking_states?.[0],
                        macros: calculateItemMacros(selectedVeggie, finalPortion)
                    });

                    if (varietyManager) varietyManager.markUsed(selectedVeggie.id, type, 'vegetable');
                    console.log(`  ✅ Added vegetable: ${selectedVeggie.name_es} ${finalPortion}g`);
                }
            }
        }
    }

    // STEP 4: Add fruit (breakfast or snack)
    if ((type === 'breakfast' || type === 'snack') && fruits.length > 0 && dietType !== 'keto') {
        const fruitCandidates = fruits.slice(0, Math.min(5, fruits.length));
        // Score: prefer lower sugar fruits
        const selectedFruit = pickBest(fruitCandidates, (f) => (f.sugar_g ?? 0));

        if (selectedFruit && preventRoleDuplication(items, selectedFruit)) {
            const portionResult = calculateOptimalPortion(
                selectedFruit,
                { kcal: 80 },
                { ...portionContext, existingItems: items }
            );

            if (portionResult.isValid) {
                const finalPortion = adjustToServingBounds(selectedFruit, portionResult.finalPortion);
                items.push({
                    food: selectedFruit,
                    portion_g: finalPortion,
                    cooking_state: 'raw',
                    macros: calculateItemMacros(selectedFruit, finalPortion)
                });

                if (varietyManager) varietyManager.markUsed(selectedFruit.id, type, 'fruit');
                console.log(`  ✅ Added fruit: ${selectedFruit.name_es} ${finalPortion}g`);
            }
        }
    }

    // STEP 5: Add healthy fat if needed
    const currentTotals = sumMacros(items.map(i => i.macros));
    const fatDeficit = mealFatTarget - currentTotals.fat;

    if (fatDeficit > 5 && fats.length > 0) {
        const fatCandidates = fats.slice(0, Math.min(3, fats.length));
        // Score: prefer low saturated fat
        const selectedFat = pickBest(fatCandidates, (f) => (f.sat_fat_g ?? 0));

        // Check if fat role was already used in this meal type
        if (!selectedFat) {
            // No valid fat candidate found
        } else if (varietyManager && varietyManager.shouldSkipByRole(type, 'healthyFat', 0)) {
            console.log(`  ❌ Skipping fat: ${selectedFat.name_es} - fat role already used in ${type}`);
        } else if (preventRoleDuplication(items, selectedFat)) {
            const portionResult = calculateOptimalPortion(
                selectedFat,
                { fat: fatDeficit * 0.8 },
                { ...portionContext, existingItems: items }
            );

            if (portionResult.isValid && portionResult.finalPortion >= 10) {
                const finalPortion = adjustToServingBounds(selectedFat, portionResult.finalPortion);
                items.push({
                    food: selectedFat,
                    portion_g: finalPortion,
                    cooking_state: selectedFat.cooking_states?.[0] || 'raw',
                    macros: calculateItemMacros(selectedFat, finalPortion)
                });

                if (varietyManager) varietyManager.markUsed(selectedFat.id, type, 'healthyFat');
                console.log(`  ✅ Added fat: ${selectedFat.name_es} ${finalPortion}g`);
            }
        }
    }

    // ========================================
    // PHASE 4: FINAL ADJUSTMENTS
    // ========================================

    const recomputeTotals = () => sumMacros(items.map(i => i.macros));

    // Cap total vegetable grams per meal to avoid USDA veg max breaches
    const capVegetables = () => {
        const vegIdxs = items
            .map((it, idx) => ({ it, idx }))
            .filter(({ it }) => it.food.category === 'vegetable');
        if (vegIdxs.length === 0) return;
        const totalVegGrams = vegIdxs.reduce((sum, v) => sum + v.it.portion_g, 0);
        const maxServ = groupTargets?.vegMaxServings ?? 2.4;
        const maxVegGrams = Math.round(maxServ * 90);
        if (totalVegGrams > maxVegGrams) {
            const factor = maxVegGrams / totalVegGrams;
            vegIdxs.forEach(v => {
                const newPortion = adjustToServingBounds(v.it.food, Math.max(60, v.it.portion_g * factor));
                items[v.idx] = {
                    ...v.it,
                    portion_g: newPortion,
                    macros: calculateItemMacros(v.it.food, newPortion)
                };
            });
        }
    };

    const capWholeGrains = () => {
        const grainIdxs = items
            .map((it, idx) => ({ it, idx }))
            .filter(({ it }) => it.food.category === 'carb' && isWholeGrain(it.food));
        if (grainIdxs.length === 0) return;
        const total = grainIdxs.reduce((sum, g) => sum + g.it.portion_g, 0);
        const maxServ = groupTargets?.wholeGrainMaxServings ?? 1.5;
        const base = grainIdxs[0].it.food.serving_equiv_grams || 90;
        const maxGrams = Math.round(maxServ * base);
        if (total > maxGrams) {
            const factor = maxGrams / total;
            grainIdxs.forEach(g => {
                const newPortion = adjustToServingBounds(g.it.food, Math.max(40, g.it.portion_g * factor));
                items[g.idx] = {
                    ...g.it,
                    portion_g: newPortion,
                    macros: calculateItemMacros(g.it.food, newPortion)
                };
            });
        }
    };

    // Light post-adjustment to pull macros closer to targets
    let totals = recomputeTotals();
    capVegetables();
    capWholeGrains();
    totals = recomputeTotals();
    const adjustItemPortion = (idx: number, factor: number) => {
        const item = items[idx];
        const newPortion = adjustToServingBounds(item.food, Math.max(10, Math.round(item.portion_g * factor)));
        items[idx] = {
            ...item,
            portion_g: newPortion,
            macros: calculateItemMacros(item.food, newPortion)
        };
    };

    // Reduce most caloric item if calories are >10% over target
    if (totals.kcal > targetCalories * 1.1 && items.length > 0) {
        const maxKcalIdx = items.reduce((idx, item, i, arr) => (arr[idx].macros.kcal < item.macros.kcal ? i : idx), 0);
        adjustItemPortion(maxKcalIdx, 0.85);
        totals = recomputeTotals();
    }

    // If protein >15% over target, trim the highest-protein item (protein or legume)
    if (totals.protein > mealProteinTarget * 1.15) {
        const proteinCandidates = items
            .map((item, idx) => ({ item, idx }))
            .filter(({ item }) => item.food.category === 'protein' || item.food.category === 'legume');
        if (proteinCandidates.length > 0) {
            const proteinIdx = proteinCandidates.reduce((best, curr) =>
                curr.item.macros.protein > best.item.macros.protein ? curr : best
            ).idx;
            adjustItemPortion(proteinIdx, 0.9);
            totals = recomputeTotals();
        }
    }

    // If fat% is too low (<20%) try adding/upsizing a healthy fat if available
    const fatPct = totals.kcal > 0 ? ((totals.fat || 0) * 9 / totals.kcal) * 100 : 0;
    if (fatPct < 18 && fats.length > 0) {
        const fatCandidate = pickBest(fats, qualityPenalty);
        if (fatCandidate && preventRoleDuplication(items, fatCandidate)) {
            const portionResult = calculateOptimalPortion(
                fatCandidate,
                { fat: mealFatTarget * 0.6 },
                { ...portionContext, existingItems: items }
            );
            if (portionResult.isValid) {
                const finalPortion = adjustToServingBounds(fatCandidate, portionResult.finalPortion);
                items.push({
                    food: fatCandidate,
                    portion_g: finalPortion,
                    cooking_state: fatCandidate.cooking_states?.[0] || 'raw',
                    macros: calculateItemMacros(fatCandidate, finalPortion)
                });
                totals = recomputeTotals();
            }
        }
    } else if (fatPct < 18 && fats.length === 0) {
        // If no fat candidates, try to inject olive oil or avocado from available foods (ensured earlier)
        const fallbackFat = filteredFoods.find(f => f.id === '27881' || f.id === '31638');
        if (fallbackFat && preventRoleDuplication(items, fallbackFat)) {
            const portion = adjustToServingBounds(fallbackFat, fallbackFat.serving_size || 15);
            items.push({
                food: fallbackFat,
                portion_g: portion,
                cooking_state: fallbackFat.cooking_states?.[0] || 'raw',
                macros: calculateItemMacros(fallbackFat, portion)
            });
            totals = recomputeTotals();
        }
    }

    // If fiber is too low (<14g per 1000 kcal), add a high-fiber veg/legume if space
    const targetFiber = Math.max(10, Math.round((totals.kcal / 1000) * 14));
    const currentFiber = totals.fiber || 0;
    if (currentFiber < targetFiber && (vegetables.length > 0 || legumes.length > 0)) {
        const fiberPool = [...vegetables, ...legumes].filter(f => (f.fiber ?? 0) >= 2);
        const fiberCandidate = pickBest(fiberPool, qualityPenalty);
        if (fiberCandidate && preventRoleDuplication(items, fiberCandidate)) {
            const portionResult = calculateOptimalPortion(
                fiberCandidate,
                { kcal: 60 },
                { ...portionContext, existingItems: items }
            );
            if (portionResult.isValid) {
                const finalPortion = adjustToServingBounds(fiberCandidate, portionResult.finalPortion);
                items.push({
                    food: fiberCandidate,
                    portion_g: finalPortion,
                    cooking_state: fiberCandidate.cooking_states?.[0],
                    macros: calculateItemMacros(fiberCandidate, finalPortion)
                });
                totals = recomputeTotals();
            }
        }
    }

    const finalTotals = totals;
    const calorieDeviation = ((finalTotals.kcal - targetCalories) / targetCalories) * 100;
    const proteinDeviation = ((finalTotals.protein - mealProteinTarget) / mealProteinTarget) * 100;

    console.log(`  📊 Final totals: ${finalTotals.kcal} kcal (${calorieDeviation > 0 ? '+' : ''}${calorieDeviation.toFixed(1)}%), ${finalTotals.protein}g P (${proteinDeviation > 0 ? '+' : ''}${proteinDeviation.toFixed(1)}%)`);
    console.log(`  🍽️  Total items: ${items.length}`);

    return {
        id: `meal_${type}_${Date.now()}`,
        type,
        type_es: typeNames[type] || type,
        items,
        totals: finalTotals
    };
}

// USDA Post-Validation Guardrails
function validateUSDA(plan: MealPlan, targetCalories: number): string[] {
    const issues: string[] = [];
    const totals = plan.totals;

    // 1. Added/Total Sugars
    // 1g Sugar = 4 kcal
    const totalSugarKcal = (totals.sugar_g || 0) * 4;
    const addedSugarKcal = (totals.added_sugars_g || 0) * 4;
    const sugarPct = totals.kcal > 0 ? (totalSugarKcal / totals.kcal) * 100 : 0;
    const addedSugarPct = totals.kcal > 0 ? (addedSugarKcal / totals.kcal) * 100 : 0;

    if (addedSugarPct > 10) {
        issues.push(`⚠️ High Added Sugar: ${addedSugarPct.toFixed(1)}% of kcal (Limit 10%)`);
    } else if (sugarPct > 15) { // Looser 15% for Total Sugar (Fruit included)
        issues.push(`⚠️ High Sugar: ${sugarPct.toFixed(1)}% of kcal (Limit 15% Total / 10% Added)`);
    }

    // 2. Sodium (<2300mg)
    const sodiumMg = totals.sodium_mg || 0;
    if (sodiumMg > 2300) {
        issues.push(`⚠️ High Sodium: ${sodiumMg}mg (Limit 2300mg)`);
    }

    // 3. Saturated Fat (<10% of kcal)
    const satFatKcal = (totals.sat_fat_g || 0) * 9;
    const satFatPct = (satFatKcal / totals.kcal) * 100;
    if (satFatPct > 10) {
        issues.push(`⚠️ High Saturated Fat: ${satFatPct.toFixed(1)}% (Limit 10%)`);
    }

    // 3b. Fat too low (<20% kcal) reduces satiety and fat-soluble vitamin absorption
    const fatKcal = (totals.fat || 0) * 9;
    const fatPct = totals.kcal > 0 ? (fatKcal / totals.kcal) * 100 : 0;
    if (fatPct < 20) {
        issues.push(`⚠️ Fat very low: ${fatPct.toFixed(1)}% of kcal (target 20-35%)`);
    }

    // 3c. Fiber floor
    const fiber = totals.fiber || 0;
    if (fiber < 20) {
        issues.push(`⚠️ Low fiber: ${fiber}g (target 25g+)`);
    }

    // 4. Ultra-processed profile: high sodium + high sugar combo
    const hasHighSugarCombo = addedSugarPct > 8 || sugarPct > 15 || (totals.sugar_g || 0) > 60;
    if (sodiumMg > 1800 && hasHighSugarCombo) {
        issues.push('⚠️ Ultra-processed profile: high sodium + sugar combo');
    }

    return issues;
}

function aggregateMicrosFromMeals(meals: Meal[]): MacroTotals['micros'] {
    const totals = { calcium_mg: 0, iron_mg: 0, potassium_mg: 0, magnesium_mg: 0, folate_mcg: 0, vitamin_b12_ug: 0, vitamin_a_iu: 0, vitamin_c_mg: 0, vitamin_d_iu: 0 };
    meals.forEach(meal => {
        meal.items.forEach(mi => {
            const m = mi.macros.micros;
            if (!m) return;
            totals.calcium_mg += m.calcium_mg || 0;
            totals.iron_mg += m.iron_mg || 0;
            totals.potassium_mg += m.potassium_mg || 0;
            totals.magnesium_mg += m.magnesium_mg || 0;
            totals.folate_mcg += m.folate_mcg || 0;
            totals.vitamin_b12_ug += m.vitamin_b12_ug || 0;
            totals.vitamin_a_iu += m.vitamin_a_iu || 0;
            totals.vitamin_c_mg += m.vitamin_c_mg || 0;
            totals.vitamin_d_iu += m.vitamin_d_iu || 0;
        });
    });
    return totals;
}

function validateMicros(totals: MacroTotals['micros'], rdaProfile?: RDAProfile, foods?: SimpleFoodItem[]): string[] {
    if (!totals) return [];
    const issues: string[] = [];

    // Get sex/age-specific RDA targets
    const targets = getRDATargets(rdaProfile);

    const genderLabel = rdaProfile?.gender === 'female' ? 'mujer' : 'hombre';
    const ageLabel = rdaProfile?.age ? `${rdaProfile.age} años` : '';
    const lifeStageLabel = rdaProfile?.lifeStage && rdaProfile.lifeStage !== 'standard'
        ? ` (${rdaProfile.lifeStage})` : '';

    const microCoverage: Partial<Record<MicroKey, number>> = {};
    if (foods && foods.length > 0) {
        MICRO_KEYS.forEach(key => {
            const count = foods.filter(f => resolveMicroPer100g(f, key) > 0).length;
            microCoverage[key] = count / foods.length;
        });
    }

    const canCheck = (key: MicroKey) => !foods || (microCoverage[key] || 0) >= MICRO_DATA_COVERAGE_MIN;

    const check = (key: MicroKey, label: string, unit: string) => {
        if (!canCheck(key)) return;
        const val = Math.round((totals as any)[key] || 0);
        const target = targets[key] || 0;
        if (target > 0 && val < target * MICRO_MIN_RATIO) {
            const percent = Math.round((val / target) * 100);
            issues.push(`Bajo en ${label}: ${val}${unit} (${percent}% del objetivo ${target}${unit})`);
        }
    };

    check('calcium_mg', 'Calcio', ' mg');
    check('iron_mg', 'Hierro', ' mg');
    check('potassium_mg', 'Potasio', ' mg');
    check('magnesium_mg', 'Magnesio', ' mg');
    check('folate_mcg', 'Folato', ' mcg');
    check('vitamin_b12_ug', 'Vitamina B12', ' µg');
    check('vitamin_a_iu', 'Vitamina A', ' IU');
    check('vitamin_c_mg', 'Vitamina C', ' mg');
    check('vitamin_d_iu', 'Vitamina D', ' IU');

    return issues;
}

// ASYNC: Generate daily meal plan from database with VALIDATION
// userPantryTerms: Array of food_id or ingredient names from user_pantry table
// rdaProfile: Optional sex/age profile for personalized micronutrient validation
export async function generateDayMealPlanFromDB(
    targetCalories: number,
    targetProtein: number,
    numMeals: 3 | 4 | 5 = 4,
    userPantryTerms?: string[],
    dietType: string = 'balanced',
    conditions: string[] = [],
    nutrientPriorities: string[] = [],
    varietyManager?: VarietyManager,
    rdaProfile?: RDAProfile,
    dayAssignments?: WeeklyDayAssignments
): Promise<MealPlan> {
    console.log(`\n📅 [DAY PLAN] Generating day plan: ${targetCalories} kcal, ${targetProtein}g protein, ${numMeals} meals`);
    console.log(`  🍽️  Diet: ${dietType}, Conditions: ${conditions.join(', ') || 'none'}`);
    console.log(`  🛒 User pantry terms/ids: ${userPantryTerms?.length || 0} items`);
    console.log(`  👤 RDA Profile: ${rdaProfile?.gender || 'default'}, ${rdaProfile?.age || 'N/A'} años, ${rdaProfile?.lifeStage || 'standard'}`);

    const normalizedDiet = normalizeDietType(dietType);
    // Determine strictness dynamically: keto/paleo = soft, standard/diabetes = hard
    const usdaMode = getUSDAComplianceMode(dietType, conditions);
    const pantryInfo = resolvePantryTerms(userPantryTerms);
    const pantryIds = pantryInfo.ids;
    const unmatchedTerms = pantryInfo.unmatched;

    // Load foods from database
    const dbFoods = await loadFoodsFromDB(nutrientPriorities, Array.from(pantryIds));
    console.log(`  💾 Loaded ${dbFoods.length} foods from database`);

    let filteredDbFoods: SimpleFoodItem[];

    if (userPantryTerms && userPantryTerms.length > 0) {
        if (unmatchedTerms.length > 0) {
            console.warn(`  ⚠️ Unmatched pantry terms (no IDs found): ${unmatchedTerms.join(', ')}`);
        }
        if (pantryIds.size === 0) {
            throw new Error(`Tu despensa no coincide con ningún alimento del catálogo. IDs no reconocidos: ${unmatchedTerms.slice(0, 5).join(', ')}${unmatchedTerms.length > 5 ? '...' : ''}. Revisa tu selección.`);
        }

        filteredDbFoods = dbFoods.filter(f => pantryIds.has(String(f.id)));
        const dbIdSet = new Set(dbFoods.map(f => String(f.id)));
        const missingIds = Array.from(pantryIds).filter(id => !dbIdSet.has(id));
        if (missingIds.length > 0) {
            console.warn(`  ⚠️ Pantry IDs missing in foods table: ${missingIds.join(', ')}`);
        }
        console.log(`  ✅ Pantry ID filter: ${filteredDbFoods.length} foods match user's ${pantryIds.size} pantry IDs (${unmatchedTerms.length} unmatched)`);

        if (filteredDbFoods.length === 0) {
            throw new Error(`Tu despensa no coincide con ningún alimento del catálogo. Revisa tu selección.`);
        }
    } else {
        // Fallback to onboarding whitelist if no pantry provided
        const baseWhitelist = ONBOARDING_FOOD_IDS;
        filteredDbFoods = dbFoods.filter(f => baseWhitelist.has(String(f.id)));
        console.log(`  ⚠️ No pantry provided, using default whitelist: ${filteredDbFoods.length} foods`);
    }

    if (filteredDbFoods.length === 0) {
        throw new Error('No foods available after applying onboarding selection. Please select more items in pantry setup.');
    }

    const servingTargets = getDietAdjustedServingTargets(targetCalories, dietType, conditions);

    // Hard check: ensure pantry covers core groups, otherwise abort with a clear message
    const coverage = { protein: 0, carb: 0, vegetable: 0, fruit: 0, fat: 0, dairy: 0, wholeGrain: 0 };
    filteredDbFoods.forEach(f => {
        const cat = getFunctionalCategory(f);
        if (cat === 'protein' || cat === 'legume') coverage.protein++;
        if (cat === 'carb') coverage.carb++;
        if (cat === 'vegetable') coverage.vegetable++;
        if (cat === 'fruit') coverage.fruit++;
        if (cat === 'fat') coverage.fat++;
        if (cat === 'dairy' || cat === 'beverage') coverage.dairy++;
        if (isWholeGrain(f)) coverage.wholeGrain++;
    });
    const breakfastProteinCount = filteredDbFoods.filter(f =>
        (f.category === 'protein' || f.category === 'dairy') && isFoodAppropriateForMeal(f, 'breakfast')
    ).length;
    const missing: string[] = [];
    if (coverage.protein === 0) missing.push('proteínas');
    if (coverage.carb === 0 && !['keto', 'paleo'].includes(normalizedDiet)) missing.push('carbohidratos');
    if (coverage.vegetable === 0 && (servingTargets?.vegetables.min || 0) > 0) missing.push('verduras');
    if (coverage.fruit === 0 && (servingTargets?.fruits.min || 0) > 0) missing.push('frutas');
    if (coverage.fat === 0 && (servingTargets?.healthyFats.min || 0) > 0) missing.push('grasas saludables');
    if (coverage.dairy === 0 && (servingTargets?.dairy.min || 0) > 0) missing.push('lácteos/bebidas');
    if (coverage.wholeGrain === 0 && (servingTargets?.wholeGrains.min || 0) > 0) missing.push('granos integrales');
    if (breakfastProteinCount === 0) missing.push('proteínas de desayuno (huevo/yogurt/tofu)');
    if (missing.length > 0) {
        const dietLabel = dietType || 'estándar';
        if (usdaMode === 'hard') {
            throw new Error(`Tu selección de despensa no cubre grupos obligatorios para la dieta ${dietLabel}: ${missing.join(', ')}. Agrega más opciones en esas categorías.`);
        } else {
            console.warn(`⚠️ Pantry coverage limitada para dieta ${dietLabel}: ${missing.join(', ')}`);
        }
    }

    const feasibilityFoods = applyDietFiltersForFeasibility(filteredDbFoods, dietType, conditions);
    const feasibility = assessPantryFeasibility(feasibilityFoods, numMeals, targetCalories, dietType, conditions, rdaProfile);
    if (!feasibility.ok) {
        if (usdaMode === 'hard') {
            throw new Error(`Tu despensa no puede cumplir USDA/RDA con porciones reales. Ajusta tu selección: ${feasibility.issues.join(' | ')}`);
        }
        console.warn(`⚠️ Pantry no cumple USDA/RDA completo (modo ${usdaMode}): ${feasibility.issues.join(' | ')}`);
    }

    // Create variety manager for this day (or use provided one for weekly plans)
    const dayVarietyManager = varietyManager || new VarietyManager(24);

    const meals: Meal[] = [];
    const distributions: Record<number, Record<string, number>> = {
        3: { breakfast: 0.30, lunch: 0.40, dinner: 0.30 },
        4: { breakfast: 0.25, snack1: 0.10, lunch: 0.35, dinner: 0.30 },
        5: { breakfast: 0.20, snack1: 0.10, lunch: 0.30, snack2: 0.10, dinner: 0.30 },
    };
    const dist = distributions[numMeals];
    const dayAssignment = dayAssignments || {};
    const foodById = new Map(filteredDbFoods.map(f => [String(f.id), f]));
    const hasSnack = Boolean(dist.snack1 || dist.snack2);
    const wholeGrainMeal: Meal['type'] = hasSnack ? 'lunch' : 'breakfast';

    const resolveRequiredIds = (mealType: Meal['type']): string[] => {
        const ids: string[] = [];
        const add = (id?: string) => { if (id) ids.push(String(id)); };
        const requireWhole = (servingTargets?.wholeGrains.min || 0) > 0;
        const requireFruit = (servingTargets?.fruits.min || 0) > 0;
        const requireDairy = (servingTargets?.dairy.min || 0) > 0;
        const requireFat = (servingTargets?.healthyFats.min || 0) > 0;
        const allowWhole = Boolean(dayAssignment.wholeGrainId) && requireWhole;

        if (mealType === 'breakfast') {
            if (requireDairy) add(dayAssignment.dairyId);
            if (!hasSnack && requireFruit) add(dayAssignment.fruitId);
            if (allowWhole && wholeGrainMeal === 'breakfast') add(dayAssignment.wholeGrainId);
        }
        if (mealType === 'snack') {
            if (hasSnack && requireFruit) add(dayAssignment.fruitId);
        }
        if (mealType === 'lunch') {
            add(dayAssignment.proteinId);
            add(dayAssignment.vegetableId);
            if (allowWhole && wholeGrainMeal === 'lunch') add(dayAssignment.wholeGrainId);
        }
        if (mealType === 'dinner') {
            if (requireFat) add(dayAssignment.fatId);
        }

        const unique = Array.from(new Set(ids)).filter(Boolean);
        if (unique.length === 0) return [];
        const resolved = unique.filter(id => {
            const food = foodById.get(id);
            if (!food) return false;
            return isFoodAppropriateForMeal(food, mealType);
        });
        if (resolved.length !== unique.length) {
            const missing = unique.filter(id => !resolved.includes(id));
            console.warn(`  ⚠️ Required IDs skipped for ${mealType}: ${missing.join(', ')}`);
        }
        return resolved;
    };

    const rdaTargets = rdaProfile ? getRDATargets(rdaProfile) : null;
    const remainingServings = servingTargets
        ? {
            vegetables: servingTargets.vegetables.min,
            fruits: servingTargets.fruits.min,
            dairy: servingTargets.dairy.min,
            protein: servingTargets.protein.min,
            wholeGrains: servingTargets.wholeGrains.min,
            healthyFats: servingTargets.healthyFats.min
        }
        : null;
    const remainingMicros: MacroTotals['micros'] | null = rdaTargets
        ? MICRO_KEYS.reduce<NonNullable<MacroTotals['micros']>>((acc, key) => {
            acc[key] = rdaTargets[key] || 0;
            return acc;
        }, {})
        : null;

    const totalMeals = Object.keys(dist).filter(k => (dist as any)[k]).length;
    let mealsRemaining = totalMeals;

    const buildGroupTargets = (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack', mealsLeft: number) => {
        if (!servingTargets || !remainingServings) return undefined;
        const perMealMax = (max: number) => (max > 0 ? max / Math.max(numMeals, 1) : 0);
        const perMealMin = (remaining: number, maxPerMeal: number) => {
            if (!remaining || remaining <= 0) return 0;
            const raw = remaining / Math.max(mealsLeft, 1);
            return maxPerMeal > 0 ? Math.min(raw, maxPerMeal) : raw;
        };
        const vegMax = perMealMax(servingTargets.vegetables.max);
        const fruitMax = perMealMax(servingTargets.fruits.max);
        const dairyMax = perMealMax(servingTargets.dairy.max);
        const fatMax = perMealMax(servingTargets.healthyFats.max);
        const wholeMax = perMealMax(servingTargets.wholeGrains.max);
        return {
            vegMinServings: mealType === 'breakfast' ? 0 : perMealMin(remainingServings.vegetables, vegMax),
            fruitMinServings: mealType === 'breakfast' ? perMealMin(remainingServings.fruits, fruitMax) : perMealMin(remainingServings.fruits, fruitMax),
            dairyMinServings: perMealMin(remainingServings.dairy, dairyMax),
            fatMinServings: perMealMin(remainingServings.healthyFats, fatMax),
            wholeGrainMinServings: perMealMin(remainingServings.wholeGrains, wholeMax),
            vegMaxServings: vegMax,
            fruitMaxServings: fruitMax,
            dairyMaxServings: dairyMax,
            fatMaxServings: fatMax,
            wholeGrainMaxServings: wholeMax
        };
    };

    const updateRemaining = (meal: Meal) => {
        if (!remainingServings) return;
        const mealPlan: MealPlan = { id: 'tmp', name: 'tmp', name_es: 'tmp', meals: [meal], totals: meal.totals };
        const counts = countServingsByGroup(mealPlan);
        remainingServings.vegetables = Math.max(0, remainingServings.vegetables - counts.vegetables);
        remainingServings.fruits = Math.max(0, remainingServings.fruits - counts.fruits);
        remainingServings.dairy = Math.max(0, remainingServings.dairy - counts.dairy);
        remainingServings.protein = Math.max(0, remainingServings.protein - counts.protein);
        remainingServings.wholeGrains = Math.max(0, remainingServings.wholeGrains - counts.wholeGrains);
        remainingServings.healthyFats = Math.max(0, remainingServings.healthyFats - counts.healthyFats);
    };

    const buildMicroTargets = (mealsLeft: number): MacroTotals['micros'] | undefined => {
        if (!remainingMicros) return undefined;
        const targets: MacroTotals['micros'] = {};
        MICRO_KEYS.forEach(key => {
            const remaining = (remainingMicros[key] || 0);
            if (remaining > 0) {
                targets[key] = remaining / Math.max(mealsLeft, 1);
            }
        });
        return targets;
    };

    const updateRemainingMicros = (meal: Meal) => {
        if (!remainingMicros) return;
        const micros = meal.totals.micros;
        if (!micros) return;
        MICRO_KEYS.forEach(key => {
            const val = micros[key] || 0;
            remainingMicros[key] = Math.max(0, (remainingMicros[key] || 0) - val);
        });
    };

    // Generate each meal
    if (dist.breakfast) {
        console.log(`\n--- Generating Breakfast ---`);
        const groupTargets = buildGroupTargets('breakfast', mealsRemaining);
        const microTargets = buildMicroTargets(mealsRemaining);
        const requiredIds = resolveRequiredIds('breakfast');
        const meal = await generateMealFromFoods(
            'breakfast',
            targetCalories * dist.breakfast,
            filteredDbFoods,
            dietType,
            conditions,
            nutrientPriorities,
            targetProtein * dist.breakfast,
            dayVarietyManager,
            targetCalories,
            rdaProfile?.age,
            microTargets,
            groupTargets,
            requiredIds
        );
        meals.push(meal);
        updateRemaining(meal);
        updateRemainingMicros(meal);
        mealsRemaining = Math.max(0, mealsRemaining - 1);
    }
    if (dist.snack1) {
        console.log(`\n--- Generating Snack 1 ---`);
        const groupTargets = buildGroupTargets('snack', mealsRemaining);
        const microTargets = buildMicroTargets(mealsRemaining);
        const requiredIds = resolveRequiredIds('snack');
        const meal = await generateMealFromFoods(
            'snack',
            targetCalories * dist.snack1,
            filteredDbFoods,
            dietType,
            conditions,
            nutrientPriorities,
            targetProtein * dist.snack1,
            dayVarietyManager,
            targetCalories,
            rdaProfile?.age,
            microTargets,
            groupTargets,
            requiredIds
        );
        meals.push(meal);
        updateRemaining(meal);
        updateRemainingMicros(meal);
        mealsRemaining = Math.max(0, mealsRemaining - 1);
    }
    if (dist.lunch) {
        console.log(`\n--- Generating Lunch ---`);
        const groupTargets = buildGroupTargets('lunch', mealsRemaining);
        const microTargets = buildMicroTargets(mealsRemaining);
        const requiredIds = resolveRequiredIds('lunch');
        const meal = await generateMealFromFoods(
            'lunch',
            targetCalories * dist.lunch,
            filteredDbFoods,
            dietType,
            conditions,
            nutrientPriorities,
            targetProtein * dist.lunch,
            dayVarietyManager,
            targetCalories,
            rdaProfile?.age,
            microTargets,
            groupTargets,
            requiredIds
        );
        meals.push(meal);
        updateRemaining(meal);
        updateRemainingMicros(meal);
        mealsRemaining = Math.max(0, mealsRemaining - 1);
    }
    if (dist.snack2) {
        console.log(`\n--- Generating Snack 2 ---`);
        const groupTargets = buildGroupTargets('snack', mealsRemaining);
        const microTargets = buildMicroTargets(mealsRemaining);
        const requiredIds = resolveRequiredIds('snack');
        const meal = await generateMealFromFoods(
            'snack',
            targetCalories * dist.snack2,
            filteredDbFoods,
            dietType,
            conditions,
            nutrientPriorities,
            targetProtein * dist.snack2,
            dayVarietyManager,
            targetCalories,
            rdaProfile?.age,
            microTargets,
            groupTargets,
            requiredIds
        );
        meals.push(meal);
        updateRemaining(meal);
        updateRemainingMicros(meal);
        mealsRemaining = Math.max(0, mealsRemaining - 1);
    }
    if (dist.dinner) {
        console.log(`\n--- Generating Dinner ---`);
        const groupTargets = buildGroupTargets('dinner', mealsRemaining);
        const microTargets = buildMicroTargets(mealsRemaining);
        const requiredIds = resolveRequiredIds('dinner');
        const meal = await generateMealFromFoods(
            'dinner',
            targetCalories * dist.dinner,
            filteredDbFoods,
            dietType,
            conditions,
            nutrientPriorities,
            targetProtein * dist.dinner,
            dayVarietyManager,
            targetCalories,
            rdaProfile?.age,
            microTargets,
            groupTargets,
            requiredIds
        );
        meals.push(meal);
        updateRemaining(meal);
        updateRemainingMicros(meal);
        mealsRemaining = Math.max(0, mealsRemaining - 1);
    }

    // Final Aggregation
    const finalTotals = {
        kcal: meals.reduce((sum, m) => sum + m.totals.kcal, 0),
        protein: meals.reduce((sum, m) => sum + m.totals.protein, 0),
        carbs: meals.reduce((sum, m) => sum + m.totals.carbs, 0),
        fat: meals.reduce((sum, m) => sum + m.totals.fat, 0),
        fiber: meals.reduce((sum, m) => sum + (m.totals.fiber || 0), 0),
        sodium_mg: meals.reduce((sum, m) => sum + (m.totals.sodium_mg || 0), 0),
        sugar_g: meals.reduce((sum, m) => sum + (m.totals.sugar_g || 0), 0),
        sat_fat_g: meals.reduce((sum, m) => sum + (m.totals.sat_fat_g || 0), 0),
    };

    const microTotals = aggregateMicrosFromMeals(meals);

    const deviations = [];
    const calorieDiff = ((finalTotals.kcal - targetCalories) / targetCalories) * 100;
    const proteinDiff = ((finalTotals.protein - targetProtein) / targetProtein) * 100;

    if (Math.abs(calorieDiff) > 10) deviations.push(`Calories ${calorieDiff > 0 ? '+' : ''}${calorieDiff.toFixed(1)}%`);
    if (Math.abs(proteinDiff) > 10) deviations.push(`Protein ${proteinDiff > 0 ? '+' : ''}${proteinDiff.toFixed(1)}%`);

    // USDA hard validation (throws if broken)
    const planForValidation: MealPlan = { id: 'day', name: 'Day', name_es: 'Día', meals, totals: { ...finalTotals, micros: microTotals } };
    const usdaHard = validateUSDAHard(planForValidation, targetCalories, rdaProfile?.age, dietType, conditions);
    if (!usdaHard.isValid) {
        if (usdaMode === 'hard') {
            console.error('❌ USDA hard validation failed:', usdaHard.issues);
            throw new Error(`USDA hard fail: ${usdaHard.issues.join(' | ')}`);
        }
        deviations.push(...usdaHard.issues.map(issue => `⚠️ USDA: ${issue}`));
        console.warn('⚠️ USDA soft validation issues:', usdaHard.issues);
    }

    // Micronutrient checks with sex/age-specific RDA targets (soft warnings)
    const planFoods = meals.flatMap(meal => meal.items.map(item => item.food));
    const microIssues = validateMicros(microTotals, rdaProfile, planFoods);

    // Daily composition checks: 2 frutas, 2 verduras, 1 grasa, 1-2 lácteos, máx 1 legumbre principal
    const dayCounts = { fruit: 0, vegetable: 0, fat: 0, dairy: 0, legume: 0 };
    meals.forEach(m => {
        m.items.forEach(it => {
            const cat = it.food.category;
            if (cat === 'fruit') dayCounts.fruit++;
            if (cat === 'vegetable') dayCounts.vegetable++;
            if (cat === 'fat') dayCounts.fat++;
            if (cat === 'dairy') dayCounts.dairy++;
            if (cat === 'legume') dayCounts.legume++;
        });
    });
    if (dayCounts.fruit < 2) deviations.push(`⚠️ Frutas insuficientes (${dayCounts.fruit}/2)`);
    if (dayCounts.vegetable < 2) deviations.push(`⚠️ Verduras insuficientes (${dayCounts.vegetable}/2)`);
    if (dayCounts.fat < 1) deviations.push(`⚠️ Grasas saludables insuficientes (${dayCounts.fat}/1)`);
    if (dayCounts.dairy < 1) deviations.push(`⚠️ Lácteos insuficientes (${dayCounts.dairy}/1)`);
    if (dayCounts.dairy > 2) deviations.push(`⚠️ Lácteos excedidos (${dayCounts.dairy}/2)`);
    if (dayCounts.legume > 1) deviations.push(`⚠️ Demasiadas legumbres principales (${dayCounts.legume}/1)`);

    if (microIssues.length > 0) {
        if (usdaMode === 'hard') {
            console.error('❌ Micronutrient targets not met:', microIssues);
            throw new Error(`Micronutrientes insuficientes: ${microIssues.join(' | ')}`);
        }
        deviations.push(...microIssues.map(issue => `⚠️ Micro: ${issue}`));
        console.warn('⚠️ Micronutrient warnings:', microIssues);
    }

    console.log(`\n🎉 [DAY PLAN COMPLETE]`);
    console.log(`  Total: ${finalTotals.kcal} kcal, ${finalTotals.protein}g P, ${finalTotals.carbs}g C, ${finalTotals.fat}g F`);
    console.log(`  Deviation: ${((finalTotals.kcal - targetCalories) / targetCalories * 100).toFixed(1)}% kcal, ${((finalTotals.protein - targetProtein) / targetProtein * 100).toFixed(1)}% protein`);


    return {
        id: `plan_${Date.now()}`,
        name: 'Daily Meal Plan',
        name_es: 'Plan de Comidas Diario',
        meals,
        totals: { ...finalTotals, micros: microTotals },
        deviations
    };
}

const weeklyPenalty = (f: SimpleFoodItem): number => {
    let p = 0;
    if ((f.sodium_mg ?? 0) > 700) p += 3;
    if ((f.sugar_g ?? 0) > 12 && f.category !== 'fruit') p += 3;
    if ((f.sat_fat_g ?? 0) > 6) p += 2;
    if (f.processing_level === 'ultra_processed') p += 8;
    if (f.category === 'carb' && !isWholeGrain(f) && (f.fiber ?? 0) < 2) p += 2;
    if (f.data_quality_flags && typeof f.data_quality_flags === 'object') {
        const confidence = (f.data_quality_flags as any).confidence;
        if (typeof confidence === 'number' && confidence < 0.7) p += 2;
    }
    return p;
};

const buildWeeklyAssignmentsMILP = async (
    foods: SimpleFoodItem[],
    dietType: string,
    targetCalories: number,
    conditions: string[] = [],
    days: number = 7
): Promise<WeeklyDayAssignments[] | null> => {
    const glpk = await getGlpk();
    const servingTargets = getDietAdjustedServingTargets(targetCalories, dietType, conditions);

    const baseConfigs: Array<{
        key: keyof WeeklyDayAssignments;
        label: string;
        baseMaxRepeat: number;
        filter: (f: SimpleFoodItem) => boolean;
    }> = [
            { key: 'proteinId', label: 'proteínas', baseMaxRepeat: 2, filter: f => ['protein', 'legume'].includes(f.category) },
            { key: 'vegetableId', label: 'verduras', baseMaxRepeat: 3, filter: f => f.category === 'vegetable' },
            { key: 'wholeGrainId', label: 'integrales', baseMaxRepeat: 4, filter: f => f.category === 'carb' && isWholeGrain(f) },
            { key: 'fatId', label: 'grasas', baseMaxRepeat: 4, filter: f => f.category === 'fat' },
            { key: 'fruitId', label: 'frutas', baseMaxRepeat: 3, filter: f => f.category === 'fruit' },
            { key: 'dairyId', label: 'lácteos', baseMaxRepeat: 3, filter: f => f.category === 'dairy' || f.category === 'beverage' },
        ];

    const configs = baseConfigs.filter(cfg => {
        if (dietType === 'keto' && cfg.key === 'wholeGrainId') return false;
        if (!servingTargets) return true;
        const targetKey = cfg.key === 'proteinId' ? 'protein'
            : cfg.key === 'vegetableId' ? 'vegetables'
                : cfg.key === 'wholeGrainId' ? 'wholeGrains'
                    : cfg.key === 'fatId' ? 'healthyFats'
                        : cfg.key === 'fruitId' ? 'fruits'
                            : 'dairy';
        return servingTargets[targetKey].min > 0;
    });

    const selectCandidates = (filter: (f: SimpleFoodItem) => boolean) => {
        return foods
            .filter(filter)
            .filter(f => f.category !== 'condiment')
            .filter(f => f.processing_level !== 'ultra_processed')
            .sort((a, b) => weeklyPenalty(a) - weeklyPenalty(b))
            .slice(0, 14);
    };

    const candidatesByKey = new Map<keyof WeeklyDayAssignments, SimpleFoodItem[]>();
    configs.forEach(cfg => {
        const list = selectCandidates(cfg.filter);
        if (list.length > 0) {
            candidatesByKey.set(cfg.key, list);
        } else {
            console.warn(`  ⚠️ Sin candidatos semanales para ${cfg.label}`);
        }
    });

    if (candidatesByKey.size === 0) return null;

    const vars: any[] = [];
    const subjectTo: any[] = [];
    const bounds: any[] = [];
    const binaries: string[] = [];

    const addConstraint = (name: string, vars: any[], bnds: any) => {
        subjectTo.push({ name, vars, bnds });
    };

    configs.forEach(cfg => {
        const list = candidatesByKey.get(cfg.key);
        if (!list || list.length === 0) return;
        const minNeeded = Math.ceil(days / list.length);
        const maxRepeat = Math.max(cfg.baseMaxRepeat, minNeeded);

        for (let d = 0; d < days; d++) {
            const dayVars: any[] = [];
            list.forEach((food, idx) => {
                const vName = `w_${cfg.key}_${d}_${idx}`;
                vars.push({ name: vName, coef: weeklyPenalty(food) });
                bounds.push({ name: vName, type: glpk.GLP_DB, lb: 0, ub: 1 });
                binaries.push(vName);
                dayVars.push({ name: vName, coef: 1 });
            });
            addConstraint(`${cfg.key}_day_${d}`, dayVars, { type: glpk.GLP_FX, lb: 1, ub: 1 });
        }

        list.forEach((_, idx) => {
            const repVars: any[] = [];
            for (let d = 0; d < days; d++) {
                repVars.push({ name: `w_${cfg.key}_${d}_${idx}`, coef: 1 });
            }
            addConstraint(`${cfg.key}_repeat_${idx}`, repVars, { type: glpk.GLP_UP, ub: maxRepeat });
        });
    });

    const lp = {
        name: 'weekly_milp',
        objective: { direction: glpk.GLP_MIN, name: 'obj', vars },
        subjectTo,
        bounds,
        binaries
    };

    const result = glpk.solve(lp, { msgLevel: glpk.GLP_MSG_OFF });
    if (!result || result.result.status !== glpk.GLP_OPT) {
        console.warn('  ⚠️ Weekly MILP solver failed');
        return null;
    }

    const assignments: WeeklyDayAssignments[] = Array.from({ length: days }, () => ({} as WeeklyDayAssignments));
    configs.forEach(cfg => {
        const list = candidatesByKey.get(cfg.key);
        if (!list || list.length === 0) return;
        for (let d = 0; d < days; d++) {
            for (let idx = 0; idx < list.length; idx++) {
                const vName = `w_${cfg.key}_${d}_${idx}`;
                const chosen = result.result.vars[vName] || 0;
                if (chosen >= 0.5) {
                    assignments[d][cfg.key] = list[idx].id;
                    break;
                }
            }
        }
    });

    return assignments;
};

// ASYNC: Generate weekly meal plan from database
// userPantryTerms: Array of search_term values from user_pantry table
// rdaProfile: Optional sex/age profile for personalized micronutrient validation
export async function generateWeeklyMealPlanFromDB(
    targetCalories: number,
    targetProtein: number,
    numMeals: 3 | 4 | 5 = 4,
    userPantryTerms?: string[],
    dietType: string = 'balanced',
    conditions: string[] = [],
    nutrientPriorities: string[] = [],
    rdaProfile?: RDAProfile
): Promise<WeeklyMealPlan> {
    const days: MealPlan[] = [];
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    // ✅ Create ONE master variety manager for the entire week
    const masterVarietyManager = new VarietyManager(72);
    console.log(`\n🗓️  [WEEK PLAN] Creating master variety manager for 7 days`);
    console.log(`  🛒 User pantry terms: ${userPantryTerms?.length || 0} items`);
    console.log(`  👤 RDA Profile: ${rdaProfile?.gender || 'default'}, ${rdaProfile?.age || 'N/A'} años`);

    const pantryInfo = resolvePantryTerms(userPantryTerms);
    const pantryIds = pantryInfo.ids;
    const unmatchedTerms = pantryInfo.unmatched;

    const dbFoods = await loadFoodsFromDB(nutrientPriorities, Array.from(pantryIds));
    let filteredDbFoods: SimpleFoodItem[];

    if (userPantryTerms && userPantryTerms.length > 0) {
        if (unmatchedTerms.length > 0) {
            console.warn(`  ⚠️ Unmatched pantry terms (no IDs found): ${unmatchedTerms.join(', ')}`);
        }
        if (pantryIds.size === 0) {
            throw new Error('Tu despensa no coincide con ningún alimento del catálogo. Revisa tu selección.');
        }

        filteredDbFoods = dbFoods.filter(f => pantryIds.has(String(f.id)));
        const dbIdSet = new Set(dbFoods.map(f => String(f.id)));
        const missingIds = Array.from(pantryIds).filter(id => !dbIdSet.has(id));
        if (missingIds.length > 0) {
            console.warn(`  ⚠️ Pantry IDs missing in foods table: ${missingIds.join(', ')}`);
        }
    } else {
        filteredDbFoods = dbFoods.filter(f => ONBOARDING_FOOD_IDS.has(String(f.id)));
    }

    const weeklyFoods = applyDietFiltersForFeasibility(filteredDbFoods, dietType, conditions);
    const weeklyAssignments = await buildWeeklyAssignmentsMILP(weeklyFoods, dietType, targetCalories, conditions, 7);

    for (let i = 0; i < 7; i++) {
        const plan = await generateDayMealPlanFromDB(
            targetCalories,
            targetProtein,
            numMeals,
            userPantryTerms,
            dietType,
            conditions,
            nutrientPriorities,
            masterVarietyManager,
            rdaProfile,
            weeklyAssignments ? weeklyAssignments[i] : undefined
        );
        plan.id = `day_${i}_${Date.now()}_${Math.random()}`;
        plan.name_es = `Día ${i + 1} - ${dayNames[i]}`;
        days.push(plan);
    }

    const totalMacros = sumMacros(days.map(d => d.totals));
    const weeklyAvg: MacroTotals = {
        kcal: Math.round(totalMacros.kcal / 7),
        protein: Math.round(totalMacros.protein / 7),
        carbs: Math.round(totalMacros.carbs / 7),
        fat: Math.round(totalMacros.fat / 7),
    };

    return {
        id: `week_${Date.now()}`,
        days,
        week_totals: weeklyAvg
    };
}
