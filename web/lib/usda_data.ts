import { DietType } from './nutrition';

// USDA DGA 2025-2030 Eating Patterns
// Servings per day based on calorie level
export const USDA_PATTERNS = [
    {
        "pattern_name": "Healthy U.S.-Style",
        "levels": [
            { "calories": 1600, "fruits_cups": 1.5, "vegetables_cups": 2.0, "grains_oz": 5.0, "protein_oz": 5.0, "dairy_cups": 3.0, "oils_g": 22 },
            { "calories": 1800, "fruits_cups": 1.5, "vegetables_cups": 2.5, "grains_oz": 6.0, "protein_oz": 5.0, "dairy_cups": 3.0, "oils_g": 24 },
            { "calories": 2000, "fruits_cups": 2.0, "vegetables_cups": 2.5, "grains_oz": 6.0, "protein_oz": 5.5, "dairy_cups": 3.0, "oils_g": 27 },
            { "calories": 2200, "fruits_cups": 2.0, "vegetables_cups": 3.0, "grains_oz": 7.0, "protein_oz": 6.0, "dairy_cups": 3.0, "oils_g": 29 },
            { "calories": 2400, "fruits_cups": 2.0, "vegetables_cups": 3.0, "grains_oz": 8.0, "protein_oz": 6.5, "dairy_cups": 3.0, "oils_g": 31 },
            { "calories": 2600, "fruits_cups": 2.0, "vegetables_cups": 3.5, "grains_oz": 9.0, "protein_oz": 6.5, "dairy_cups": 3.0, "oils_g": 34 },
            { "calories": 2800, "fruits_cups": 2.5, "vegetables_cups": 3.5, "grains_oz": 10.0, "protein_oz": 7.0, "dairy_cups": 3.0, "oils_g": 36 },
            { "calories": 3000, "fruits_cups": 2.5, "vegetables_cups": 4.0, "grains_oz": 10.0, "protein_oz": 7.0, "dairy_cups": 3.0, "oils_g": 44 },
            { "calories": 3200, "fruits_cups": 2.5, "vegetables_cups": 4.0, "grains_oz": 10.0, "protein_oz": 7.0, "dairy_cups": 3.0, "oils_g": 51 }
        ]
    },
    {
        "pattern_name": "Healthy Mediterranean-Style",
        "levels": [
            { "calories": 1600, "fruits_cups": 2.0, "vegetables_cups": 2.0, "grains_oz": 5.0, "protein_oz": 5.5, "dairy_cups": 2.0, "oils_g": 22 },
            { "calories": 1800, "fruits_cups": 2.0, "vegetables_cups": 2.5, "grains_oz": 6.0, "protein_oz": 6.0, "dairy_cups": 2.0, "oils_g": 24 },
            { "calories": 2000, "fruits_cups": 2.5, "vegetables_cups": 2.5, "grains_oz": 6.0, "protein_oz": 6.5, "dairy_cups": 2.0, "oils_g": 27 },
            { "calories": 2200, "fruits_cups": 2.5, "vegetables_cups": 3.0, "grains_oz": 7.0, "protein_oz": 7.0, "dairy_cups": 2.0, "oils_g": 29 },
            { "calories": 2400, "fruits_cups": 2.5, "vegetables_cups": 3.0, "grains_oz": 8.0, "protein_oz": 7.5, "dairy_cups": 2.5, "oils_g": 31 },
            { "calories": 2600, "fruits_cups": 2.5, "vegetables_cups": 3.5, "grains_oz": 9.0, "protein_oz": 7.5, "dairy_cups": 2.5, "oils_g": 34 },
            { "calories": 2800, "fruits_cups": 3.0, "vegetables_cups": 3.5, "grains_oz": 10.0, "protein_oz": 8.0, "dairy_cups": 2.5, "oils_g": 36 },
            { "calories": 3000, "fruits_cups": 3.0, "vegetables_cups": 4.0, "grains_oz": 10.0, "protein_oz": 8.0, "dairy_cups": 2.5, "oils_g": 44 },
            { "calories": 3200, "fruits_cups": 3.0, "vegetables_cups": 4.0, "grains_oz": 10.0, "protein_oz": 8.0, "dairy_cups": 2.5, "oils_g": 51 }
        ]
    },
    {
        "pattern_name": "Healthy Vegetarian",
        "levels": [
            { "calories": 1600, "fruits_cups": 1.5, "vegetables_cups": 2.0, "grains_oz": 5.5, "protein_oz": 2.5, "dairy_cups": 3.0, "oils_g": 22 },
            { "calories": 1800, "fruits_cups": 1.5, "vegetables_cups": 2.5, "grains_oz": 6.5, "protein_oz": 3.0, "dairy_cups": 3.0, "oils_g": 24 },
            { "calories": 2000, "fruits_cups": 2.0, "vegetables_cups": 2.5, "grains_oz": 6.5, "protein_oz": 3.5, "dairy_cups": 3.0, "oils_g": 27 },
            { "calories": 2200, "fruits_cups": 2.0, "vegetables_cups": 3.0, "grains_oz": 7.5, "protein_oz": 4.0, "dairy_cups": 3.0, "oils_g": 29 },
            { "calories": 2400, "fruits_cups": 2.0, "vegetables_cups": 3.0, "grains_oz": 8.5, "protein_oz": 4.0, "dairy_cups": 3.0, "oils_g": 31 },
            { "calories": 2600, "fruits_cups": 2.0, "vegetables_cups": 3.5, "grains_oz": 9.5, "protein_oz": 5.0, "dairy_cups": 3.0, "oils_g": 34 },
            { "calories": 2800, "fruits_cups": 2.5, "vegetables_cups": 3.5, "grains_oz": 10.5, "protein_oz": 5.0, "dairy_cups": 3.0, "oils_g": 36 },
            { "calories": 3000, "fruits_cups": 2.5, "vegetables_cups": 4.0, "grains_oz": 10.5, "protein_oz": 5.5, "dairy_cups": 3.0, "oils_g": 44 },
            { "calories": 3200, "fruits_cups": 2.5, "vegetables_cups": 4.0, "grains_oz": 10.5, "protein_oz": 5.5, "dairy_cups": 3.0, "oils_g": 51 }
        ]
    }
];

