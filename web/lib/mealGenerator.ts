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

// Basic food items with nutrition per 100g
export interface SimpleFoodItem {
    id: string;
    name: string;
    name_es: string;
    emoji: string;
    category: 'protein' | 'carb' | 'vegetable' | 'fat' | 'fruit' | 'dairy' | 'condiment' | 'beverage';
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sodium_mg?: number;
    sugar_g?: number;
    sat_fat_g?: number;
    // Clinical Micros (Values per 100g)
    micros?: {
        iron_mg?: number;    // Hierro (Pregnancy/Anemia)
        calcium_mg?: number; // Calcio (Bones/Menopause)
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
    { id: 'beans_black', name: 'Black Beans', name_es: 'Frijoles Negros', emoji: '🫘', category: 'carb', kcal: 132, protein: 8.9, carbs: 24, fat: 0.5, fiber: 8.7, portion_g: 150, serving_size: 172, serving_unit: 'cup cooked', micros: { iron_mg: 2.1, folate_mcg: 149, magnesium_mg: 70 }, cooking_states: ['cooked'] },
    { id: 'lentils', name: 'Lentils', name_es: 'Lentejas', emoji: '🫘', category: 'carb', kcal: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 7.9, portion_g: 150, serving_size: 198, serving_unit: 'cup cooked', micros: { iron_mg: 3.3, folate_mcg: 181, magnesium_mg: 36 }, cooking_states: ['cooked'] },

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

export interface MacroTotals {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sodium_mg?: number;
    sugar_g?: number;
    sat_fat_g?: number;
}

// Calculate macros for a portion
function calculateItemMacros(food: SimpleFoodItem, portion_g: number): MacroTotals {
    const factor = portion_g / 100;
    return {
        kcal: Math.round(food.kcal * factor),
        protein: Math.round(food.protein * factor * 10) / 10,
        carbs: Math.round(food.carbs * factor * 10) / 10,
        fat: Math.round(food.fat * factor * 10) / 10,
        fiber: food.fiber ? Math.round(food.fiber * factor * 10) / 10 : 0,
        sodium_mg: food.sodium_mg ? Math.round(food.sodium_mg * factor) : 0,
        sugar_g: food.sugar_g ? Math.round(food.sugar_g * factor * 10) / 10 : 0,
        sat_fat_g: food.sat_fat_g ? Math.round(food.sat_fat_g * factor * 10) / 10 : 0,
    };
}

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
        sat_fat_g: (acc.sat_fat_g || 0) + (item.sat_fat_g || 0),
    }), { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium_mg: 0, sugar_g: 0, sat_fat_g: 0 });
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
        const { createClient } = await import('@/lib/supabase/client');
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

    getAvailableFoods(foods: SimpleFoodItem[], cooldownHours: number = 12): SimpleFoodItem[] {
        return foods.filter(f => !this.shouldSkip(f.id, cooldownHours));
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
async function loadFoodsFromDB(nutrientPriorities: string[] = []): Promise<SimpleFoodItem[]> {
    try {
        const { createClient } = await import('@/lib/supabase/client');
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

        // Transform raw DB data to SimpleFoodItem format
        const transformed: SimpleFoodItem[] = data.map(d => {
            // Detect category based on culinary_category field
            // Detect category based on MULTIPLE fields (category, category_es, culinary_category)
            let category: SimpleFoodItem['category'] | 'other' = 'other'; // Change default to 'other' to avoid protein pollution

            // Combine all category fields for search
            const catSearch = (
                (d.category || '') + ' ' +
                (d.category_es || '') + ' ' +
                (d.culinary_category || '') + ' ' +
                (d.name || '')
            ).toLowerCase();

            if (catSearch.includes('proteina') || catSearch.includes('carne') || catSearch.includes('pescado') || catSearch.includes('mariscos') || catSearch.includes('huevo') || catSearch.includes('chicken') || catSearch.includes('beef') || catSearch.includes('pork') || catSearch.includes('turkey') || catSearch.includes('fish') || catSearch.includes('meat') || catSearch.includes('egg') || catSearch.includes('tofu')) {
                category = 'protein';
            } else if (catSearch.includes('carbohidrato') || catSearch.includes('grano') || catSearch.includes('cereal') || catSearch.includes('pan') || catSearch.includes('pasta') || catSearch.includes('arroz') || catSearch.includes('rice') || catSearch.includes('bread') || catSearch.includes('oat') || catSearch.includes('quinoa') || catSearch.includes('potato') || catSearch.includes('camote') || catSearch.includes('yuca')) {
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

            // Smart defaults for serving size
            let sSize = d.serving_size || 100;
            let sUnit = d.serving_unit || 'g';

            return {
                id: String(d.id),
                name: d.name,
                name_es: cleanName,
                emoji: d.emoji || '🍽️',
                category,
                kcal: d.kcal_per_100g || 0,
                protein: d.protein_g_per_100g || 0,
                carbs: d.carbs_g_per_100g || 0,
                fat: d.fat_g_per_100g || 0,
                portion_g: 100,
                serving_size: sSize,
                serving_unit: sUnit,
                meal_times: d.meal_times || [],
                is_common_staple: d.is_common_staple || false,
                cooking_states: d.cooking_states || [],
                fiber: d.fiber_g || d.fiber_g_per_100g || 0,
                sodium_mg: d.sodium_mg || d.sodium_mg_per_100g || 0,
                sugar_g: d.sugar_g || d.sugars_g || d.sugar_g_per_100g || 0,
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
        });

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
function generateMealFromFoods(
    type: Meal['type'],
    targetCalories: number,
    foods: SimpleFoodItem[],
    dietType: string = 'balanced',
    conditions: string[] = [],
    nutrientPriorities: string[] = [],
    targetProteinGrams?: number,
    varietyManager?: VarietyManager
): Meal {
    const typeNames: Record<string, string> = {
        breakfast: 'Desayuno',
        lunch: 'Almuerzo',
        dinner: 'Cena',
        snack: 'Snack',
    };

    console.log(`\n🍽️  [MEAL GEN] Generating ${type} - Target: ${targetCalories} kcal, ${targetProteinGrams || 'auto'}g protein`);

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
            !(f.category === 'fruit' && f.carbs > 10) &&
            !(f.category === 'dairy' && f.carbs > 5)
        );
        console.log(`  🥑 Keto filter: ${filteredFoods.length} foods`);
    }
    if (dietType === 'vegan') {
        filteredFoods = filteredFoods.filter(f =>
            !['protein', 'dairy'].includes(f.category) ||
            f.name.toLowerCase().includes('bean') ||
            f.name.toLowerCase().includes('lentil') ||
            f.name.toLowerCase().includes('tofu')
        );
        console.log(`  🌱 Vegan filter: ${filteredFoods.length} foods`);
    }
    if (dietType === 'vegetarian') {
        filteredFoods = filteredFoods.filter(f =>
            f.category !== 'protein' ||
            f.name.toLowerCase().includes('egg') ||
            f.name.toLowerCase().includes('bean') ||
            f.name.toLowerCase().includes('lentil')
        );
        console.log(`  🥚 Vegetarian filter: ${filteredFoods.length} foods`);
    }
    if (dietType === 'diabetes_friendly' || conditions.includes('diabetes_type_2')) {
        filteredFoods = filteredFoods.filter(f =>
            !(f.category === 'carb' && f.carbs > 25 && !f.fiber)
        );
        console.log(`  💉 Diabetes filter: ${filteredFoods.length} foods`);
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
        condiment: [],
        beverage: []
    };

    filteredFoods.forEach(f => {
        const role = assignRole(f);
        buckets[role].push(f);
    });

    console.log(`  📊 Buckets: P=${buckets.protein.length}, C=${buckets.carb.length}, V=${buckets.veggie.length}, F=${buckets.fat.length}, D=${buckets.dairy.length}, Cnd=${buckets.condiment.length}`);

    // Map old variable names to new buckets for compatibility with rest of function
    // But logically we should use the buckets directly.
    let proteins = buckets.protein;
    let carbs = buckets.carb;
    let vegetables = buckets.veggie;
    let fats = buckets.fat;
    let fruits = buckets.fruit;
    let dairy = buckets.dairy;

    // Special Case: Vegans/Vegetarians count legumes as proteins
    if (dietType === 'vegan' || dietType === 'vegetarian') {
        // Find legumes in veggie/carb buckets and add to protein candidates
        const legumes = [...buckets.veggie, ...buckets.carb].filter(f =>
            f.name.toLowerCase().includes('lentil') ||
            f.name.toLowerCase().includes('bean') ||
            f.name.toLowerCase().includes('tofu') ||
            f.name.toLowerCase().includes('chickpea')
        );
        proteins = [...proteins, ...legumes];
    }

    console.log(`  📊 Categories: P=${proteins.length}, C=${carbs.length}, V=${vegetables.length}, F=${fats.length}, Fr=${fruits.length}, D=${dairy.length}`);

    // Apply variety filtering
    if (varietyManager) {
        const beforeVariety = proteins.length + carbs.length + vegetables.length;
        proteins = varietyManager.getAvailableFoods(proteins, 6);
        carbs = varietyManager.getAvailableFoods(carbs, 12);
        vegetables = varietyManager.getAvailableFoods(vegetables, 8);
        fats = varietyManager.getAvailableFoods(fats, 12);
        fruits = varietyManager.getAvailableFoods(fruits, 12);
        const afterVariety = proteins.length + carbs.length + vegetables.length;
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
    const mealProteinTarget = targetProteinGrams || (targetCalories * proteinRatio) / 4;
    const mealCarbTarget = (targetCalories * carbRatio) / 4;
    const mealFatTarget = (targetCalories * fatRatio) / 9;

    console.log(`  🎯 Meal targets: ${mealProteinTarget.toFixed(1)}g P, ${mealCarbTarget.toFixed(1)}g C, ${mealFatTarget.toFixed(1)}g F`);

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

    // STEP 1: Add primary protein
    // Template: Breakfast can use High-Protein Dairy (Greek Yogurt/Cottage) or Protein (Eggs). Lunch/Dinner uses Protein (Meat/Fish).

    // Quality scoring function - lower is better
    const qualityPenalty = (f: SimpleFoodItem): number => {
        let p = 0;
        if ((f.sodium_mg ?? 0) > 700) p += 3;
        if ((f.sugar_g ?? 0) > 12 && f.category !== 'fruit') p += 3;
        if ((f.sat_fat_g ?? 0) > 6) p += 2;
        return p;
    };

    // Pick best candidate by scoring (lower = better)
    const pickBest = (candidates: SimpleFoodItem[], scorer: (f: SimpleFoodItem) => number): SimpleFoodItem | undefined => {
        if (candidates.length === 0) return undefined;
        return candidates.reduce((best, f) => scorer(f) < scorer(best) ? f : best);
    };

    let proteinSourceList = proteins;
    if (type === 'breakfast') {
        // Only HIGH-PROTEIN dairy (≥8g protein, ≤12g sugar) qualifies for breakfast
        const highProteinDairy = dairy.filter(d => d.protein >= 8 && (d.sugar_g ?? 0) <= 12);
        proteinSourceList = [...proteins, ...highProteinDairy];
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

                    items.push({
                        food: selectedProtein,
                        portion_g: finalG,
                        cooking_state: selectedProtein.cooking_states?.[0],
                        macros: calculateItemMacros(selectedProtein, finalG)
                    });

                    if (varietyManager) varietyManager.markUsed(selectedProtein.id, type, 'primaryProtein');
                    console.log(`  ✅ Added protein: ${selectedProtein.name_es} ${finalG}g`);
                    logPortionCalculation(selectedProtein, portionResult);
                }
            }
        }
    }

    // STEP 2: Add primary carb (if not keto)
    // Template: Breakfast/Lunch/Dinner usually have a carb. Snack might not.
    if (dietType !== 'keto' && carbs.length > 0 && type !== 'snack') {
        const carbCandidates = carbs.slice(0, Math.min(10, carbs.length));
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
                    items.push({
                        food: selectedCarb,
                        portion_g: portionResult.finalPortion,
                        cooking_state: selectedCarb.cooking_states?.[0],
                        macros: calculateItemMacros(selectedCarb, portionResult.finalPortion)
                    });

                    if (varietyManager) varietyManager.markUsed(selectedCarb.id, type, 'primaryCarb');
                    console.log(`  ✅ Added carb: ${selectedCarb.name_es} ${portionResult.finalPortion}g`);
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
                    items.push({
                        food: selectedVeggie,
                        portion_g: portionResult.finalPortion,
                        cooking_state: selectedVeggie.cooking_states?.[0],
                        macros: calculateItemMacros(selectedVeggie, portionResult.finalPortion)
                    });

                    if (varietyManager) varietyManager.markUsed(selectedVeggie.id, type, 'vegetable');
                    console.log(`  ✅ Added vegetable: ${selectedVeggie.name_es} ${portionResult.finalPortion}g`);
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
                items.push({
                    food: selectedFruit,
                    portion_g: portionResult.finalPortion,
                    cooking_state: 'raw',
                    macros: calculateItemMacros(selectedFruit, portionResult.finalPortion)
                });

                if (varietyManager) varietyManager.markUsed(selectedFruit.id, type, 'fruit');
                console.log(`  ✅ Added fruit: ${selectedFruit.name_es} ${portionResult.finalPortion}g`);
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
                items.push({
                    food: selectedFat,
                    portion_g: portionResult.finalPortion,
                    cooking_state: selectedFat.cooking_states?.[0] || 'raw',
                    macros: calculateItemMacros(selectedFat, portionResult.finalPortion)
                });

                if (varietyManager) varietyManager.markUsed(selectedFat.id, type, 'healthyFat');
                console.log(`  ✅ Added fat: ${selectedFat.name_es} ${portionResult.finalPortion}g`);
            }
        }
    }

    // ========================================
    // PHASE 4: FINAL ADJUSTMENTS
    // ========================================

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

