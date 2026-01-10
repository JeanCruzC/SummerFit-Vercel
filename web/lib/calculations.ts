import { UserProfile, BMICategory, HealthMetrics, MacroGrams, GoalProjection, DietType } from '@/types';
import { getMacroDistribution } from './diets';

// Activity level multipliers for TDEE calculation
const ACTIVITY_MULTIPLIERS: Record<string, number> = {
    'Sedentario': 1.2,
    'Ligero': 1.375,
    'Moderado': 1.55,
    'Activo': 1.725,
    'Muy activo': 1.9,
};

// Calories per gram of macronutrient
const CALORIES_PER_GRAM = {
    protein: 4,
    carbs: 4,
    fat: 9,
};

/**
 * Calculate BMI (Body Mass Index)
 * Formula: weight(kg) / height(m)²
 */
export function calculateBMI(weightKg: number, heightCm: number): number {
    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);
    return Math.round(bmi * 10) / 10;
}

/**
 * Get BMI category based on value
 */
export function getBMICategory(bmi: number): BMICategory {
    if (bmi < 18.5) return 'Bajo peso';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Sobrepeso';
    return 'Obesidad';
}

/**
 * Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor equation
 * Men: BMR = 10×weight + 6.25×height - 5×age + 5
 * Women: BMR = 10×weight + 6.25×height - 5×age - 161
 */
export function calculateBMR(
    weightKg: number,
    heightCm: number,
    age: number,
    gender: 'M' | 'F'
): number {
    // Audit Fix: Guard Clauses
    if (!weightKg || weightKg <= 0 || weightKg > 600) return 0; // Fallback safe
    if (!heightCm || heightCm <= 0 || heightCm > 300) return 0;
    if (!age || age <= 0 || age > 120) return 0;

    const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    const bmr = gender === 'M' ? base + 5 : base - 161;

    // Safety check just in case
    return bmr > 0 ? Math.round(bmr) : 0;
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 * Formula: BMR × Activity Multiplier
 */
export function calculateTDEE(bmr: number, activityLevel: string): number {
    const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.55;
    return Math.round(bmr * multiplier);
}

/**
 * Calculate target calories based on goal
 * SCIENTIFIC UPDATE: Uses % of TDEE for scalable deficits (ACSM 2018)
 * - Conservador: 10% deficit (~0.25-0.4 kg/week)
 * - Moderado: 20% deficit (~0.5-0.7 kg/week)  
 * - Acelerado: 25% deficit (~0.75-1.0 kg/week)
 */
export function calculateTargetCalories(
    tdee: number,
    goal: 'Definir' | 'Mantener' | 'Volumen',
    mode: 'conservador' | 'moderado' | 'acelerado' = 'moderado'
): number {
    // Percentage-based deficits (scalable with body weight)
    const deficitPct = {
        conservador: 0.10, // 10% - Health-focused
        moderado: 0.20,    // 20% - Standard
        acelerado: 0.25,   // 25% - Aggressive (max safe)
    };

    // Percentage-based surplus for muscle gain
    const surplusPct = {
        conservador: 0.05, // 5% - Lean bulk
        moderado: 0.10,    // 10% - Standard bulk
        acelerado: 0.15,   // 15% - Aggressive bulk
    };

    let targetCalories: number;

    switch (goal) {
        case 'Definir':
            targetCalories = Math.round(tdee * (1 - deficitPct[mode]));
            break;
        case 'Volumen':
            targetCalories = Math.round(tdee * (1 + surplusPct[mode]));
            break;
        default:
            targetCalories = tdee;
    }

    // Safety floor: Never go below 1200 kcal
    return Math.max(targetCalories, 1200);
}

/**
 * Calculate macros in grams based on calories and diet type
 */
export function calculateMacros(
    targetCalories: number,
    dietType: DietType
): MacroGrams {
    const distribution = getMacroDistribution(dietType);

    const proteinCals = targetCalories * (distribution.protein_pct / 100);
    const carbsCals = targetCalories * (distribution.carbs_pct / 100);
    const fatCals = targetCalories * (distribution.fat_pct / 100);

    return {
        protein_g: Math.round(proteinCals / CALORIES_PER_GRAM.protein),
        carbs_g: Math.round(carbsCals / CALORIES_PER_GRAM.carbs),
        fat_g: Math.round(fatCals / CALORIES_PER_GRAM.fat),
        calories: targetCalories,
    };
}

/**
 * Calculate goal projection (time to reach target weight)
 * SCIENTIFIC UPDATE: Non-linear model with metabolic adaptation (Hall et al. 2012)
 * - Metabolic slowing: ~18 kcal per kg lost
 * - Variable kcal/kg: 7000 for obese, 7500 for overweight, 7700 for normal
 * - Initial acceleration: First 2 weeks faster due to glycogen/water
 */
export function calculateProjection(
    currentWeight: number,
    targetWeight: number,
    tdee: number,
    goal: 'Definir' | 'Mantener' | 'Volumen',
    mode: 'conservador' | 'moderado' | 'acelerado' = 'moderado'
): GoalProjection {
    const targetCalories = calculateTargetCalories(tdee, goal, mode);
    const isLosing = targetWeight < currentWeight;

    // Scientific constants
    const METABOLIC_SLOWING_PER_KG = 18; // kcal reduction per kg lost (Hall 2012)

    // Variable energy density based on body composition (Buchholz & Schoeller 2004)
    const bmi = currentWeight / Math.pow(1.75, 2); // Approximate with 175cm
    const KCAL_PER_KG = bmi >= 30 ? 7000 : bmi >= 25 ? 7200 : 7700;

    let weeks = 0;
    let weight = currentWeight;
    const MAX_WEEKS = 156; // 3 year cap

    // Iterative week-by-week simulation
    while (weeks < MAX_WEEKS) {
        // Adjust TDEE for weight lost (metabolic adaptation)
        const weightLost = currentWeight - weight;
        const adaptedTDEE = tdee - (weightLost * METABOLIC_SLOWING_PER_KG);

        // Daily deficit with adapted TDEE
        const dailyDeficit = adaptedTDEE - targetCalories;

        // Check if we've hit the goal
        if (isLosing && weight <= targetWeight) break;
        if (!isLosing && weight >= targetWeight) break;

        // Weekly weight change
        let weeklyChange = (dailyDeficit * 7) / KCAL_PER_KG;

        // Initial acceleration (weeks 1-2: glycogen/water loss)
        if (weeks < 2 && isLosing) {
            weeklyChange *= 1.4; // 40% faster first 2 weeks
        }

        // Apply change (subtraction for loss, addition for gain)
        weight -= weeklyChange;
        weeks++;

        // Safety: prevent infinite loop if deficit is too small
        if (Math.abs(weeklyChange) < 0.05) break;
    }

    const months = Math.round(weeks / 4.33 * 10) / 10;
    const weightDiff = Math.abs(currentWeight - targetWeight);
    const weeklyRate = weeks > 0 ? weightDiff / weeks : 0;

    // Calculate target date
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + weeks * 7);

    // Risk assessment (friendlier tone per user request)
    let risk_level: 'safe' | 'moderate' | 'high' = 'safe';
    let risk_msg = 'Ritmo saludable y sostenible';
    let color = '#22c55e'; // green
    const warnings: string[] = [];

    if (weeklyRate > 1) {
        risk_level = 'moderate';
        risk_msg = 'Ritmo acelerado - Monitorear';
        color = '#f59e0b';
        warnings.push('💡 Ritmo acelerado. Asegura buena nutrición y descanso.');
    } else if (weeklyRate > 0.75) {
        risk_level = 'safe';
        risk_msg = 'Buen ritmo de progreso';
        color = '#22c55e';
    }

    if (targetCalories < 1200 && goal === 'Definir') {
        warnings.push('💡 Calorías ajustadas al mínimo saludable (1200 kcal).');
    }

    return {
        daily_calories: targetCalories,
        weekly_rate: Math.round(weeklyRate * 100) / 100,
        weeks,
        months,
        target_date: targetDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
        risk_level,
        risk_msg,
        color,
        warnings,
    };
}

