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
    life_stage?: LifeStage; // Physiological stage
    language?: 'es' | 'en';
    full_name?: string;
    avatar_url?: string;
    // Social & Location
    phone?: string;
    latitude?: number;
    longitude?: number;
    location_name?: string;
    city?: string; // Alias for location_name or separate field
    gym_experience?: string; // e.g. "Principiante", "Intermedio"
    is_public_profile?: boolean;
    is_public_routine?: boolean;
    is_public_nutrition?: boolean;

    onboarding_completed?: boolean;
    created_at?: string;
    updated_at?: string;
}

// Life stages (USDA 2025)
export type LifeStage =
    | 'standard'
    | 'pregnancy_1' // 1st Trimester
    | 'pregnancy_2' // 2nd Trimester
    | 'pregnancy_3' // 3rd Trimester
    | 'lactation_1' // 0-6 months
    | 'lactation_2' // 7-12 months
    | 'menopause'
    | 'senior'; // 60+

// Diet types
export type DietType =
    | 'Estándar'
    | 'Keto'
    | 'Low-Carb'
    | 'Vegana'
    | 'Vegetariana'
    | 'Paleo'
    | 'Mediterránea'
    | 'Alta Proteína'
    | 'Diabéticos'
    | 'DASH';

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
    risk_msg?: string;
    risk_level?: 'safe' | 'moderate' | 'high';
}

// Food item from database
export interface FoodItem {
    id: number;
    source_id?: string;
    fdc_id?: number;
    name: string;
    name_es?: string; // Translated name
    category?: string;
    category_es?: string; // Translated category
    kcal_per_100g: number;
    protein_g_per_100g: number;
    carbs_g_per_100g: number;
    fat_g_per_100g: number;
    // USDA extended fields
    fiber_g_per_100g?: number;
    sugar_g_per_100g?: number;
    sodium_mg_per_100g?: number;
    cholesterol_mg_per_100g?: number;
    saturated_fat_g_per_100g?: number;
    potassium_mg_per_100g?: number;
    calcium_mg_per_100g?: number;
    iron_mg_per_100g?: number;
    vitamin_a_iu_per_100g?: number;
    vitamin_c_mg_per_100g?: number;
    vitamin_d_iu_per_100g?: number;
    data_source?: string;
    serving_size_g?: number;
    serving_description?: string;
    serving_description_es?: string;
    brand_name?: string;
    ingredients?: string;
    // Extracted fields
    cooking_state?: string;
    food_base?: string;
    display_name?: string;
}

// Meal entry
export interface MealEntry {
    id?: number;
    user_id: string;
    log_date: string;
    meal_type: 'Desayuno' | 'Almuerzo' | 'Cena' | 'Snack';
    food_name: string;
    emoji?: string; // Added for UI display
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
    average_weekly_rate?: number;
    weeks: number;
    months: number;
    target_date: string;
    risk_level: 'safe' | 'moderate' | 'high';
    risk_msg: string;
    color: string;
    warnings: string[];
    exercise_boost?: number;
    total_deficit?: number;
    effectiveTDEE?: number;
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
    description_es?: string;
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
    // Scientific / Biomechanical Data
    movement_pattern?: string;
    score_hypertrophy?: number; // 1-5
    score_difficulty?: number; // 1-5
    score_risk?: number; // 1-5
    score_strength?: number; // 1-5
    score_stability?: number; // 1-5
    activation_profile?: {
        high: string[];
        medium: string[];
        low: string[];
    };
    scientific_notes?: string;
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
    rir?: number; // Reps In Reserve (0-5, optimal 0-2 for hypertrophy)
    weight_kg?: number; // Weight used for progression tracking
    duration_minutes?: number;
    rest_seconds: number;
    notes?: string;
    order_in_day: number;
    created_at?: string;
    // Populated by join
    exercise?: Exercise;
    // Flag for exercises loaded from saved_routines (not editable directly)
    isFromSavedRoutine?: boolean;
}

// Social Types
export interface Friendship {
    id: string;
    user_id: string;
    friend_id: string;
    status: 'pending' | 'accepted' | 'blocked';
    created_at: string;
}

export interface Friend extends UserProfile {
    friendship_id: string;
    friendship_status: 'pending' | 'accepted' | 'blocked';
    is_sender: boolean; // True if I sent the request
}

export interface FeedItem {
    id: string;
    user_id: string;
    type: 'post' | 'workout' | 'streak' | 'weight_goal';
    content: string;
    metadata?: any;
    created_at: string;
    user?: UserProfile; // Joined profile

    // Interaction Stats
    likes_count?: number;
    comments_count?: number;
    has_liked?: boolean; // Does current user like this?
}

export interface FeedComment {
    id: string;
    post_id: string;
    user_id: string;
    content: string;
    created_at: string;
    user?: UserProfile;
}
