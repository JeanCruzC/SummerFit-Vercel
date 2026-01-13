// Simple Meal Plan Generator
// Uses basic groceries (chicken, rice, potato, etc.) not complex recipes

import { calculateBMR, calculateTDEE, calculateMacros } from './nutrition';

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
    cooking_states?: string[];
    portion_g: number; // Standard portion in grams
}

// Basic groceries database - simple foods only
export const SIMPLE_FOODS: SimpleFoodItem[] = [
    // PROTEINS
    { id: 'chicken_breast', name: 'Chicken Breast', name_es: 'Pechuga de Pollo', emoji: '🍗', category: 'protein', kcal: 165, protein: 31, carbs: 0, fat: 3.6, portion_g: 150, cooking_states: ['grilled', 'baked', 'boiled'] },
    { id: 'chicken_thigh', name: 'Chicken Thigh', name_es: 'Muslo de Pollo', emoji: '🍗', category: 'protein', kcal: 209, protein: 26, carbs: 0, fat: 10.9, portion_g: 150, cooking_states: ['grilled', 'baked'] },
    { id: 'beef_ground', name: 'Ground Beef (lean)', name_es: 'Carne Molida', emoji: '🥩', category: 'protein', kcal: 250, protein: 26, carbs: 0, fat: 15, portion_g: 150, cooking_states: ['cooked'] },
    { id: 'beef_steak', name: 'Beef Steak', name_es: 'Bistec de Res', emoji: '🥩', category: 'protein', kcal: 271, protein: 26, carbs: 0, fat: 18, portion_g: 150, cooking_states: ['grilled', 'pan-fried'] },
    { id: 'pork_loin', name: 'Pork Loin', name_es: 'Lomo de Cerdo', emoji: '🐷', category: 'protein', kcal: 143, protein: 27, carbs: 0, fat: 3.5, portion_g: 150, cooking_states: ['grilled', 'baked'] },
    { id: 'fish_tilapia', name: 'Tilapia', name_es: 'Tilapia', emoji: '🐟', category: 'protein', kcal: 96, protein: 20, carbs: 0, fat: 1.7, portion_g: 150, cooking_states: ['grilled', 'baked', 'pan-fried'] },
    { id: 'fish_salmon', name: 'Salmon', name_es: 'Salmón', emoji: '🐟', category: 'protein', kcal: 208, protein: 20, carbs: 0, fat: 13, portion_g: 150, cooking_states: ['grilled', 'baked'] },
    { id: 'tuna_canned', name: 'Tuna (canned)', name_es: 'Atún en Lata', emoji: '🐟', category: 'protein', kcal: 116, protein: 26, carbs: 0, fat: 1, portion_g: 100, cooking_states: ['canned'] },
    { id: 'eggs', name: 'Eggs', name_es: 'Huevos', emoji: '🥚', category: 'protein', kcal: 155, protein: 13, carbs: 1.1, fat: 11, portion_g: 100, cooking_states: ['boiled', 'scrambled', 'fried'] },
    { id: 'turkey_breast', name: 'Turkey Breast', name_es: 'Pechuga de Pavo', emoji: '🦃', category: 'protein', kcal: 135, protein: 30, carbs: 0, fat: 1, portion_g: 150, cooking_states: ['grilled', 'baked'] },

    // CARBS
    { id: 'rice_white', name: 'White Rice', name_es: 'Arroz Blanco', emoji: '🍚', category: 'carb', kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, portion_g: 150, cooking_states: ['cooked'] },
    { id: 'rice_brown', name: 'Brown Rice', name_es: 'Arroz Integral', emoji: '🍚', category: 'carb', kcal: 111, protein: 2.6, carbs: 23, fat: 0.9, fiber: 1.8, portion_g: 150, cooking_states: ['cooked'] },
    { id: 'potato', name: 'Potato', name_es: 'Papa', emoji: '🥔', category: 'carb', kcal: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2, portion_g: 200, cooking_states: ['boiled', 'baked', 'mashed'] },
    { id: 'sweet_potato', name: 'Sweet Potato', name_es: 'Camote', emoji: '🍠', category: 'carb', kcal: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3, portion_g: 200, cooking_states: ['boiled', 'baked'] },
    { id: 'pasta', name: 'Pasta', name_es: 'Pasta', emoji: '🍝', category: 'carb', kcal: 131, protein: 5, carbs: 25, fat: 1.1, portion_g: 150, cooking_states: ['cooked'] },
    { id: 'oats', name: 'Oatmeal', name_es: 'Avena', emoji: '🌾', category: 'carb', kcal: 68, protein: 2.4, carbs: 12, fat: 1.4, fiber: 1.7, portion_g: 200, cooking_states: ['cooked'] },
    { id: 'bread_whole', name: 'Whole Wheat Bread', name_es: 'Pan Integral', emoji: '🍞', category: 'carb', kcal: 247, protein: 13, carbs: 41, fat: 3.4, fiber: 7, portion_g: 60, cooking_states: ['toasted'] },
    { id: 'quinoa', name: 'Quinoa', name_es: 'Quinua', emoji: '🌾', category: 'carb', kcal: 120, protein: 4.4, carbs: 21, fat: 1.9, fiber: 2.8, portion_g: 150, cooking_states: ['cooked'] },
    { id: 'beans_black', name: 'Black Beans', name_es: 'Frijoles Negros', emoji: '🫘', category: 'carb', kcal: 132, protein: 8.9, carbs: 24, fat: 0.5, fiber: 8.7, portion_g: 150, cooking_states: ['cooked'] },
    { id: 'lentils', name: 'Lentils', name_es: 'Lentejas', emoji: '🫘', category: 'carb', kcal: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 7.9, portion_g: 150, cooking_states: ['cooked'] },

    // VEGETABLES
    { id: 'broccoli', name: 'Broccoli', name_es: 'Brócoli', emoji: '🥦', category: 'vegetable', kcal: 35, protein: 2.4, carbs: 7, fat: 0.4, fiber: 3.3, portion_g: 100, cooking_states: ['steamed', 'raw', 'sautéed'] },
    { id: 'spinach', name: 'Spinach', name_es: 'Espinaca', emoji: '🥬', category: 'vegetable', kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, portion_g: 100, cooking_states: ['raw', 'sautéed'] },
    { id: 'lettuce', name: 'Lettuce', name_es: 'Lechuga', emoji: '🥬', category: 'vegetable', kcal: 15, protein: 1.4, carbs: 2.9, fat: 0.2, fiber: 1.3, portion_g: 80, cooking_states: ['raw'] },
    { id: 'tomato', name: 'Tomato', name_es: 'Tomate', emoji: '🍅', category: 'vegetable', kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, portion_g: 100, cooking_states: ['raw', 'cooked'] },
    { id: 'cucumber', name: 'Cucumber', name_es: 'Pepino', emoji: '🥒', category: 'vegetable', kcal: 16, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5, portion_g: 100, cooking_states: ['raw'] },
    { id: 'carrot', name: 'Carrot', name_es: 'Zanahoria', emoji: '🥕', category: 'vegetable', kcal: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, portion_g: 100, cooking_states: ['raw', 'cooked'] },
    { id: 'onion', name: 'Onion', name_es: 'Cebolla', emoji: '🧅', category: 'vegetable', kcal: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7, portion_g: 50, cooking_states: ['raw', 'sautéed'] },
    { id: 'pepper_bell', name: 'Bell Pepper', name_es: 'Pimiento', emoji: '🫑', category: 'vegetable', kcal: 31, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1, portion_g: 100, cooking_states: ['raw', 'sautéed'] },
    { id: 'zucchini', name: 'Zucchini', name_es: 'Zapallo Italiano', emoji: '🥒', category: 'vegetable', kcal: 17, protein: 1.2, carbs: 3.1, fat: 0.3, fiber: 1, portion_g: 150, cooking_states: ['sautéed', 'grilled'] },
    { id: 'green_beans', name: 'Green Beans', name_es: 'Vainitas', emoji: '🌿', category: 'vegetable', kcal: 31, protein: 1.8, carbs: 7, fat: 0.1, fiber: 3.4, portion_g: 100, cooking_states: ['steamed', 'sautéed'] },

    // FATS
    { id: 'avocado', name: 'Avocado', name_es: 'Palta', emoji: '🥑', category: 'fat', kcal: 160, protein: 2, carbs: 9, fat: 15, fiber: 7, portion_g: 100, cooking_states: ['raw'] },
    { id: 'olive_oil', name: 'Olive Oil', name_es: 'Aceite de Oliva', emoji: '🫒', category: 'fat', kcal: 884, protein: 0, carbs: 0, fat: 100, portion_g: 15, cooking_states: ['raw'] },
    { id: 'almonds', name: 'Almonds', name_es: 'Almendras', emoji: '🌰', category: 'fat', kcal: 579, protein: 21, carbs: 22, fat: 50, fiber: 12, portion_g: 30, cooking_states: ['raw'] },
    { id: 'peanut_butter', name: 'Peanut Butter', name_es: 'Mantequilla de Maní', emoji: '🥜', category: 'fat', kcal: 588, protein: 25, carbs: 20, fat: 50, fiber: 6, portion_g: 30, cooking_states: ['raw'] },

    // FRUITS
    { id: 'banana', name: 'Banana', name_es: 'Plátano', emoji: '🍌', category: 'fruit', kcal: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, portion_g: 120, cooking_states: ['raw'] },
    { id: 'apple', name: 'Apple', name_es: 'Manzana', emoji: '🍎', category: 'fruit', kcal: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, portion_g: 180, cooking_states: ['raw'] },
    { id: 'orange', name: 'Orange', name_es: 'Naranja', emoji: '🍊', category: 'fruit', kcal: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4, portion_g: 150, cooking_states: ['raw'] },
    { id: 'strawberries', name: 'Strawberries', name_es: 'Fresas', emoji: '🍓', category: 'fruit', kcal: 32, protein: 0.7, carbs: 8, fat: 0.3, fiber: 2, portion_g: 150, cooking_states: ['raw'] },

    // DAIRY
    { id: 'milk', name: 'Milk (low fat)', name_es: 'Leche Descremada', emoji: '🥛', category: 'dairy', kcal: 42, protein: 3.4, carbs: 5, fat: 1, portion_g: 250, cooking_states: ['raw'] },
    { id: 'yogurt_greek', name: 'Greek Yogurt', name_es: 'Yogurt Griego', emoji: '🥛', category: 'dairy', kcal: 59, protein: 10, carbs: 3.6, fat: 0.7, portion_g: 170, cooking_states: ['raw'] },
    { id: 'cheese', name: 'Cheese', name_es: 'Queso', emoji: '🧀', category: 'dairy', kcal: 402, protein: 25, carbs: 1.3, fat: 33, portion_g: 30, cooking_states: ['raw'] },
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

// Generate a simple meal with protein + carb + vegetable
export function generateSimpleMeal(
    type: Meal['type'],
    targetCalories: number,
    availableFoods?: string[],
    dietType: string = 'balanced',
    conditions: string[] = []
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
        // Remove high carb foods (grains, starchy veg, high sugar fruits)
        // Keep only: proteins (mostly), fats, non-starchy veg
        foods = foods.filter(f => {
            if (f.category === 'carb') return false; // No rice, potato, oats
            if (f.category === 'fruit' && !['strawberries'].includes(f.id)) return false; // Only berries
            if (f.category === 'dairy' && f.id === 'milk') return false; // Limit milk (sugar)
            return true;
        });
    }

    if (dietType === 'vegan') {
        // Remove animal products
        foods = foods.filter(f => !['protein', 'dairy'].includes(f.category) ||
            ['beans_black', 'lentils', 'tofu', 'tempeh'].includes(f.id) // Exceptions if they were categorized as protein (our simple DB marks beans as carb usually but let's check)
        );
        // Our simple DB has beans/lentils as 'carb'. We need to ensure we have vegan proteins.
        // Actually checks categories: 'protein' in SIMPLE_FOODS are meats/fish/eggs.
        // We need to allow beans/lentils/quinoa to act as protein source for vegans.
    }

    if (dietType === 'vegetarian') {
        // Remove meats
        foods = foods.filter(f => !['chicken_breast', 'chicken_thigh', 'beef_ground', 'beef_steak', 'pork_loin', 'fish_tilapia', 'fish_salmon', 'tuna_canned', 'turkey_breast'].includes(f.id));
    }

    if (dietType === 'diabetes_friendly' || conditions.includes('diabetes_type_2')) {
        // Limit high GI foods. Prefer whole grains.
        foods = foods.filter(f =>
            // Exclude white rice, white bread, potato? Maybe potato is ok with skin but let's be strict for "Diabetes Friendly" preset
            !['rice_white', 'bread_white' /*if exists*/].includes(f.id)
        );
    }

    let proteins = foods.filter(f => f.category === 'protein');
    let carbs = foods.filter(f => f.category === 'carb');
    let vegetables = foods.filter(f => f.category === 'vegetable');
    let fats = foods.filter(f => f.category === 'fat');
    let fruits = foods.filter(f => f.category === 'fruit');
    let dairy = foods.filter(f => f.category === 'dairy');

    // Special handling for Vegan Protein sources if list is empty
    if ((dietType === 'vegan' || dietType === 'vegetarian') && proteins.length === 0) {
        // Treat high-protein carbs (beans, lentils, quinoa) as protein sources for meal generation
        proteins = foods.filter(f => ['beans_black', 'lentils', 'quinoa'].includes(f.id));
    }

    const items: MealItem[] = [];

    // Macro Ratios per diet
    let proteinRatio = 0.35;
    let carbRatio = 0.35;
    let fatRatio = 0.30; // Implicit remnant

    if (dietType === 'keto') {
        proteinRatio = 0.25;
        carbRatio = 0.05; // Very low
        // Fat takes the rest (~70%)
    }

    if (dietType === 'diabetes_friendly') {
        proteinRatio = 0.40;
        carbRatio = 0.25; // Lower carb
    }

    if (type === 'breakfast') {
        // Breakfast logic adjusted for diet
        let carb = carbs.find(c => ['oats', 'bread_whole'].includes(c.id)) || carbs[0];
        let protein = proteins.find(p => p.id === 'eggs') || dairy.find(d => d.id === 'yogurt_greek') || proteins[0];
        let fruit = fruits[Math.floor(Math.random() * fruits.length)];

        // KETO overrides handled by filtering above


        if (carb && carbRatio > 0.05) {
            const carbCal = targetCalories * carbRatio;
            const p = Math.round(carbCal / (carb.kcal / 100));
            items.push({ food: carb, portion_g: p, macros: calculateItemMacros(carb, p) });
        }
        if (protein) {
            const protCal = targetCalories * proteinRatio;
            const p = Math.round(protCal / (protein.kcal / 100));
            items.push({ food: protein, portion_g: p, macros: calculateItemMacros(protein, p) });
        }
        if (fruit && dietType !== 'keto') {
            items.push({ food: fruit, portion_g: fruit.portion_g, macros: calculateItemMacros(fruit, fruit.portion_g) });
        }

        // Keto needs fat source if no carb
        if (dietType === 'keto') {
            const fat = fats[Math.floor(Math.random() * fats.length)];
            if (fat) items.push({ food: fat, portion_g: 30, macros: calculateItemMacros(fat, 30) });
        }

    } else if (type === 'snack') {
        const fruit = fruits[Math.floor(Math.random() * fruits.length)];
        const snackOption = [...fats, ...dairy][Math.floor(Math.random() * (fats.length + dairy.length))];

        if (fruit && dietType !== 'keto') {
            items.push({ food: fruit, portion_g: fruit.portion_g, macros: calculateItemMacros(fruit, fruit.portion_g) });
        }
        if (snackOption) {
            // Check vegan dairy
            if (dietType === 'vegan' && snackOption.category === 'dairy') {
                // Skip dairy for vegan
            } else {
                items.push({ food: snackOption, portion_g: snackOption.portion_g, macros: calculateItemMacros(snackOption, snackOption.portion_g) });
            }
        }
    } else {
        // Lunch/Dinner
        const protein = proteins[Math.floor(Math.random() * proteins.length)];
        const carb = carbs[Math.floor(Math.random() * carbs.length)];
        const veg1 = vegetables[Math.floor(Math.random() * vegetables.length)];
        const veg2 = vegetables.filter(v => v.id !== veg1?.id)[Math.floor(Math.random() * (vegetables.length - 1))];
        const fat = fats[Math.floor(Math.random() * fats.length)]; // Add fat source explicitly for keto/balanced

        if (protein) {
            const proteinPortion = Math.round((targetCalories * proteinRatio) / (protein.kcal / 100));
            items.push({
                food: protein,
                portion_g: Math.min(proteinPortion, 300),
                cooking_state: protein.cooking_states?.[0],
                macros: calculateItemMacros(protein, Math.min(proteinPortion, 300))
            });
        }
        if (carb && dietType !== 'keto') {
            const carbPortion = Math.round((targetCalories * carbRatio) / (carb.kcal / 100));
            // For Diabetes, ensure portion isn't huge
            const maxCarb = (dietType === 'diabetes_friendly') ? 150 : 300;

            items.push({
                food: carb,
                portion_g: Math.min(carbPortion, maxCarb),
                cooking_state: carb.cooking_states?.[0],
                macros: calculateItemMacros(carb, Math.min(carbPortion, maxCarb))
            });
        }
        if (veg1) {
            items.push({ food: veg1, portion_g: veg1.portion_g, cooking_state: veg1.cooking_states?.[0], macros: calculateItemMacros(veg1, veg1.portion_g) });
        }
        if (veg2) {
            items.push({ food: veg2, portion_g: veg2.portion_g / 2, cooking_state: veg2.cooking_states?.[0], macros: calculateItemMacros(veg2, veg2.portion_g / 2) });
        }

        // Add Fat for Keto or if needed to fill calories
        if (dietType === 'keto' && fat) {
            // Keto relies on fat. Add avocado/oil/nuts
            items.push({ food: fat, portion_g: 40, macros: calculateItemMacros(fat, 40) });
        }
    }

    return {
        id: `${type}_${Date.now()}_${Math.random()}`,
        type,
        type_es: typeNames[type],
        items,
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
    conditions: string[] = []
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
        meals.push(generateSimpleMeal('breakfast', targetCalories * dist.breakfast, availableFoods, dietType, conditions));
    }
    if (dist.snack1) {
        meals.push(generateSimpleMeal('snack', targetCalories * dist.snack1, availableFoods, dietType, conditions));
    }
    if (dist.lunch) {
        meals.push(generateSimpleMeal('lunch', targetCalories * dist.lunch, availableFoods, dietType, conditions));
    }
    if (dist.snack2) {
        meals.push(generateSimpleMeal('snack', targetCalories * dist.snack2, availableFoods, dietType, conditions));
    }
    if (dist.dinner) {
        meals.push(generateSimpleMeal('dinner', targetCalories * dist.dinner, availableFoods, dietType, conditions));
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
    conditions: string[] = []
): WeeklyMealPlan {
    const days: MealPlan[] = [];
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    for (let i = 0; i < 7; i++) {
        // Add variation logic here if needed (e.g., rotate proteins)
        // For now, randomness in generateSimpleMeal provides variety
        const plan = generateDayMealPlan(targetCalories, targetProtein, numMeals, availableFoods, dietType, conditions);

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