// Serving Size Definitions (2025 Guidelines)
export const SERVING_RULES = {
    fruit: "1 cup = 1 cup fresh/frozen, 1/2 cup dried, 1 cup 100% juice",
    vegetable: "1 cup = 1 cup raw/cooked, 2 cups leafy greens, 1 cup veg juice",
    grain: "1 oz-eq = 1 slice bread, 1/2 cup cooked rice/pasta, 1 cup cereal flakes",
    protein: "1 oz-eq = 1 oz lean meat, 1 egg, 1/4 cup cooked beans, 1 tbsp nut butter, 1/2 oz nuts",
    dairy: "1 cup-eq = 1 cup milk/soy drink, 1 cup yogurt, 1.5 oz natural cheese"
};

// Critical Micronutrients for Special Populations (mg/day)
// Based on USDA 2025 Scientific Report
export const MICRONUTRIENT_TARGETS = {
    pregnancy: {
        choline_mg: 450,
        iodine_mg: 0.22,
        iron_mg: 27,
        folate_mcg: 600,
        calcium_mg: 1000 // Standard adult
    },
    lactation: {
        choline_mg: 550,
        iodine_mg: 0.29,
        iron_mg: 9, // Reduced due to amenorrhea
        folate_mcg: 500, // Slightly less than pregnancy but higher than standard
        calcium_mg: 1000
    },
    general_female_19_50: {
        choline_mg: 425,
        iodine_mg: 0.15,
        iron_mg: 18,
        folate_mcg: 400,
        calcium_mg: 1000
    },
    general: {
        fiber_g_per_1000kcal: 14,
        sodium_limit_mg: 2300,
        vit_d_iu: 600,
        calcium_mg: 1000,
        potassium_mg: 3400
    },
    seniors_over_70: {
        vit_d_iu: 800,
        calcium_mg: 1200 // Often recommended 1200 for women >50, men >70
    }
};

// Map internal diet types to USDA pattern names
export const DIET_PATTERN_MAP: Record<string, string> = {
    'Estándar': 'Healthy U.S.-Style',
    'Mediterránea': 'Healthy Mediterranean-Style',
    'Vegetariana': 'Healthy Vegetarian',
    'Vegana': 'Healthy Vegetarian', // Closest approximation
    'DASH': 'Healthy U.S.-Style' // DASH is similar to US-Style but with sodium emphasis
};
