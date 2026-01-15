// Nutrition Knowledge Base Types
// Based on comprehensive extraction from nutritional PDFs

export interface DietType {
    id: string;
    nombre: string;
    descripción: string;
    macro_distribution: {
        protein_percent: number;
        carbs_percent: number;
        fat_percent: number;
    };
    daily_carb_limit_g?: number;
    sodium_limit_mg?: number;
    beneficios?: string[];
    riesgos?: string[];
    alimentos_permitidos?: string[];
    alimentos_prohibidos?: string[];
    no_recomendada_para?: string[];
    suplementos_necesarios?: string[];
    nutrientes_vigilar?: string[];
}

export interface CalorieFormulas {
    formulas_bmr: {
        mifflin_st_jeor: { hombres: string; mujeres: string };
        harris_benedict: { hombres: string; mujeres: string };
    };
    factores_actividad: Record<string, { factor: number; descripcion: string }>;
    ajustes_objetivo: Record<string, number>;
}

export interface MacroRecommendation {
    g_por_kg?: number;
    percent?: number;
}

export interface Macronutrientes {
    proteinas: {
        rda_g_por_kg: number;
        amdr_percent: { min: number; max: number };
        recomendaciones_por_objetivo: Record<string, MacroRecommendation>;
        fuentes_animales: string[];
        fuentes_vegetales: string[];
    };
    carbohidratos: {
        amdr_percent: { min: number; max: number };
        fibra_g_por_dia: number;
        azucares_max_percent: number;
        tipos_recomendados: string[];
        tipos_limitar: string[];
    };
    grasas: {
        amdr_percent: { min: number; max: number };
        saturadas_max_percent: number;
        trans_max_g: number;
        tipos_saludables: Record<string, string[]>;
        tipos_limitar: string[];
    };
}

export interface VitaminInfo {
    rda_mcg?: Record<string, number>;
    rda_mg?: Record<string, number>;
    rda_ui?: Record<string, number>;
    ul_mcg?: number;
    ul_mg?: number;
    ul_ui?: number;
    deficiencia: string[];
    fuentes: string[];
    nota_veganos?: string;
}

export interface MineralInfo {
    rda_mg?: Record<string, number>;
    ai_mg?: Record<string, number>;
    limite_mg?: number;
    ul_mg?: number;
    deficiencia?: string[];
    exceso?: string[];
    fuentes?: string[];
    fuentes_hemo?: string[];
    fuentes_no_hemo?: string[];
    mejora_absorcion?: string;
    reducir?: string[];
}

export interface HealthConditionRules {
    objetivos: Record<string, string | number>;
    alimentos_evitar?: string[];
    alimentos_recomendar?: string[];
    dietas_recomendadas?: string[];
    dieta_recomendada?: string;
    alimentos_clave?: string[];
    alimentos_limitar?: string[];
    opcion_low_carb?: {
        carbohidratos_g_max_dia: number;
        percent_calorias_max: number;
        beneficio: string;
    };
}

export interface AgeAdjustment {
    proteina_g_por_kg?: number;
    calcio_mg?: number;
    hierro_mg?: number;
    hierro_mg_chicas?: number;
    hierro_mg_chicos?: number;
    vitamina_d_ui?: number;
    vitamina_b12?: string;
    grasa_min_percent?: number;
    calorias_extra_2do_trimestre?: number;
    calorias_extra_3er_trimestre?: number;
    acido_folico_mcg?: number;
    dha_mg?: number;
    leche?: string;
    nota?: string;
    alimentos_evitar?: string[];
}

export interface PyramidLevel {
    nivel: number;
    nombre: string;
    descripcion: string;
    porciones_2000kcal: Record<string, number | string>;
}

export interface WeightControlGoals {
    deficit_recomendado_kcal?: number;
    superavit_percent?: number;
    superavit_kcal?: number;
    tasa_segura_kg_semana?: number;
    tasa_maxima_kg_semana?: number;
    proteina_g_por_kg: number;
    proteina_max_g_por_kg?: number;
    proteina_post_entreno_g?: number;
    carbohidratos_g_por_kg?: string;
    calorias_minimas?: { mujeres: number; hombres: number };
}

