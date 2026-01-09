// User profile type
export interface UserProfile {
    user_id: string;
    gender: 'M' | 'F';
    age: number;
    height_cm: number;
    weight_kg: number;
    target_weight_kg: number;
    goal: 'Definir' | 'Mantener' | 'Volumen';
    activity_level: 'Sedentario' | 'Ligero' | 'Moderado' | 'Activo' | 'Muy activo';
    goal_speed?: 'conservador' | 'moderado' | 'acelerado'; // New field for progress speed preference
    diet_type: DietType;
    onboarding_completed?: boolean;
    created_at?: string;
    updated_at?: string;
}

// Diet types
export type DietType =
    | 'Estándar'
    | 'Keto'
    | 'Low-Carb'
    | 'Vegana'
    | 'Vegetariana'
    | 'Paleo'
    | 'Mediterránea'
    | 'Alta Proteína';

// Macro distribution
export interface MacroDistribution {
    protein_pct: number;
    carbs_pct: number;
    fat_pct: number;
}

// Calculated macros in grams
export interface MacroGrams {
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    calories: number;
}

// BMI categories
export type BMICategory = 'Bajo peso' | 'Normal' | 'Sobrepeso' | 'Obesidad';

// Health metrics
export interface HealthMetrics {
    bmi: number;
    bmi_category: BMICategory;
    bmr: number;
    tdee: number;
    target_calories: number;
    deficit_or_surplus: number;
    weekly_rate: number;
    weeks_to_goal: number;
    target_date: Date;
    warnings: string[];
}

// Food item from database
export interface FoodItem {
    id: number;
    source_id?: string;
    name: string;
    category?: string;
    kcal_per_100g: number;
    protein_g_per_100g: number;
    carbs_g_per_100g: number;
    fat_g_per_100g: number;
}

// Meal entry
export interface MealEntry {
    id?: number;
    user_id: string;
    log_date: string;
    meal_type: 'Desayuno' | 'Almuerzo' | 'Cena' | 'Snack';
    food_name: string;
    grams: number;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    created_at?: string;
}

// Daily log
export interface DailyLog {
    id?: number;
    user_id: string;
    log_date: string;
    weight_kg?: number;
    calories_consumed: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    exercise_minutes: number;
    calories_burned: number;
    created_at?: string;
}

// Exercise log
export interface ExerciseLog {
    id?: number;
    user_id: string;
    log_date: string;
    exercise_type: string;
    duration_minutes: number;
    intensity: 'Baja' | 'Media' | 'Alta';
    calories_burned: number;
    created_at?: string;
}

// Supplement recommendation
export interface Supplement {
    name: string;
    description: string;
    benefit: string;
    icon: string;
}

// Projection result
export interface GoalProjection {
    daily_calories: number;
    weekly_rate: number;
    weeks: number;
    months: number;
    target_date: string;
    risk_level: 'safe' | 'moderate' | 'high';
    risk_msg: string;
    color: string;
    warnings: string[];
}

// Recipe suggestion
export interface RecipeSuggestion {
    items: {
        food: FoodItem;
        grams: number;
        calories: number;
        protein_g: number;
        carbs_g: number;
        fat_g: number;
    }[];
    totals: MacroGrams;
    diet_type: DietType;
}

// Exercise system types
export interface Exercise {
    id: number;
    slug: string;
    title: string;
    title_en?: string;
    description?: string;
    type?: 'Fuerza' | 'Cardio' | 'Flexibilidad';
    level?: 'Principiante' | 'Intermedio' | 'Avanzado';
    body_part?: string;
    equipment_required?: string[];
    training_location?: string[];
    met?: number; // Metabolic Equivalent of Task
    ranking_score?: number;
    rating?: number;
    rating_desc?: string;
    // New Fields
    force?: 'Pull' | 'Push' | 'Static';
    mechanic?: 'Isolation' | 'Compound';
    primary_muscles?: string[];
    secondary_muscles?: string[];
    // Media & Instructions
    instructions?: string[];
    exercise_media?: {
        id: number;
        type: 'video' | 'image';
        url: string;
        gender: string;
        angle: string;
    }[];
    created_at?: string;
}

export interface UserEquipment {
    id?: number;
    user_id: string;
    equipment_type: string; // 'Barra', 'Mancuernas', 'Bandas', etc.
    quantity: number; // Cuántos tiene
    weight_kg?: number; // Para pesas
    notes?: string;
    created_at?: string;
}

export interface WorkoutPlan {
    id?: number;
    user_id: string;
    name: string;
    description?: string;
    days_per_week: number;
    total_met_hours: number;
    estimated_calories_weekly: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface WorkoutPlanExercise {
    id?: number;
    workout_plan_id: number;
    exercise_id: number;
    day_of_week: number; // 1-7
    sets: number;
    reps?: number;
    duration_minutes?: number;
    rest_seconds: number;
    notes?: string;
    order_in_day: number;
    created_at?: string;
    // Populated by join
    exercise?: Exercise;
}
