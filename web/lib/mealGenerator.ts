// Simple Meal Plan Generator
// Uses basic groceries (chicken, rice, potato, etc.) not complex recipes

import { calculateBMR, calculateTDEE, calculateMacros } from './nutrition';
import { DIET_MACROS } from './diets';
import { foodCache } from './foodCache';

// Basic food items with nutrition per 100g
export interface SimpleFoodItem {
    id: string;
    name: string;
    name_es: string;
    emoji: string;
    category: 'protein' | 'carb' | 'vegetable' | 'fat' | 'fruit' | 'dairy';
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
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
    { id: 'avocado', name: 'Avocado', name_es: 'Palta', emoji: '🥑', category: 'fat', kcal: 160, protein: 2, carbs: 9, fat: 15, fiber: 7, portion_g: 100, serving_size: 201, serving_unit: 'whole', micros: { potassium_mg: 485, folate_mcg: 81 }, cooking_states: ['raw'] },
    { id: 'olive_oil', name: 'Olive Oil', name_es: 'Aceite de Oliva', emoji: '🫒', category: 'fat', kcal: 884, protein: 0, carbs: 0, fat: 100, portion_g: 15, serving_size: 14, serving_unit: 'tbsp', micros: { vit_e_mg: 14 }, cooking_states: ['raw'] },
    { id: 'almonds', name: 'Almonds', name_es: 'Almendras', emoji: '🌰', category: 'fat', kcal: 579, protein: 21, carbs: 22, fat: 50, fiber: 12, portion_g: 30, serving_size: 28, serving_unit: 'oz (23 almonds)', micros: { magnesium_mg: 270, calcium_mg: 269, iron_mg: 3.7 }, cooking_states: ['raw'] },
    { id: 'peanut_butter', name: 'Peanut Butter', name_es: 'Mantequilla de Maní', emoji: '🥜', category: 'fat', kcal: 588, protein: 25, carbs: 20, fat: 50, fiber: 6, portion_g: 30, serving_size: 32, serving_unit: 'tbsp (2)', micros: { magnesium_mg: 154 }, cooking_states: ['raw'] },

    // FRUITS
    { id: 'banana', name: 'Banana', name_es: 'Plátano', emoji: '🍌', category: 'fruit', kcal: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, portion_g: 120, serving_size: 118, serving_unit: 'medium', micros: { potassium_mg: 358 }, cooking_states: ['raw'] },
    { id: 'apple', name: 'Apple', name_es: 'Manzana', emoji: '🍎', category: 'fruit', kcal: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, portion_g: 180, serving_size: 182, serving_unit: 'medium', micros: { vit_c_mg: 4.6 }, cooking_states: ['raw'] },
    { id: 'orange', name: 'Orange', name_es: 'Naranja', emoji: '🍊', category: 'fruit', kcal: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4, portion_g: 150, serving_size: 131, serving_unit: 'medium', micros: { vit_c_mg: 53, folate_mcg: 30 }, cooking_states: ['raw'] },
    { id: 'strawberries', name: 'Strawberries', name_es: 'Fresas', emoji: '🍓', category: 'fruit', kcal: 32, protein: 0.7, carbs: 8, fat: 0.3, fiber: 2, portion_g: 150, serving_size: 152, serving_unit: 'cup', micros: { vit_c_mg: 58, folate_mcg: 24 }, cooking_states: ['raw'] },

    // DAIRY
    { id: 'milk', name: 'Milk (low fat)', name_es: 'Leche Descremada', emoji: '🥛', category: 'dairy', kcal: 42, protein: 3.4, carbs: 5, fat: 1, portion_g: 250, serving_size: 244, serving_unit: 'cup', micros: { calcium_mg: 125, vit_d_iu: 100 }, cooking_states: ['raw'] },
    { id: 'yogurt_greek', name: 'Greek Yogurt', name_es: 'Yogurt Griego', emoji: '🥛', category: 'dairy', kcal: 59, protein: 10, carbs: 3.6, fat: 0.7, portion_g: 170, serving_size: 170, serving_unit: 'container', micros: { calcium_mg: 110, vit_b12_mcg: 0.75 }, cooking_states: ['raw'] },
    { id: 'cheese', name: 'Cheese', name_es: 'Queso', emoji: '🧀', category: 'dairy', kcal: 402, protein: 25, carbs: 1.3, fat: 33, portion_g: 30, serving_size: 28, serving_unit: 'slice (1 oz)', micros: { calcium_mg: 721 }, cooking_states: ['raw'] },
];