/**
 * Calculate goal projection INCLUDING exercise calories
 * SCIENTIFIC UPDATE: Non-linear model with exercise boost (Hall 2012, ACSM)
 */
export function calculateProjectionWithExercise(
    currentWeight: number,
    targetWeight: number,
    tdee: number,
    bmr: number,
    goal: 'Definir' | 'Mantener' | 'Volumen',
    mode: 'conservador' | 'moderado' | 'acelerado' = 'moderado',
    weeklyExerciseCalories: number = 0
): GoalProjection & { exercise_boost: number; total_deficit: number; effectiveTDEE: number } {

    // Calculate effective TDEE including exercise
    let effectiveTDEE = tdee;
    const dailyExerciseBonus = weeklyExerciseCalories / 7;

    if (weeklyExerciseCalories > 0) {
        const sedentaryTDEE = bmr * 1.2;
        const calculatedTDEE = sedentaryTDEE + dailyExerciseBonus;
        effectiveTDEE = Math.max(tdee, calculatedTDEE);
    }

    // Target calories based on lifestyle TDEE (diet stays stable)
    const targetCalories = calculateTargetCalories(tdee, goal, mode);
    const isLosing = targetWeight < currentWeight;

    // Scientific constants
    const METABOLIC_SLOWING_PER_KG = 18;
    const bmi = currentWeight / Math.pow(1.75, 2);
    const KCAL_PER_KG = goal === 'Volumen' ? 2200 : (bmi >= 30 ? 7000 : bmi >= 25 ? 7200 : 7700);

    let weeks = 0;
    let weight = currentWeight;
    const MAX_WEEKS = 156;

    // Iterative simulation with exercise
    while (weeks < MAX_WEEKS) {
        const weightLost = currentWeight - weight;
        const adaptedEffectiveTDEE = effectiveTDEE - (weightLost * METABOLIC_SLOWING_PER_KG);
        const dailyDeficit = adaptedEffectiveTDEE - targetCalories;

        if (isLosing && weight <= targetWeight) break;
        if (!isLosing && weight >= targetWeight) break;

        let weeklyChange = (dailyDeficit * 7) / KCAL_PER_KG;

        if (weeks < 2 && isLosing) {
            weeklyChange *= 1.4;
        }

        weight -= weeklyChange;
        weeks++;

        if (Math.abs(weeklyChange) < 0.05) break;
    }

    const months = Math.round(weeks / 4.33 * 10) / 10;
    const weightDiff = Math.abs(currentWeight - targetWeight);
    const weeklyRate = weeks > 0 ? weightDiff / weeks : 0;
    const totalDailyDeficit = effectiveTDEE - targetCalories;

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + weeks * 7);

    // Risk assessment
    let risk_level: 'safe' | 'moderate' | 'high' = 'safe';
    let risk_msg = 'Ritmo saludable y sostenible';
    let color = '#22c55e';
    const warnings: string[] = [];

    if (weeklyRate > 1) {
        risk_level = 'moderate';
        risk_msg = 'Ritmo acelerado - Monitorear';
        color = '#f59e0b';
        warnings.push('💡 Ritmo acelerado. Asegura buena nutrición.');
    }

    if (dailyExerciseBonus > 0) {
        warnings.push(`💪 Ejercicio añade ~${Math.round(dailyExerciseBonus)} kcal/día de gasto.`);
    }

    return {
        daily_calories: targetCalories,
        weekly_rate: Math.round(weeklyRate * 100) / 100,
        weeks,
        months,
        target_date: targetDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
        risk_level,
        risk_msg,
        color,
        warnings,
        exercise_boost: Math.round(dailyExerciseBonus),
        total_deficit: Math.round(totalDailyDeficit),
        effectiveTDEE: Math.round(effectiveTDEE)
    };
}


