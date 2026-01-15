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
 * 
 * SCIENTIFIC BASIS (ACSM, ISSN, NIH, PONSSALA 2017):
 * - Conservador: 15% deficit (~0.3-0.5 kg/week) → Sostenible, preserva músculo
 * - Moderado: 25% deficit (~0.5-0.75 kg/week) → Estándar (500-750 kcal/día)
 * - Acelerado: 35% deficit (~0.8-1.2 kg/week) → Agresivo, requiere proteína alta
 * 
 * SAFETY FLOORS (NIH/Medical Guidelines):
 * - Women: 1200 kcal/day minimum
 * - Men: 1500 kcal/day minimum
 */
export function calculateTargetCalories(
    tdee: number,
    goal: 'Definir' | 'Mantener' | 'Volumen',
    mode: 'conservador' | 'moderado' | 'acelerado' = 'moderado',
    gender: 'M' | 'F' = 'M',
    lifeStage: string = 'standard' // New param
): number {
    // Percentage-based deficits (validated by PONSSALA 2017 + ACSM guidelines)
    const deficitPct = {
        conservador: 0.15, // 15% - Health-focused, muscle-preserving
        moderado: 0.25,    // 25% - Standard (ACSM 500-750 kcal/day equivalent)
        acelerado: 0.35,   // 35% - Aggressive (PONSSALA: 34.3% effective in athletes)
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
            // If pregnant/lactating, we force CONSERVATIVE or MAINTENANCE to prevent nutrient deficiency
            if (lifeStage.includes('pregnancy') || lifeStage.includes('lactation')) {
                // Guidelines suggest NOT intentionally restricting calories during pregnancy unless obesity monitoring under medical supervision
                // We default to TDEE (Maintenance) + Offset for safety in this app
                targetCalories = tdee;
            } else {
                targetCalories = Math.round(tdee * (1 - deficitPct[mode]));
            }
            break;
        case 'Volumen':
            targetCalories = Math.round(tdee * (1 + surplusPct[mode]));
            break;
        default:
            targetCalories = tdee;
    }

    // USDA 2025 Pregnancy & Lactation Offsets
    // These are added ON TOP of the base need (usually TDEE)
    let offset = 0;
    if (lifeStage === 'pregnancy_2') offset = 340;
    if (lifeStage === 'pregnancy_3') offset = 452;
    if (lifeStage === 'lactation_1') offset = 330; // 0-6 months
    if (lifeStage === 'lactation_2') offset = 400; // 7-12 months

    targetCalories += offset;

    // Gender-specific safety floors (NIH/WebMD guidelines)
    // Pregnant floor is higher (approx 1800)
    let calorieFloor = gender === 'F' ? 1200 : 1500;
    if (lifeStage.includes('pregnancy')) calorieFloor = 1800;

    return Math.max(targetCalories, calorieFloor);
}

/**
 * Generate warnings based on deficit level and user profile
 * Returns array of warning messages for UI display
 */
export function getDeficitWarnings(
    mode: 'conservador' | 'moderado' | 'acelerado',
    targetCalories: number,
    gender: 'M' | 'F',
    bmi?: number,
    hasStrengthTraining?: boolean
): string[] {
    const warnings: string[] = [];
    const floor = gender === 'F' ? 1200 : 1500;

    // Warning for aggressive deficit
    if (mode === 'acelerado') {
        warnings.push(
            'Déficit agresivo (35%): Prioriza proteína (2g/kg) y entrena fuerza 2+ días/semana para preservar músculo.'
        );
    }

    // Warning for hitting calorie floor
    if (targetCalories <= floor) {
        warnings.push(
            `Has alcanzado el mínimo seguro (${floor} kcal). Para mayor déficit, consulta un profesional de salud.`
        );
    }

    // Warning for obesity + aggressive deficit (actually okay per PONSSALA)
    if (bmi && bmi >= 30 && mode === 'acelerado') {
        warnings.push(
            'Personas con obesidad toleran mejor déficits altos. Vigila tu energía y considera suplementar vitaminas.'
        );
    }

    // Warning if no strength training mentioned
    if (hasStrengthTraining === false && mode !== 'conservador') {
        warnings.push(
            'Añade entrenamiento de fuerza 2+ días/semana para preservar masa muscular durante el déficit.'
        );
    }

    return warnings;
}

/**
 * Calculate macros in grams based on calories and diet type
 */