export interface NutritionKnowledgeBase {
    dietas: Record<string, DietType>;
    calorias: CalorieFormulas;
    macronutrientes: Macronutrientes;
    micronutrientes: {
        vitaminas: Record<string, VitaminInfo>;
        minerales: Record<string, MineralInfo>;
    };
    condiciones_salud: Record<string, HealthConditionRules>;
    ajustes_edad: Record<string, AgeAdjustment>;
    piramide_alimentaria: { niveles: PyramidLevel[] };
    control_peso: {
        perdida_peso: WeightControlGoals;
        ganancia_muscular: WeightControlGoals;
    };
    timing_comidas: {
        ayuno_intermitente_16_8: {
            ventana_ayuno_horas: number;
            ventana_comida_horas: number;
            beneficios: string[];
            no_recomendado: string[];
        };
        frecuencia_comidas: {
            estandar: string;
            nota: string;
        };
    };
}

// Helper functions for calorie calculations
export function calculateBMR(
    weight_kg: number,
    height_cm: number,
    age: number,
    sex: 'male' | 'female'
): number {
    // Mifflin-St Jeor equation
    const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
    return sex === 'male' ? base + 5 : base - 161;
}

export function calculateTDEE(
    bmr: number,
    activityLevel: 'sedentario' | 'ligero' | 'moderado' | 'activo' | 'muy_activo'
): number {
    const factors: Record<string, number> = {
        sedentario: 1.2,
        ligero: 1.375,
        moderado: 1.55,
        activo: 1.725,
        muy_activo: 1.9,
    };
    return Math.round(bmr * factors[activityLevel]);
}

export function calculateMacros(
    tdee: number,
    goal: 'perdida_peso' | 'mantenimiento' | 'ganancia_muscular',
    weight_kg: number,
    conditions: string[] = [],
    dietType: string = 'balanced'
): { calories: number; protein_g: number; carbs_g: number; fat_g: number } {
    const adjustments: Record<string, number> = {
        perdida_peso: -500,
        mantenimiento: 0,
        ganancia_muscular: 300,
    };

    const proteinPerKg: Record<string, number> = {
        perdida_peso: 1.6,
        mantenimiento: 1.2,
        ganancia_muscular: 2.0,
    };

    // USDA DGA 2025: Special Lifestage Adjustments
    let calorieOffset = adjustments[goal];

    // 1. Pregnancy & Lactation (USDA)
    // 2nd Tri: +340, 3rd Tri: +450, Lactation: +330-500
    if (conditions.includes('pregnancy_2nd_trimester')) calorieOffset += 340;
    if (conditions.includes('pregnancy_3rd_trimester')) calorieOffset += 450;
    if (conditions.includes('lactation')) calorieOffset += 400; // Average

    // 2. Seniors (>60y) (USDA)
    // Need higher protein (1.0-1.2g/kg) even at maintenance to prevent sarcopenia
    // If user age > 60 (we need age passed in, assume weight_kg is proxy for now or add age param)
    // Note: age is not currently passed to this function, adding it would be a larger refactor of the signature.
    // For now, we will handle it if 'senior' is passed in conditions.
    if (conditions.includes('senior_over_60')) {
        // Boost protein min to 1.2 if it was lower
        proteinPerKg['mantenimiento'] = Math.max(proteinPerKg['mantenimiento'], 1.2);
        proteinPerKg['perdida_peso'] = Math.max(proteinPerKg['perdida_peso'], 1.4); // Higher for weight loss in seniors
    }

    const calories = tdee + calorieOffset;
    let protein_g = Math.round(weight_kg * proteinPerKg[goal]);
    let protein_calories = protein_g * 4;

    // Condition-specific adjustments
    let carb_percent_cap = 100; // No cap by default

    // Low Carb / Diabetes Logic (<130g or <26% - approx logic here)
    if (conditions.includes('diabetes_type_2') && dietType === 'low_carb') {
        // USDA evidence suggests <26% or <130g for therapeutic option
        carb_percent_cap = 26;
    }

    // Default fat allocation (25-35% is AMDR)
    // We calculate fat and carbs to fill remaining calories

    let fat_percent = 0.30; // Healthy baseline
    if (goal === 'ganancia_muscular') fat_percent = 0.25;

    let fat_calories = calories * fat_percent;
    let fat_g = Math.round(fat_calories / 9);

    let carb_calories = calories - protein_calories - fat_calories;
    let carb_percent = (carb_calories / calories) * 100;

    // Apply cap if needed
    if (carb_percent > carb_percent_cap) {
        carb_calories = calories * (carb_percent_cap / 100);
        // Redistribute specific diff to fat and protein or just fat? 
        // Usually LCHF adds to fat.
        const diff = calories - protein_calories - carb_calories - fat_calories;
        if (diff > 0) {
            fat_calories += diff;
            fat_g = Math.round(fat_calories / 9);
        }
    }

    let carbs_g = Math.round(carb_calories / 4);

    return { calories, protein_g, carbs_g, fat_g };
}