// USDA Post-Validation Guardrails
function validateUSDA(plan: MealPlan, targetCalories: number): string[] {
    const issues: string[] = [];
    const totals = plan.totals;

    // 1. Added Sugars (<10% of kcal)
    // 1g Sugar = 4 kcal
    const sugarKcal = (totals.sugar_g || 0) * 4; // Using Total Sugar as proxy if added not separated, but strictly USDA says Added.
    // NOTE: DB has 'sugar_g' which is likely Total. 'added_sugars_g' might be 0 if not mapped.
    // We will use a loose check on Total Sugar for now, or Added if available.
    // Ideally we want Added. Let's assume we map 'sugar_g' as Total for fruit/dairy context awareness?
    // Actually, simple food DBs don't always distinguish.
    // Let's check: If Sugar > 50g (approx 200kcal) AND it's not mostly fruit...
    const sugarPct = (sugarKcal / totals.kcal) * 100;
    if (sugarPct > 15) { // Looser 15% for Total Sugar (Fruit included)
        issues.push(`⚠️ High Sugar: ${sugarPct.toFixed(1)}% of kcal (Limit 15% Total / 10% Added)`);
    }

    // 2. Sodium (<2300mg)
    if ((totals.sodium_mg || 0) > 2300) {
        issues.push(`⚠️ High Sodium: ${totals.sodium_mg}mg (Limit 2300mg)`);
    }

    // 3. Saturated Fat (<10% of kcal)
    const satFatKcal = (totals.sat_fat_g || 0) * 9;
    const satFatPct = (satFatKcal / totals.kcal) * 100;
    if (satFatPct > 10) {
        issues.push(`⚠️ High Saturated Fat: ${satFatPct.toFixed(1)}% (Limit 10%)`);
    }

    return issues;
}