export function calculateMacros(
    targetCalories: number,
    dietType: DietType,
    profile?: UserProfile
): MacroGrams {
    const distribution = getMacroDistribution(dietType);

    // Initial calculation based on percentages
    let proteinCals = targetCalories * (distribution.protein_pct / 100);
    let carbsCals = targetCalories * (distribution.carbs_pct / 100);
    let fatCals = targetCalories * (distribution.fat_pct / 100);

    // --- ADVANCED SCIENTIFIC OVERRIDES ---
    if (profile) {
        const bmi = calculateBMI(profile.weight_kg, profile.height_cm);

        // 1. OBESITY LOGIC (BMI > 30) - Protein Sparing
        // Avoid calculating protein on total weight (too high). Use Ideal Body Weight (IBW).
        if (bmi >= 30 && profile.goal !== 'Volumen') {
            const heightM = profile.height_cm / 100;
            const ibw = 22 * (heightM * heightM); // IBW at BMI 22

            // Target: 2.0g/kg of IBW (Aggressive retention) or 1.5g/kg of IBW (Moderate)
            // We use 2.0g/kg IBW as a safe, effective baseline for obese cutting
            const targetProteinG = Math.round(ibw * 2.0);
            const targetProteinCals = targetProteinG * 4;

            // Use this protein amount, distribute rest
            proteinCals = targetProteinCals;

            // Recalculate remaining for Carbs/Fat preserving diet ratio
            const remainingCals = Math.max(0, targetCalories - proteinCals);
            const totalRatio = distribution.carbs_pct + distribution.fat_pct;

            if (totalRatio > 0) {
                carbsCals = remainingCals * (distribution.carbs_pct / totalRatio);
                fatCals = remainingCals * (distribution.fat_pct / totalRatio);
            }
        }

        // 2. MUSCLE MAINTENANCE OPTIMIZATION (Hypertrophy support at maintenance)
        // If goal is Maintenance/Definir but diet implies high protein or user wants optimization
        else if (profile.goal === 'Mantener' || profile.goal === 'Definir') {
            // Ensure minimum protein of 1.6g/kg (Scientific floor for hypertrophy retention)
            const minProteinG = Math.round(profile.weight_kg * 1.6);
            const minProteinCals = minProteinG * 4;

            if (minProteinCals > proteinCals) {
                proteinCals = minProteinCals;
                // Redistribute rest
                const remainingCals = Math.max(0, targetCalories - proteinCals);
                const totalRatio = distribution.carbs_pct + distribution.fat_pct;
                if (totalRatio > 0) {
                    carbsCals = remainingCals * (distribution.carbs_pct / totalRatio);
                    fatCals = remainingCals * (distribution.fat_pct / totalRatio);
                }
            }
        }
    }

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
    mode: 'conservador' | 'moderado' | 'acelerado' = 'moderado',
    gender: 'M' | 'F' = 'M', // Add gender default
    lifeStage: string = 'standard' // Add lifeStage default
): GoalProjection {
    const targetCalories = calculateTargetCalories(tdee, goal, mode, gender, lifeStage);
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
    weeklyExerciseCalories: number = 0,
    gender: 'M' | 'F' = 'M',  // Add gender for correct calorie floor
    lifeStage: string = 'standard' // Add lifeStage default
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
    // IMPORTANT: Pass gender to use correct calorie floor (1200F, 1500M)
    const targetCalories = calculateTargetCalories(tdee, goal, mode, gender, lifeStage);
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

    // INITIAL weekly rate based on current deficit (what user expects to see)
    const initialDailyDeficit = effectiveTDEE - targetCalories;
    const initialWeeklyRate = (initialDailyDeficit * 7) / KCAL_PER_KG;

    // Average rate over entire period (accounting for metabolic adaptation)
    const averageWeeklyRate = weeks > 0 ? weightDiff / weeks : 0;

    const totalDailyDeficit = effectiveTDEE - targetCalories;

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + weeks * 7);

    // Risk assessment
    let risk_level: 'safe' | 'moderate' | 'high' = 'safe';
    let risk_msg = 'Ritmo saludable y sostenible';
    let color = '#22c55e';
    const warnings: string[] = [];

    if (initialWeeklyRate > 1) {
        risk_level = 'moderate';
        risk_msg = 'Ritmo acelerado - Monitorear';
        color = '#f59e0b';
        warnings.push('Ritmo acelerado. Asegura buena nutrición.');
    }

    if (dailyExerciseBonus > 0) {
        warnings.push(`Ejercicio añade ~${Math.round(dailyExerciseBonus)} kcal/día de gasto.`);
    }

    return {
        daily_calories: targetCalories,
        weekly_rate: Math.round(initialWeeklyRate * 100) / 100, // INITIAL rate (what user expects)
        average_weekly_rate: Math.round(averageWeeklyRate * 100) / 100, // Average over period
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
        mode,
        profile.gender,
        (profile.life_stage as string) || 'standard'
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
        risk_msg: projection.risk_msg,
        risk_level: projection.risk_level,
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

/**
 * Clinical Nutrition: Get micronutrient priorities based on life stage and goal
 * This drives the "Clinical Engine" to prioritize foods rich in specific micros.
 */
export function getClinicalNutrientPriorities(
    lifeStage: string,
    goal: string,
    dietType: string = 'Standard'
): string[] {
    const priorities: string[] = [];

    // 1. Life Stage Logic (Medical Guidelines)
    if (lifeStage && lifeStage.includes('pregnancy')) {
        // Pregnancy: Critical need for Iron (blood volume), Folate (neural tube), Calcium (skeletal)
        priorities.push('iron_mg', 'folate_ug', 'calcium_mg');
    }
    else if (lifeStage && lifeStage.includes('lactation')) {
        // Lactation: High Calcium demand, Vit A & C for milk quality
        priorities.push('calcium_mg', 'vitamin_a_iu', 'vitamin_c_mg');
    }
    else if (lifeStage === 'menopause' || lifeStage === 'senior') {
        // Aging/Menopause: Bone density (Ca + Vit D) and muscle function (Mg)
        priorities.push('calcium_mg', 'vitamin_d_iu', 'magnesium_mg');
    }

    // 2. Clinical Conditions (Diet Type based)
    if (dietType === 'Diabéticos' || dietType === 'diabetes_friendly') {
        // Diabetes: Magnesium improves insulin sensitivity, Fiber buffers glucose spikes
        priorities.push('magnesium_mg', 'fiber_g');
    }

    // 3. Goal Logic
    if (goal === 'Volumen') {
        priorities.push('magnesium_mg'); // Support muscle contraction/recovery
    }

    return [...new Set(priorities)]; // Dedup
}