import { USDA_PATTERNS, DIET_PATTERN_MAP, MICRONUTRIENT_TARGETS } from './usda_data';

export function getDailyServings(calories: number, dietType: string = 'Estándar'): Record<string, number> {
    // 1. Find the mapped USDA pattern name
    const patternName = DIET_PATTERN_MAP[dietType] || 'Healthy U.S.-Style';

    // 2. Find the pattern data
    const pattern = USDA_PATTERNS.find(p => p.pattern_name === patternName) || USDA_PATTERNS[0];

    // 3. Find the closest calorie level
    // Available levels: 1600, 1800 ... 3200
    // We round to nearest 200 for lookup, or clamp
    let lookupCal = Math.round(calories / 200) * 200;
    lookupCal = Math.max(1600, Math.min(3200, lookupCal));

    const level = pattern.levels.find(l => l.calories === lookupCal);

    if (!level) {
        // Fallback to linear scaling if somehow not found (should not happen due to clamping)
        return { "frutas": 2, "verduras": 2.5, "granos": 6, "proteinas": 5.5, "lacteos": 3 };
    }

    return {
        "frutas": level.fruits_cups,
        "verduras": level.vegetables_cups,
        "granos": level.grains_oz,
        "proteinas": level.protein_oz,
        "lacteos": level.dairy_cups,
        "aceites": level.oils_g
    };
}

export function getMicronutrientTargets(
    conditions: string[],
    gender: 'M' | 'F',
    age?: number
): Record<string, number> {
    // Start with general population baseline
    let targets = { ...MICRONUTRIENT_TARGETS.general };
    let specific: any = MICRONUTRIENT_TARGETS.general_female_19_50; // Default female baseline

    // Pregnancy & Lactation Overrides
    if (conditions.includes('pregnancy') || conditions.includes('pregnancy_2nd_trimester') || conditions.includes('pregnancy_3rd_trimester')) {
        specific = MICRONUTRIENT_TARGETS.pregnancy;
    } else if (conditions.includes('lactation')) {
        specific = MICRONUTRIENT_TARGETS.lactation;
    }

    // Senior Overrides
    if (age && age >= 70) {
        targets = { ...targets, ...MICRONUTRIENT_TARGETS.seniors_over_70 };
    }

    // Merge specific micronutrients (Iron, Choline, Iodine, Folate)
    return {
        ...targets,
        hierro_mg: specific.iron_mg,
        colina_mg: specific.choline_mg,
        yodo_mg: specific.iodine_mg,
        folato_mcg: specific.folate_mcg,
        calcio_mg: specific.calcium_mg || targets.calcium_mg
    };
}

export function getRecommendedDiet(
    conditions: string[],
    preferences: string[]
): string[] {
    const recommended: string[] = [];

    if (conditions.includes('diabetes_tipo_2')) {
        recommended.push('mediterranean', 'dash');
    }
    if (conditions.includes('hipertension')) {
        recommended.push('dash');
    }
    if (conditions.includes('riesgo_cardiovascular')) {
        recommended.push('mediterranean', 'dash');
    }
    if (preferences.includes('vegetarian')) {
        recommended.push('vegetarian');
    }
    if (preferences.includes('vegan')) {
        recommended.push('vegan');
    }

    // Default to mediterranean if no specific conditions
    if (recommended.length === 0) {
        recommended.push('mediterranean');
    }

    return [...new Set(recommended)];
}