export interface MealPlan {
    id: string;
    name: string;
    name_es: string;
    meals: Meal[];
    totals: MacroTotals;
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
    }), { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
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

// Variety Manager - Prevents food repetition
class VarietyManager {
    private usedFoods: Map<string, Date> = new Map();

    markUsed(foodId: string): void {
        this.usedFoods.set(foodId, new Date());
    }

    shouldSkip(foodId: string, cooldownHours: number = 12): boolean {
        const lastUsed = this.usedFoods.get(foodId);
        if (!lastUsed) return false;

        const hoursSince = (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60);
        return hoursSince < cooldownHours;
    }

    getAvailableFoods(foods: SimpleFoodItem[], cooldownHours: number = 12): SimpleFoodItem[] {
        return foods.filter(f => !this.shouldSkip(f.id, cooldownHours));
    }

    reset(): void {
        this.usedFoods.clear();
    }
}

// Generate a simple meal with protein + carb + vegetable
export function generateSimpleMeal(
    type: Meal['type'],
    targetCalories: number,
    availableFoods?: string[],
    dietType: string = 'balanced',
    conditions: string[] = [],
    nutrientPriorities: string[] = []
): Meal {
    const typeNames: Record<string, string> = {
        breakfast: 'Desayuno',
        lunch: 'Almuerzo',
        dinner: 'Cena',
        snack: 'Snack',
    };

    // 1. Filter foods based on availability
    let foods = availableFoods
        ? SIMPLE_FOODS.filter(f => availableFoods.includes(f.id))
        : SIMPLE_FOODS;

    // 2. Apply strict Diet Filters
    if (dietType === 'keto') {
        foods = foods.filter(f => {
            if (f.category === 'carb') return false;
            // Allow low carb fruits
            if (f.category === 'fruit' && !['strawberries'].includes(f.id)) return false;
            if (f.category === 'dairy' && f.id === 'milk') return false;
            return true;
        });
    }

    if (dietType === 'vegan') {
        foods = foods.filter(f => !['protein', 'dairy'].includes(f.category) ||
            ['beans_black', 'lentils', 'tofu', 'tempeh'].includes(f.id)
        );
    }

    if (dietType === 'vegetarian') {
        foods = foods.filter(f => !['chicken_breast', 'chicken_thigh', 'beef_ground', 'beef_steak', 'pork_loin', 'fish_tilapia', 'fish_salmon', 'tuna_canned', 'turkey_breast'].includes(f.id));
    }

    if (dietType === 'diabetes_friendly' || conditions.includes('diabetes_type_2')) {
        foods = foods.filter(f =>
            !['rice_white', 'bread_white'].includes(f.id)
        );
    }

    let proteins = foods.filter(f => f.category === 'protein');
    let carbs = foods.filter(f => f.category === 'carb');
    let vegetables = foods.filter(f => f.category === 'vegetable');
    let fats = foods.filter(f => f.category === 'fat');
    let fruits = foods.filter(f => f.category === 'fruit');
    let dairy = foods.filter(f => f.category === 'dairy');

    // Vegan fallback for protein
    if ((dietType === 'vegan' || dietType === 'vegetarian') && proteins.length === 0) {
        proteins = foods.filter(f => ['beans_black', 'lentils', 'quinoa'].includes(f.id));
    }

    const items: MealItem[] = [];

    // Map internal keys to DietType keys
    const dietKeyMap: Record<string, any> = {
        'balanced': 'Estándar',
        'keto': 'Keto',
        'low_carb': 'Low-Carb',
        'vegan': 'Vegana',
        'vegetarian': 'Vegetariana',
        'paleo': 'Paleo',
        'mediterranean': 'Mediterránea',
        'high_protein': 'Alta Proteína',
        'diabetes_friendly': 'Diabéticos',
        'dash': 'DASH'
    };

    const lookupKey = dietKeyMap[dietType] || 'Estándar';
    // @ts-ignore - lookupKey is derived from valid keys but TS loses track
    const dietMacros = DIET_MACROS[lookupKey] || DIET_MACROS['Estándar'];

    let proteinRatio = dietMacros.protein_pct / 100;
    let carbRatio = dietMacros.carbs_pct / 100;

    // Helper to calculate portion based on calories or grams of a specific macro
    const calcPortion = (food: SimpleFoodItem, targetAmount: number, targetType: 'kcal' | 'protein' | 'carbs' = 'kcal') => {
        if (!food || targetAmount <= 0) return 0;
        let per100 = 0;
        if (targetType === 'kcal') per100 = food.kcal;
        if (targetType === 'protein') per100 = food.protein;
        if (targetType === 'carbs') per100 = food.carbs;

        if (per100 <= 0) return 0;
        return Math.round((targetAmount / per100) * 100);
    };

    if (type === 'breakfast') {
        // --- BREAKFAST LOGIC ---
        let carbOptions = carbs.filter(c => ['oats', 'bread_whole', 'quinoa'].includes(c.id));
        if (carbOptions.length === 0) carbOptions = carbs;

        let proteinOptions = proteins.filter(p => p.id === 'eggs');
        if (proteinOptions.length === 0) proteinOptions = [...dairy, ...proteins];

        // Apply Priority Ranking
        if (nutrientPriorities.length > 0) {
            proteinOptions = rankFoodsByNutrients(proteinOptions, nutrientPriorities).slice(0, 3);
            carbOptions = rankFoodsByNutrients(carbOptions, nutrientPriorities).slice(0, 3);
        }

        let protein = proteinOptions[Math.floor(Math.random() * proteinOptions.length)];
        let carb = carbOptions[Math.floor(Math.random() * carbOptions.length)];

        let fruitOptions = fruits;
        if (nutrientPriorities.length > 0) {
            fruitOptions = rankFoodsByNutrients(fruitOptions, nutrientPriorities).slice(0, 3);
        }
        let fruit = fruitOptions[Math.floor(Math.random() * fruitOptions.length)];

        // Vegan Override
        if (dietType === 'vegan') {
            protein = proteins[0];
        }

        // Reserve calories for fruit/veggies and incidental fats
        const SAFETY_FACTOR = 0.85;
        const FRUIT_BUFFER = 100; // Average fruit portion calories
        const usableCalories = Math.max(targetCalories - FRUIT_BUFFER, targetCalories * 0.7);

        // 1. Protein
        if (protein) {
            const targetProteinGrams = (usableCalories * proteinRatio) / 4 * SAFETY_FACTOR;
            const portion = calcPortion(protein, targetProteinGrams, 'protein');
            const finalPortion = Math.min(portion, 400);
            items.push({ food: protein, portion_g: finalPortion, macros: calculateItemMacros(protein, finalPortion) });
        }

        // 2. Carb
        if (carb && carbRatio > 0.05) {
            const targetCarbGrams = (usableCalories * carbRatio) / 4 * SAFETY_FACTOR;
            const portion = calcPortion(carb, targetCarbGrams, 'carbs');
            const finalPortion = Math.min(portion, 400);
            items.push({ food: carb, portion_g: finalPortion, macros: calculateItemMacros(carb, finalPortion) });
        }

        // 3. Fruit
        if (fruit && dietType !== 'keto') {
            items.push({ food: fruit, portion_g: fruit.portion_g, macros: calculateItemMacros(fruit, fruit.portion_g) });
        }

    } else if (type === 'snack') {
        // --- SNACK LOGIC ---
        let fruitOptions = fruits;
        let snackOptions = [...fats, ...dairy, ...proteins];

        if (nutrientPriorities.length > 0) {
            fruitOptions = rankFoodsByNutrients(fruitOptions, nutrientPriorities).slice(0, 3);
            snackOptions = rankFoodsByNutrients(snackOptions, nutrientPriorities).slice(0, 5);
        }

        const fruit = fruitOptions[Math.floor(Math.random() * fruitOptions.length)];
        const snackOption = snackOptions[Math.floor(Math.random() * snackOptions.length)];

        if (fruit && dietType !== 'keto') {
            items.push({ food: fruit, portion_g: fruit.portion_g, macros: calculateItemMacros(fruit, fruit.portion_g) });
        }

        // Fill remainder with snack option
        const currentCals = sumMacros(items.map(i => i.macros)).kcal;
        const remaining = targetCalories - currentCals;

        if (snackOption && remaining > 30) {
            const portion = calcPortion(snackOption, remaining, 'kcal');
            const finalPortion = Math.min(Math.max(portion, 20), 200);
            items.push({ food: snackOption, portion_g: finalPortion, macros: calculateItemMacros(snackOption, finalPortion) });
        }

    } else {
        // --- LUNCH & DINNER LOGIC ---
        let proteinOptions = proteins;
        let carbOptions = carbs;
        let vegOptions = vegetables;

        if (nutrientPriorities.length > 0) {
            proteinOptions = rankFoodsByNutrients(proteinOptions, nutrientPriorities).slice(0, 3);
            carbOptions = rankFoodsByNutrients(carbOptions, nutrientPriorities).slice(0, 3);
            vegOptions = rankFoodsByNutrients(vegOptions, nutrientPriorities).slice(0, 3);
        }

        // Reserve calories for veggies/oils and incidental macros
        const SAFETY_FACTOR = 0.85;
        const VEG_BUFFER = 50;
        const usableCalories = Math.max(targetCalories - VEG_BUFFER, targetCalories * 0.7);

        const protein = proteinOptions[Math.floor(Math.random() * proteinOptions.length)];
        const carb = carbOptions[Math.floor(Math.random() * carbOptions.length)];
        const veg1 = vegOptions[Math.floor(Math.random() * vegOptions.length)];

        // 1. Protein
        if (protein) {
            const targetProteinGrams = (usableCalories * proteinRatio) / 4 * SAFETY_FACTOR;
            const portion = calcPortion(protein, targetProteinGrams, 'protein');
            const finalPortion = Math.min(portion, 600);
            items.push({
                food: protein,
                portion_g: finalPortion,
                cooking_state: protein.cooking_states?.[0],
                macros: calculateItemMacros(protein, finalPortion)
            });
        }

        // 2. Carb
        if (carb && dietType !== 'keto') {
            const targetCarbGrams = (usableCalories * carbRatio) / 4 * SAFETY_FACTOR;
            const portion = calcPortion(carb, targetCarbGrams, 'carbs');
            const maxCarb = (dietType === 'diabetes_friendly' || dietType === 'low_carb') ? 200 : 500;
            const finalPortion = Math.min(portion, maxCarb);
            items.push({
                food: carb,
                portion_g: finalPortion,
                cooking_state: carb.cooking_states?.[0],
                macros: calculateItemMacros(carb, finalPortion)
            });
        }

        // 3. Veggies
        if (veg1) {
            items.push({ food: veg1, portion_g: 150, cooking_state: veg1.cooking_states?.[0], macros: calculateItemMacros(veg1, 150) });
        }
    }

    // --- GAP FILLER & FAT ADJUSTMENT ---


    // --- SMART GAP FILLING v2 ---
    let finalTotals = sumMacros(items.map(i => i.macros));
    const deficit = targetCalories - finalTotals.kcal;

    if (deficit > 50) {
        // Strategy 1: Missing protein? Add egg/tuna
        const proteinDeficit = (targetCalories * proteinRatio / 4) - finalTotals.protein;

        if (proteinDeficit > 10 && proteins.length > 0) {
            const proteinFiller = proteins.find(p => ['eggs', 'tuna_canned'].includes(p.id)) || proteins[0];
            const portion = Math.min(calcPortion(proteinFiller, proteinDeficit, 'protein'), 100);
            if (portion >= 30) {
                items.push({
                    food: proteinFiller,
                    portion_g: portion,
                    macros: calculateItemMacros(proteinFiller, portion)
                });
                finalTotals = sumMacros(items.map(i => i.macros));
            }
        }

        // Strategy 2: Missing carbs? Add fruit/bread
        const remainingDeficit = targetCalories - finalTotals.kcal;
        const carbDeficit = (targetCalories * carbRatio / 4) - finalTotals.carbs;

        if (remainingDeficit > 50 && carbDeficit > 15 && dietType !== 'keto') {
            const carbFiller = fruits.length > 0 ? fruits[0] : carbs.find(c => ['bread_whole', 'oats'].includes(c.id));
            if (carbFiller) {
                const portion = Math.min(calcPortion(carbFiller, remainingDeficit, 'kcal'), 150);
                if (portion >= 30) {
                    items.push({
                        food: carbFiller,
                        portion_g: portion,
                        macros: calculateItemMacros(carbFiller, portion)
                    });
                    finalTotals = sumMacros(items.map(i => i.macros));
                }
            }
        }

        // Strategy 3: Still missing calories? Add healthy fat
        const finalDeficit = targetCalories - finalTotals.kcal;
        if (finalDeficit > 50 && fats.length > 0) {
            const fatFiller = fats.find(f => ['avocado', 'almonds', 'olive_oil'].includes(f.id)) || fats[0];
            const portion = Math.min(calcPortion(fatFiller, finalDeficit, 'kcal'), 50);
            if (portion >= 10) {
                items.push({
                    food: fatFiller,
                    portion_g: portion,
                    macros: calculateItemMacros(fatFiller, portion)
                });
                finalTotals = sumMacros(items.map(i => i.macros));
            }
        }
    } else if (deficit < -50) {
        // Strategy 4: Excess calories? Reduce large portions
        const sortedBySize = [...items].sort((a, b) => b.macros.kcal - a.macros.kcal);
        let excess = -deficit;

        for (const item of sortedBySize) {
            if (excess <= 10) break;
            if (item.food.category === 'vegetable' || item.food.category === 'fruit') continue;

            const maxCut = item.portion_g * 0.3;
            const calPerGram = item.macros.kcal / item.portion_g;
            if (calPerGram <= 0) continue;

            const gramsToCut = Math.min(excess / calPerGram, maxCut);

            if (gramsToCut >= 10) {
                const cleanCut = Math.floor(gramsToCut / 5) * 5;
                item.portion_g -= cleanCut;
                item.macros = calculateItemMacros(item.food, item.portion_g);
                excess -= cleanCut * calPerGram;
            }
        }
    }

    // Recalculate final totals
    finalTotals = sumMacros(items.map(i => i.macros));

    return {
        id: `${type}_${Date.now()}_${Math.random()}`,
        type,
        type_es: typeNames[type],
        items: items.sort((a, b) => b.macros.kcal - a.macros.kcal), // Sort for nice presentation
        totals: sumMacros(items.map(i => i.macros)),
    };
}

// Generate a full day meal plan
export function generateDayMealPlan(
    targetCalories: number,
    targetProtein: number,
    numMeals: 3 | 4 | 5 = 4,
    availableFoods?: string[],
    dietType: string = 'balanced',
    conditions: string[] = [],
    nutrientPriorities: string[] = []
): MealPlan {
    const meals: Meal[] = [];

    // Distribution of calories across meals
    const distributions: Record<number, Record<string, number>> = {
        3: { breakfast: 0.30, lunch: 0.40, dinner: 0.30 },
        4: { breakfast: 0.25, snack1: 0.10, lunch: 0.35, dinner: 0.30 },
        5: { breakfast: 0.20, snack1: 0.10, lunch: 0.30, snack2: 0.10, dinner: 0.30 },
    };

    const dist = distributions[numMeals];

    if (dist.breakfast) {
        meals.push(generateSimpleMeal('breakfast', targetCalories * dist.breakfast, availableFoods, dietType, conditions, nutrientPriorities));
    }
    if (dist.snack1) {
        meals.push(generateSimpleMeal('snack', targetCalories * dist.snack1, availableFoods, dietType, conditions, nutrientPriorities));
    }
    if (dist.lunch) {
        meals.push(generateSimpleMeal('lunch', targetCalories * dist.lunch, availableFoods, dietType, conditions, nutrientPriorities));
    }
    if (dist.snack2) {
        meals.push(generateSimpleMeal('snack', targetCalories * dist.snack2, availableFoods, dietType, conditions, nutrientPriorities));
    }
    if (dist.dinner) {
        meals.push(generateSimpleMeal('dinner', targetCalories * dist.dinner, availableFoods, dietType, conditions, nutrientPriorities));
    }

    const totals = sumMacros(meals.map(m => m.totals));

    return {
        id: `plan_${Date.now()}`,
        name: 'Daily Meal Plan',
        name_es: 'Plan de Comidas Diario',
        meals,
        totals,
    };
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

// Generate a full week meal plan (7 distinct days)
export function generateWeeklyMealPlan(
    targetCalories: number,
    targetProtein: number,
    numMeals: 3 | 4 | 5 = 4,
    availableFoods?: string[],
    dietType: string = 'balanced',
    conditions: string[] = [],
    nutrientPriorities: string[] = []
): WeeklyMealPlan {
    const days: MealPlan[] = [];
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    for (let i = 0; i < 7; i++) {
        // Add variation logic here if needed (e.g., rotate proteins)
        // For now, randomness in generateSimpleMeal provides variety
        const plan = generateDayMealPlan(targetCalories, targetProtein, numMeals, availableFoods, dietType, conditions, nutrientPriorities);

        // Enhance ID to prevent collisions
        plan.id = `day_${i}_${Date.now()}_${Math.random()}`;
        plan.name_es = `Día ${i + 1} - ${dayNames[i]}`;

        days.push(plan);
    }

    // Calculate weekly average totals
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

// ============================================================
// ASYNC VERSIONS - USE DATABASE INSTEAD OF HARDCODED FOODS
// ============================================================

// UNIFIED QUERY: Pre-load ALL food categories from Supabase in 1 single query
async function loadFoodsFromDB(nutrientPriorities: string[] = []): Promise<SimpleFoodItem[]> {
    try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        // ✅ UNIFIED QUERY: Load ALL foods in 1 call (instead of 6 separate queries)
        const { data, error } = await supabase
            .from('foods')
            .select('*')
            .eq('is_simple_ingredient', true)
            .eq('is_common_staple', true)
            .order('priority', { ascending: true, nullsFirst: true })
            .limit(500); // Enough to cover all categories with variety

        if (error || !data || data.length === 0) {
            console.warn('Unified food fetch failed, using fallback');
            return SIMPLE_FOODS;
        }

        console.log(`✅ Loaded ${data.length} foods in 1 unified query (vs 6 separate)`);

        // Transform raw DB data to SimpleFoodItem format
        const transformed: SimpleFoodItem[] = data.map(d => {
            // Detect category based on culinary_category field
            let category: SimpleFoodItem['category'] = 'protein';
            const cat = (d.culinary_category || '').toLowerCase();

            if (cat.includes('proteina') || cat.includes('carne') || cat.includes('pescado') || cat.includes('mariscos') || cat.includes('huevo')) {
                category = 'protein';
            } else if (cat.includes('carbohidrato') || cat.includes('grano') || cat.includes('cereal') || cat.includes('pan') || cat.includes('pasta') || cat.includes('arroz')) {
                category = 'carb';
            } else if (cat.includes('verdura') || cat.includes('vegetal') || cat.includes('hortaliza')) {
                category = 'vegetable';
            } else if (cat.includes('grasa') || cat.includes('aceite') || cat.includes('nuez') || cat.includes('semilla')) {
                category = 'fat';
            } else if (cat.includes('fruta')) {
                category = 'fruit';
            } else if (cat.includes('lacteo') || cat.includes('leche') || cat.includes('queso') || cat.includes('yogurt')) {
                category = 'dairy';
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

// Generate meal using DB-loaded foods
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

    // Apply diet filters
    let filteredFoods = [...foods];

    if (dietType === 'keto') {
        filteredFoods = filteredFoods.filter(f =>
            f.category !== 'carb' &&
            !(f.category === 'fruit' && f.carbs > 10) &&
            !(f.category === 'dairy' && f.carbs > 5)
        );
    }
    if (dietType === 'vegan') {
        filteredFoods = filteredFoods.filter(f =>
            !['protein', 'dairy'].includes(f.category) ||
            f.name.toLowerCase().includes('bean') ||
            f.name.toLowerCase().includes('lentil') ||
            f.name.toLowerCase().includes('tofu')
        );
    }
    if (dietType === 'vegetarian') {
        filteredFoods = filteredFoods.filter(f =>
            f.category !== 'protein' ||
            f.name.toLowerCase().includes('egg') ||
            f.name.toLowerCase().includes('bean') ||
            f.name.toLowerCase().includes('lentil')
        );
    }
    if (dietType === 'diabetes_friendly' || conditions.includes('diabetes_type_2')) {
        filteredFoods = filteredFoods.filter(f =>
            !(f.category === 'carb' && f.carbs > 25 && !f.fiber)
        );
    }

    // --- AI CONTEXT FILTER (New) ---
    // If the food has meal_times data, strictly enforce it.
    // e.g. Don't put "Fish" in breakfast unless it has 'breakfast' tag.
    // We allow staples (rice/potato) to be more flexible if they assume "lunch/dinner" by default logic.
    filteredFoods = filteredFoods.filter(f => {
        if (f.meal_times && f.meal_times.length > 0) {
            // Mapping: 'snack' type can accept 'snack' tagged foods OR fruits/nuts
            if (type === 'snack') return f.meal_times.includes('snack') || f.category === 'fruit' || f.category === 'fat';
            return f.meal_times.includes(type);
        }
        return true; // Keep if no AI data (fallback)
    });

    let proteins = filteredFoods.filter(f => f.category === 'protein');
    let carbs = filteredFoods.filter(f => f.category === 'carb');
    let vegetables = filteredFoods.filter(f => f.category === 'vegetable');
    let fats = filteredFoods.filter(f => f.category === 'fat');
    let fruits = filteredFoods.filter(f => f.category === 'fruit');
    let dairy = filteredFoods.filter(f => f.category === 'dairy');

    // Apply variety filtering
    if (varietyManager) {
        proteins = varietyManager.getAvailableFoods(proteins, 6);  // 6h cooldown
        carbs = varietyManager.getAvailableFoods(carbs, 12);       // 12h cooldown
        vegetables = varietyManager.getAvailableFoods(vegetables, 8);
        fats = varietyManager.getAvailableFoods(fats, 12);
        fruits = varietyManager.getAvailableFoods(fruits, 12);
    }

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

    const calcPortion = (food: SimpleFoodItem, targetAmount: number, targetType: 'kcal' | 'protein' | 'carbs' = 'kcal') => {
        if (!food || targetAmount <= 0) return 0;
        let per100 = targetType === 'kcal' ? food.kcal : targetType === 'protein' ? food.protein : food.carbs;
        if (per100 <= 0) return 0;
        return Math.round((targetAmount / per100) * 100);
    };

    const SAFETY_FACTOR = 0.90; // Increased utilization
    const usableCalories = targetCalories * SAFETY_FACTOR;

    // Determine Protein Target for this meal
    // If explicit target is passed, use it. Otherwise fallback to ratio.
    let mealProteinTarget = targetProteinGrams || (usableCalories * proteinRatio) / 4;

    // Simple meal generation: protein + carb + veggie
    if (proteins.length > 0) {
        const protein = proteins[Math.floor(Math.random() * Math.min(proteins.length, 5))];

        // Calculate portion based on PROTEIN GRAMS, not calories
        const portion = Math.min(calcPortion(protein, mealProteinTarget, 'protein'), 350);

        // Ensure minimum viable portion for meat (e.g. 80g)
        const minPortion = protein.category === 'protein' ? 80 : 30;

        if (portion >= minPortion) {
            items.push({
                food: protein,
                portion_g: portion,
                cooking_state: protein.cooking_states?.[0],
                macros: calculateItemMacros(protein, portion)
            });
        } else {
            // Force minimum if it fits loosely in calories
            if ((protein.kcal * minPortion / 100) < usableCalories * 0.6) {
                items.push({
                    food: protein,
                    portion_g: minPortion,
                    cooking_state: protein.cooking_states?.[0],
                    macros: calculateItemMacros(protein, minPortion)
                });
            }
        }
    }

    if (carbs.length > 0 && dietType !== 'keto') {
        const carb = carbs[Math.floor(Math.random() * Math.min(carbs.length, 5))];
        const targetCarbCal = usableCalories * carbRatio;
        const portion = Math.min(calcPortion(carb, targetCarbCal, 'kcal'), 300);
        if (portion >= 30) {
            items.push({
                food: carb,
                portion_g: portion,
                cooking_state: carb.cooking_states?.[0],
                macros: calculateItemMacros(carb, portion)
            });
        }
    }

    if (vegetables.length > 0) {
        const veggie = vegetables[Math.floor(Math.random() * Math.min(vegetables.length, 5))];
        const portion = 100 + Math.floor(Math.random() * 50);
        items.push({
            food: veggie,
            portion_g: portion,
            cooking_state: veggie.cooking_states?.[0],
            macros: calculateItemMacros(veggie, portion)
        });
    }

    // Add fruit for breakfast
    if (type === 'breakfast' && fruits.length > 0) {
        const fruit = fruits[Math.floor(Math.random() * Math.min(fruits.length, 3))];
        const portion = fruit.portion_g || 120;
        items.push({
            food: fruit,
            portion_g: portion,
            cooking_state: 'raw',
            macros: calculateItemMacros(fruit, portion)
        });
    }

    const totals = sumMacros(items.map(i => i.macros));

    // Mark foods as used
    if (varietyManager) {
        items.forEach(item => varietyManager.markUsed(item.food.id));
    }

    return {
        id: `meal_${type}_${Date.now()}`,
        type,
        type_es: typeNames[type] || type,
        items,
        totals
    };
}

// ASYNC: Generate daily meal plan from database
export async function generateDayMealPlanFromDB(
    targetCalories: number,
    targetProtein: number,
    numMeals: 3 | 4 | 5 = 4,
    availableFoods?: string[],
    dietType: string = 'balanced',
    conditions: string[] = [],
    nutrientPriorities: string[] = []
): Promise<MealPlan> {
    // Load foods from database
    const dbFoods = await loadFoodsFromDB(nutrientPriorities);

    // Create variety manager for this day
    const varietyManager = new VarietyManager();

    const meals: Meal[] = [];
    const distributions: Record<number, Record<string, number>> = {
        3: { breakfast: 0.30, lunch: 0.40, dinner: 0.30 },
        4: { breakfast: 0.25, snack1: 0.10, lunch: 0.35, dinner: 0.30 },
        5: { breakfast: 0.20, snack1: 0.10, lunch: 0.30, snack2: 0.10, dinner: 0.30 },
    };
    const dist = distributions[numMeals];

    if (dist.breakfast) meals.push(generateMealFromFoods('breakfast', targetCalories * dist.breakfast, dbFoods, dietType, conditions, nutrientPriorities, targetProtein * dist.breakfast, varietyManager));
    if (dist.snack1) meals.push(generateMealFromFoods('snack', targetCalories * dist.snack1, dbFoods, dietType, conditions, nutrientPriorities, targetProtein * dist.snack1, varietyManager));
    if (dist.lunch) meals.push(generateMealFromFoods('lunch', targetCalories * dist.lunch, dbFoods, dietType, conditions, nutrientPriorities, targetProtein * dist.lunch, varietyManager));
    if (dist.snack2) meals.push(generateMealFromFoods('snack', targetCalories * dist.snack2, dbFoods, dietType, conditions, nutrientPriorities, targetProtein * dist.snack2, varietyManager));
    if (dist.dinner) meals.push(generateMealFromFoods('dinner', targetCalories * dist.dinner, dbFoods, dietType, conditions, nutrientPriorities, targetProtein * dist.dinner, varietyManager));

    const totals = sumMacros(meals.map(m => m.totals));

    return {
        id: `plan_${Date.now()}`,
        name: 'Daily Meal Plan',
        name_es: 'Plan de Comidas Diario',
        meals,
        totals
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

    for (let i = 0; i < 7; i++) {
        const plan = await generateDayMealPlanFromDB(targetCalories, targetProtein, numMeals, availableFoods, dietType, conditions, nutrientPriorities);
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
