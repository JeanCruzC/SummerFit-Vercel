import { createClient } from './client';
import type { Exercise, UserEquipment, WorkoutPlan, WorkoutPlanExercise } from '@/types';

// ============================================================
// EXERCISES
// ============================================================

/**
 * Get exercises filtered by user's available equipment
 */
export async function getExercisesByEquipment(
    userEquipment: UserEquipment[]
): Promise<Exercise[]> {
    const supabase = createClient();

    // Extract equipment types the user has
    const availableEquipment = userEquipment.map(e => e.equipment_type);

    // Always include bodyweight exercises
    availableEquipment.push('Peso corporal');

    // Query exercises where ALL required equipment is available
    const { data, error } = await supabase
        .from('exercises')
        .select('*, exercise_media(*)')
        .containedBy('equipment_required', availableEquipment)
        .order('ranking_score', { ascending: false })
        .limit(100);

    if (error) throw error;
    return data || [];
}

/**
 * Search exercises by name, body part, or type
 */
export async function searchExercises(
    query: string,
    filters?: {
        body_part?: string;
        type?: string;
        level?: string;
    }
): Promise<Exercise[]> {
    const supabase = createClient();

    let queryBuilder = supabase
        .from('exercises')
        .select('*, exercise_media(*)')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`);

    if (filters?.body_part) {
        queryBuilder = queryBuilder.eq('body_part', filters.body_part);
    }

    if (filters?.type) {
        queryBuilder = queryBuilder.eq('type', filters.type);
    }

    if (filters?.level) {
        queryBuilder = queryBuilder.eq('level', filters.level);
    }

    const { data, error } = await queryBuilder
        .order('ranking_score', { ascending: false })
        .limit(50);

    if (error) throw error;
    return data || [];
}

/**
 * Get exercise by ID
 */
export async function getExerciseById(id: number): Promise<Exercise | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('exercises')
        .select('*, exercise_media(*)')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
}

// ============================================================
// USER EQUIPMENT
// ============================================================

/**
 * Get user's equipment
 */
export async function getUserEquipment(userId: string): Promise<UserEquipment[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('user_equipment')
        .select('*')
        .eq('user_id', userId);

    if (error) throw error;
    return data || [];
}

/**
 * Add equipment to user's collection
 */
export async function addUserEquipment(
    userId: string,
    equipment: Omit<UserEquipment, 'id' | 'user_id' | 'created_at'>
): Promise<UserEquipment> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('user_equipment')
        .insert({
            user_id: userId,
            ...equipment,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Remove equipment from user's collection
 */
export async function removeUserEquipment(equipmentId: number): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from('user_equipment')
        .delete()
        .eq('id', equipmentId);

    if (error) throw error;
}

/**
 * Update user equipment
 */
export async function updateUserEquipment(
    equipmentId: number,
    updates: Partial<UserEquipment>
): Promise<UserEquipment> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('user_equipment')
        .update(updates)
        .eq('id', equipmentId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ============================================================
// WORKOUT PLANS
// ============================================================

/**
 * Get user's workout plans
 */
export async function getWorkoutPlans(userId: string): Promise<WorkoutPlan[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Get active workout plan
 */
export async function getActiveWorkoutPlan(userId: string): Promise<WorkoutPlan | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data;
}

/**
 * Create workout plan
 */
export async function createWorkoutPlan(
    userId: string,
    plan: Omit<WorkoutPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<WorkoutPlan> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('workout_plans')
        .insert({
            user_id: userId,
            ...plan,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update workout plan
 */
export async function updateWorkoutPlan(
    planId: number,
    updates: Partial<WorkoutPlan>
): Promise<WorkoutPlan> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('workout_plans')
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq('id', planId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Delete workout plan
 */
export async function deleteWorkoutPlan(planId: number): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from('workout_plans')
        .delete()
        .eq('id', planId);

    if (error) throw error;
}

// ============================================================
// WORKOUT PLAN EXERCISES
// ============================================================

/**
 * Get exercises for a workout plan
 */
export async function getWorkoutPlanExercises(
    planId: number
): Promise<WorkoutPlanExercise[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('workout_plan_exercises')
        .select(`
      *,
      exercise:exercises(*)
    `)
        .eq('workout_plan_id', planId)
        .order('day_of_week', { ascending: true })
        .order('order_in_day', { ascending: true });

    if (error) throw error;
    return data || [];
}

/**
 * Add exercise to workout plan
 */
export async function addExerciseToWorkoutPlan(
    exercise: Omit<WorkoutPlanExercise, 'id' | 'created_at'>
): Promise<WorkoutPlanExercise> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('workout_plan_exercises')
        .insert(exercise)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update workout plan exercise
 */
export async function updateWorkoutPlanExercise(
    exerciseId: number,
    updates: Partial<WorkoutPlanExercise>
): Promise<WorkoutPlanExercise> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('workout_plan_exercises')
        .update(updates)
        .eq('id', exerciseId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Remove exercise from workout plan
 */
export async function removeExerciseFromWorkoutPlan(exerciseId: number): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from('workout_plan_exercises')
        .delete()
        .eq('id', exerciseId);

    if (error) throw error;
}

/**
 * Calculate total calories burned in a workout plan
 */
export async function calculateWorkoutPlanCalories(
    planId: number,
    userWeightKg: number
): Promise<number> {
    const exercises = await getWorkoutPlanExercises(planId);

    let totalCalories = 0;

    for (const ex of exercises) {
        if (!ex.exercise?.met || !ex.duration_minutes) continue;

        const sets = ex.sets || 1;
        const totalMinutes = ex.duration_minutes * sets;
        const hours = totalMinutes / 60;

        const calories = ex.exercise.met * userWeightKg * hours;
        totalCalories += calories;
    }

    return Math.round(totalCalories);
}