// ASYNC: Generate daily meal plan from database with VALIDATION
export async function generateDayMealPlanFromDB(
    targetCalories: number,
    targetProtein: number,
    numMeals: 3 | 4 | 5 = 4,
    availableFoods?: string[],
    dietType: string = 'balanced',
    conditions: string[] = [],
    nutrientPriorities: string[] = [],
    varietyManager?: VarietyManager
): Promise<MealPlan> {
    console.log(`\n📅 [DAY PLAN] Generating day plan: ${targetCalories} kcal, ${targetProtein}g protein, ${numMeals} meals`);
    console.log(`  🍽️  Diet: ${dietType}, Conditions: ${conditions.join(', ') || 'none'}`);

    // Load foods from database
    const dbFoods = await loadFoodsFromDB(nutrientPriorities);
    console.log(`  💾 Loaded ${dbFoods.length} foods from database`);

    // Create variety manager for this day (or use provided one for weekly plans)
    const dayVarietyManager = varietyManager || new VarietyManager();

    const meals: Meal[] = [];
    const distributions: Record<number, Record<string, number>> = {
        3: { breakfast: 0.30, lunch: 0.40, dinner: 0.30 },
        4: { breakfast: 0.25, snack1: 0.10, lunch: 0.35, dinner: 0.30 },
        5: { breakfast: 0.20, snack1: 0.10, lunch: 0.30, snack2: 0.10, dinner: 0.30 },
    };
    const dist = distributions[numMeals];

    // Generate each meal
    if (dist.breakfast) {
        console.log(`\n--- Generating Breakfast ---`);
        meals.push(generateMealFromFoods(
            'breakfast',
            targetCalories * dist.breakfast,
            dbFoods,
            dietType,
            conditions,
            nutrientPriorities,
            targetProtein * dist.breakfast,
            dayVarietyManager
        ));
    }
    if (dist.snack1) {
        console.log(`\n--- Generating Snack 1 ---`);
        meals.push(generateMealFromFoods(
            'snack',
            targetCalories * dist.snack1,
            dbFoods,
            dietType,
            conditions,
            nutrientPriorities,
            targetProtein * dist.snack1,
            dayVarietyManager
        ));
    }
    if (dist.lunch) {
        console.log(`\n--- Generating Lunch ---`);
        meals.push(generateMealFromFoods(
            'lunch',
            targetCalories * dist.lunch,
            dbFoods,
            dietType,
            conditions,
            nutrientPriorities,
            targetProtein * dist.lunch,
            dayVarietyManager
        ));
    }
    if (dist.snack2) {
        console.log(`\n--- Generating Snack 2 ---`);
        meals.push(generateMealFromFoods(
            'snack',
            targetCalories * dist.snack2,
            dbFoods,
            dietType,
            conditions,
            nutrientPriorities,
            targetProtein * dist.snack2,
            dayVarietyManager
        ));
    }
    if (dist.dinner) {
        console.log(`\n--- Generating Dinner ---`);
        meals.push(generateMealFromFoods(
            'dinner',
            targetCalories * dist.dinner,
            dbFoods,
            dietType,
            conditions,
            nutrientPriorities,
            targetProtein * dist.dinner,
            dayVarietyManager
        ));
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

    const deviations = [];
    const calorieDiff = ((finalTotals.kcal - targetCalories) / targetCalories) * 100;
    const proteinDiff = ((finalTotals.protein - targetProtein) / targetProtein) * 100;

    if (Math.abs(calorieDiff) > 10) deviations.push(`Calories ${calorieDiff > 0 ? '+' : ''}${calorieDiff.toFixed(1)}%`);
    if (Math.abs(proteinDiff) > 10) deviations.push(`Protein ${proteinDiff > 0 ? '+' : ''}${proteinDiff.toFixed(1)}%`);

    // USDA GUARDRAILS
    const usdaIssues = validateUSDA({ id: 'day', name: 'Day', name_es: 'Día', meals: [], totals: finalTotals }, targetCalories);

    if (usdaIssues.length > 0) {
        console.warn('⚠️ USDA Guardrails triggered:', usdaIssues);
        deviations.push(...usdaIssues);
    }

    console.log(`\n🎉 [DAY PLAN COMPLETE]`);
    console.log(`  Total: ${finalTotals.kcal} kcal, ${finalTotals.protein}g P, ${finalTotals.carbs}g C, ${finalTotals.fat}g F`);
    console.log(`  Deviation: ${((finalTotals.kcal - targetCalories) / targetCalories * 100).toFixed(1)}% kcal, ${((finalTotals.protein - targetProtein) / targetProtein * 100).toFixed(1)}% protein`);


    return {
        id: `plan_${Date.now()}`,
        name: 'Daily Meal Plan',
        name_es: 'Plan de Comidas Diario',
        meals,
        totals: finalTotals,
        deviations
    };
}

// ASYNC: Generate weekly meal plan from database
export async function generateWeeklyMealPlanFromDB(
    targetCalories: number,
    targetProtein: number,
    numMeals: 3 | 4 | 5 = 4,
    availableFoods?: string[],
    dietType: string = 'balanced',
    conditions: string[] = [],
    nutrientPriorities: string[] = []
): Promise<WeeklyMealPlan> {
    const days: MealPlan[] = [];
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    // ✅ Create ONE master variety manager for the entire week
    const masterVarietyManager = new VarietyManager();
    console.log(`\n🗓️  [WEEK PLAN] Creating master variety manager for 7 days`);

    for (let i = 0; i < 7; i++) {
        const plan = await generateDayMealPlanFromDB(targetCalories, targetProtein, numMeals, availableFoods, dietType, conditions, nutrientPriorities, masterVarietyManager);
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
