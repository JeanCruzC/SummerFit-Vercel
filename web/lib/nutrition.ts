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
    weight_kg: number
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

    const calories = tdee + adjustments[goal];
    const protein_g = Math.round(weight_kg * proteinPerKg[goal]);
    const protein_calories = protein_g * 4;

    // 25% from fat
    const fat_calories = calories * 0.25;
    const fat_g = Math.round(fat_calories / 9);

    // Rest from carbs
    const carb_calories = calories - protein_calories - fat_calories;
    const carbs_g = Math.round(carb_calories / 4);

    return { calories, protein_g, carbs_g, fat_g };
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
