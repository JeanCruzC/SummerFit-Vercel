import { createClient } from './client';
import { UserProfile, FoodItem, MealEntry, DailyLog, ExerciseLog } from '@/types';

// ============ PROFILE ============

export async function getProfile(userId: string): Promise<UserProfile | null> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error || !data) return null;
    return data as UserProfile;
}

export async function upsertProfile(profile: Partial<UserProfile> & { user_id: string }): Promise<boolean> {
    const supabase = createClient();
    const { error } = await supabase
        .from('profiles')
        .upsert({
            ...profile,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

    return !error;
}

// ============ FOODS ============

export async function searchFoods(query: string, limit = 50): Promise<FoodItem[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('foods')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(limit);

    if (error) return [];
    return data as FoodItem[];
}

export async function getFoodsByCategory(category: string, limit = 50): Promise<FoodItem[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('foods')
        .select('*')
        .eq('category', category)
        .limit(limit);

    if (error) return [];
    return data as FoodItem[];
}

export async function getFoodCategories(): Promise<string[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('foods')
        .select('category')
        .not('category', 'is', null);

    if (error || !data) return [];
    const categories = [...new Set(data.map(d => d.category))].filter(Boolean);
    return categories.sort();
}

export async function getRandomFoods(limit = 20): Promise<FoodItem[]> {
    const supabase = createClient();
    // Get total count first
    const { count } = await supabase.from('foods').select('*', { count: 'exact', head: true });

    if (!count) return [];

    // Get random offset
    const offset = Math.floor(Math.random() * Math.max(0, count - limit));

    const { data, error } = await supabase
        .from('foods')
        .select('*')
        .range(offset, offset + limit - 1);

    if (error) return [];
    return data as FoodItem[];
}

// ============ MEAL ENTRIES ============

export async function getMealEntries(userId: string, date: string): Promise<MealEntry[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('meal_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('log_date', date)
        .order('created_at', { ascending: true });

    if (error) return [];
    return data as MealEntry[];
}

export async function addMealEntry(entry: Omit<MealEntry, 'id' | 'created_at'>): Promise<boolean> {
    const supabase = createClient();
    const { error } = await supabase
        .from('meal_entries')
        .insert(entry);

    return !error;
}

export async function deleteMealEntry(id: number): Promise<boolean> {
    const supabase = createClient();
    const { error } = await supabase
        .from('meal_entries')
        .delete()
        .eq('id', id);

    return !error;
}

// ============ DAILY LOGS ============

export async function getDailyLog(userId: string, date: string): Promise<DailyLog | null> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('log_date', date)
        .single();

    if (error || !data) return null;
    return data as DailyLog;
}

export async function upsertDailyLog(log: Omit<DailyLog, 'id' | 'created_at'>): Promise<boolean> {
    const supabase = createClient();
    const { error } = await supabase
        .from('daily_logs')
        .upsert(log, { onConflict: 'user_id,log_date' });

    return !error;
}

export async function getDailyLogsRange(userId: string, startDate: string, endDate: string): Promise<DailyLog[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('log_date', startDate)
        .lte('log_date', endDate)
        .order('log_date', { ascending: true });

    if (error) return [];
    return data as DailyLog[];
}

// ============ EXERCISE LOGS ============

export async function getExerciseLogs(userId: string, date: string): Promise<ExerciseLog[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('log_date', date)
        .order('created_at', { ascending: true });

    if (error) return [];
    return data as ExerciseLog[];
}

export async function addExerciseLog(log: Omit<ExerciseLog, 'id' | 'created_at'>): Promise<boolean> {
    const supabase = createClient();
    const { error } = await supabase
        .from('exercise_logs')
        .insert(log);

    return !error;
}

export async function deleteExerciseLog(id: number): Promise<boolean> {
    const supabase = createClient();
    const { error } = await supabase
        .from('exercise_logs')
        .delete()
        .eq('id', id);

    return !error;
}

// ============ WEIGHT HISTORY ============

export async function getWeightHistory(userId: string, limit = 30): Promise<{ recorded_at: string; weight_kg: number }[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('weight_history')
        .select('recorded_at, weight_kg')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(limit);

    if (error) return [];
    return data;
}

/**
 * Record weight and automatically update profile for dashboard recalibration
 * SCIENTIFIC UPDATE: Triggers automatic TDEE/calorie recalculation when weight changes
 */
export async function recordWeight(userId: string, date: string, weightKg: number): Promise<boolean> {
    const supabase = createClient();

    // 1. Record weight in history
    const { error: historyError } = await supabase
        .from('weight_history')
        .upsert({
            user_id: userId,
            recorded_at: date,
            weight_kg: weightKg,
        }, { onConflict: 'user_id,recorded_at' });

    if (historyError) return false;

    // 2. AUTO-RECALIBRATE: Update profile's current weight for dashboard recalculation
    // This triggers automatic BMR/TDEE/calorie updates on next dashboard load
    const { error: profileError } = await supabase
        .from('profiles')
        .update({
            weight_kg: weightKg,
            updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

    return !profileError;
}

// ============ STATS ============

export async function getDashboardStats(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [profile, todayMeals, weekLogs, weightHistory] = await Promise.all([
        getProfile(userId),
        getMealEntries(userId, today),
        getDailyLogsRange(userId, weekAgo, today),
        getWeightHistory(userId, 7),
    ]);

    // Calculate today's totals
    const todayTotals = todayMeals.reduce((acc, meal) => ({
        calories: acc.calories + (meal.calories || 0),
        protein_g: acc.protein_g + (meal.protein_g || 0),
        carbs_g: acc.carbs_g + (meal.carbs_g || 0),
        fat_g: acc.fat_g + (meal.fat_g || 0),
    }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

    // Calculate adherence (days with logged entries / total days)
    const adherence = weekLogs.length > 0
        ? Math.round((weekLogs.filter(l => l.calories_consumed > 0).length / 7) * 100)
        : 0;

    return {
        profile,
        todayTotals,
        weekLogs,
        weightHistory,
        adherence,
    };
}