/**
 * Calculate all health metrics for a user profile
 */
export function calculateHealthMetrics(
    profile: UserProfile,
    mode: 'conservador' | 'moderado' | 'acelerado' = 'moderado'
): HealthMetrics {
    const bmi = calculateBMI(profile.weight_kg, profile.height_cm);
    const bmi_category = getBMICategory(bmi);
    const bmr = calculateBMR(profile.weight_kg, profile.height_cm, profile.age, profile.gender);
    const tdee = calculateTDEE(bmr, profile.activity_level);
    const projection = calculateProjection(
        profile.weight_kg,
        profile.target_weight_kg,
        tdee,
        profile.goal,
        mode
    );

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + projection.weeks * 7);

    return {
        bmi,
        bmi_category,
        bmr,
        tdee,
        target_calories: projection.daily_calories,
        deficit_or_surplus: tdee - projection.daily_calories,
        weekly_rate: projection.weekly_rate,
        weeks_to_goal: projection.weeks,
        target_date: targetDate,
        warnings: projection.warnings,
    };
}

/**
 * Calculate calories burned from exercise
 * Based on MET (Metabolic Equivalent of Task) values
 */
export function calculateCaloriesBurned(
    weightKg: number,
    exerciseType: string,
    durationMinutes: number,
    intensity: 'Baja' | 'Media' | 'Alta'
): number {
    // MET values for common exercises
    const MET_VALUES: Record<string, Record<string, number>> = {
        'Caminar': { 'Baja': 2.5, 'Media': 3.3, 'Alta': 4.0 },
        'Correr': { 'Baja': 6.0, 'Media': 7.5, 'Alta': 9.5 },
        'Ciclismo': { 'Baja': 3.5, 'Media': 5.5, 'Alta': 8.0 },
        'Natación': { 'Baja': 5, 'Media': 7, 'Alta': 9 },
        'Pesas': { 'Baja': 3, 'Media': 4.5, 'Alta': 6 },
        'HIIT': { 'Baja': 6, 'Media': 8, 'Alta': 10 },
        'Yoga': { 'Baja': 2, 'Media': 3, 'Alta': 4 },
        'Cardio': { 'Baja': 4, 'Media': 6, 'Alta': 8 },
    };

    const exerciseMETs = MET_VALUES[exerciseType] || MET_VALUES['Cardio'];
    const met = exerciseMETs[intensity] || 5;

    // Calories = MET × weight(kg) × duration(hours)
    const hours = durationMinutes / 60;
    const calories = met * weightKg * hours;

    return Math.round(calories);
}

/**
 * Calculate ideal weight range based on height (using BMI 18.5-24.9)
 */
export function calculateIdealWeightRange(heightCm: number): { min: number; max: number } {
    const heightM = heightCm / 100;
    const heightSquared = heightM * heightM;

    return {
        min: Math.round(18.5 * heightSquared * 10) / 10,
        max: Math.round(24.9 * heightSquared * 10) / 10,
    };
}

/**
 * Calculate water intake recommendation (in liters)
 * Basic formula: 30-35ml per kg of body weight
 */
export function calculateWaterIntake(weightKg: number, activityLevel: string): number {
    const baseIntake = weightKg * 0.033; // 33ml per kg
    const activityBonus = ACTIVITY_MULTIPLIERS[activityLevel] > 1.5 ? 0.5 : 0;
    return Math.round((baseIntake + activityBonus) * 10) / 10;
}
