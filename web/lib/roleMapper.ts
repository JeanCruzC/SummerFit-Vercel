
import { SimpleFoodItem } from './mealGenerator';

export type FoodRole = 'protein' | 'carb' | 'veggie' | 'fat' | 'fruit' | 'dairy' | 'legume' | 'condiment' | 'beverage';

interface RoleConstraints {
    min_g: number;
    max_g: number;
    target_kcal_pct_max: number; // Max % of meal calories this single item can provide
}

export const ROLE_CONSTRAINTS: Record<FoodRole, RoleConstraints> = {
    protein: { min_g: 80, max_g: 250, target_kcal_pct_max: 0.6 },
    carb: { min_g: 50, max_g: 250, target_kcal_pct_max: 0.5 },
    veggie: { min_g: 80, max_g: 300, target_kcal_pct_max: 0.2 },
    fat: { min_g: 10, max_g: 60, target_kcal_pct_max: 0.3 },
    fruit: { min_g: 80, max_g: 200, target_kcal_pct_max: 0.3 },
    dairy: { min_g: 100, max_g: 250, target_kcal_pct_max: 0.3 },
    legume: { min_g: 80, max_g: 250, target_kcal_pct_max: 0.4 },
    condiment: { min_g: 1, max_g: 15, target_kcal_pct_max: 0.1 }, // Strict limit on spices/powders
    beverage: { min_g: 200, max_g: 500, target_kcal_pct_max: 0.2 }
};

export const CONDIMENT_KEYWORDS = [
    'powder', 'polvo', 'spice', 'especia', 'salt', 'sal', 'pepper', 'pimienta',
    'sauce', 'salsa', 'dressing', 'aderezo', 'extract', 'extracto',
    'syrup', 'jarabe', 'ketchup', 'mustard', 'mostaza', 'vinegar', 'vinagre',
    'baking', 'levadura', 'yeast', 'shortening', 'manteca vegetal'
];

export function assignRole(food: SimpleFoodItem): FoodRole {
    const name = (food.name || '').toLowerCase();
    const nameEs = (food.name_es || '').toLowerCase();
    const cat = (food.category || '').toLowerCase();

    // 1. Force Condiment Check (Keyword Based)
    // Prevents "Cocoa Powder" from being a protein source/carb source
    if (CONDIMENT_KEYWORDS.some(k => name.includes(k) || nameEs.includes(k))) {
        // Exception: "Pasta de..." vs "Pasta" is handled elsewhere, but generally safer to act strict.
        // If it's a "sauce" but high cal, it's still a condiment role-wise (e.g. Mayo)
        return 'condiment';
    }

    // 2. Direct Normalized Category Check (Optimization)
    switch (cat) {
        case 'protein': return 'protein';
        case 'carb': return 'carb';
        case 'vegetable': return 'veggie'; // Map loader 'vegetable' to role 'veggie'
        case 'veggie': return 'veggie';
        case 'fat': return 'fat';
        case 'fruit': return 'fruit';
        case 'dairy': return 'dairy';
        case 'condiment': return 'condiment';
        case 'beverage': return 'beverage';
        case 'legume': return 'legume';
    }

    // 3. Fuzzy Category Based Mapping (Fallback)
    if (cat.includes('meat') || cat.includes('poultry') || cat.includes('fish') || cat.includes('chicken') || cat.includes('beef') || cat.includes('pork') || cat.includes('seafood') || cat.includes('egg') || cat.includes('tofu')) {
        return 'protein';
    }

    if (cat.includes('legume') || cat.includes('bean') || cat.includes('lentil') || cat.includes('chickpea') || cat.includes('garbanzo') || cat.includes('frijol') || cat.includes('frejol') || cat.includes('alubia') || cat.includes('haba') || cat.includes('pallar')) {
        return 'legume';
    }

    if (cat.includes('rice') || cat.includes('pasta') || cat.includes('bread') || cat.includes('cereal') || cat.includes('grain') || cat.includes('tortilla') || cat.includes('potato') || cat.includes('starch') || cat.includes('yuca') || cat.includes('cassava') || cat.includes('camote') || cat.includes('sweet potato') || cat.includes('quinua') || cat.includes('quinoa') || cat.includes('kiwicha')) {
        return 'carb';
    }

    if (cat.includes('vegetable') || cat.includes('bean') || cat.includes('lentil') || cat.includes('greens') || name.includes('salad') || nameEs.includes('ensalada')) {
        return 'veggie';
    }

    if (cat.includes('fruit') || cat.includes('juice')) {
        return 'fruit';
    }

    if (cat.includes('milk') || cat.includes('yogurt') || cat.includes('cheese') || cat.includes('cream')) {
        return 'dairy';
    }

    if (cat.includes('oil') || cat.includes('nut') || cat.includes('seed') || cat.includes('butter') || cat.includes('avocado') || nameEs.includes('palta')) {
        return 'fat';
    }

    if (cat.includes('beverage') || cat.includes('water') || cat.includes('coffee') || cat.includes('tea')) {
        return 'beverage';
    }

    // 3. Fallback based on Macros
    // If ambiguous category, classify by dominant macro
    const p = food.protein * 4;
    const c = food.carbs * 4;
    const f = food.fat * 9;

    if (p > c && p > f) return 'protein';
    if (c > p && c > f) return 'carb';
    if (f > p && f > c) return 'fat';

    return 'condiment'; // Default safe fallback
}

export function validatePortion(food: SimpleFoodItem, grams: number): boolean {
    const role = assignRole(food);
    const limits = ROLE_CONSTRAINTS[role];

    // Hard Limit Check
    if (grams < limits.min_g || grams > limits.max_g) return false;

    // Density/Percentage Check should be done at Meal level, but we can check here broadly?
    // No, return true if grams valid.
    return true;
}

export function getCorrectedPortion(food: SimpleFoodItem, desiredGrams: number): number {
    const role = assignRole(food);
    const limits = ROLE_CONSTRAINTS[role];

    if (desiredGrams < limits.min_g) return limits.min_g;
    if (desiredGrams > limits.max_g) return limits.max_g;
    return desiredGrams;
}
