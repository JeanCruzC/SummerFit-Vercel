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

// Category priority for search ranking (lower = higher priority)
const CATEGORY_PRIORITY: Record<string, number> = {
    'Fruits and Fruit Juices': 1,
    'Vegetables and Vegetable Products': 1,
    'Cereal Grains and Pasta': 2,
    'Dairy and Egg Products': 2,
    'Beef Products': 3,
    'Pork Products': 3,
    'Poultry Products': 3,
    'Finfish and Shellfish Products': 3,
    'Legumes and Legume Products': 3,
    'Nut and Seed Products': 4,
    'Fats and Oils': 5,
    'Spices and Herbs': 5,
    'Beverages': 6,
    'Baked Products': 7,
    'Breakfast Cereals': 7,
    'Snacks': 8,
    'Sweets': 9,
    'Fast Foods': 10,
    'Restaurant Foods': 10,
    'Meals, Entrees, and Side Dishes': 10,
};

export async function searchFoods(query: string, limit = 50): Promise<FoodItem[]> {
    const supabase = createClient();

    // Split query into words for better matching
    const words = query.trim().toLowerCase().split(/\s+/).filter(w => w.length > 1);

    if (words.length === 0) return [];

    // Build query - search in BOTH name (EN) and name_es (ES) fields
    let queryBuilder = supabase
        .from('foods')
        .select('*')
        .like('data_source', 'usda%');

    // Add OR filter for each word to match in either name OR name_es
    for (const word of words) {
        queryBuilder = queryBuilder.or(`name.ilike.%${word}%,name_es.ilike.%${word}%`);
    }

    // Fetch more than limit to allow for sorting
    const { data, error } = await queryBuilder.limit(limit * 3);

    if (error || !data) return [];

    // Sort results: 1) Category priority, 2) Raw items first, 3) Shorter names first (simpler items)
    const sorted = (data as FoodItem[]).sort((a, b) => {
        // Priority by category
        const priorityA = CATEGORY_PRIORITY[a.category || ''] || 8;
        const priorityB = CATEGORY_PRIORITY[b.category || ''] || 8;
        if (priorityA !== priorityB) return priorityA - priorityB;

        // Raw items before cooked/processed
        const isRawA = (a.name?.toLowerCase().includes('raw') || a.name_es?.toLowerCase().includes('crud')) ? 0 : 1;
        const isRawB = (b.name?.toLowerCase().includes('raw') || b.name_es?.toLowerCase().includes('crud')) ? 0 : 1;
        if (isRawA !== isRawB) return isRawA - isRawB;

        // Shorter names first (simpler items tend to have shorter names)
        const lenA = (a.name_es || a.name || '').length;
        const lenB = (b.name_es || b.name || '').length;
        return lenA - lenB;
    });

    return sorted.slice(0, limit);
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
    // Get categories only from USDA data
    const { data, error } = await supabase
        .from('foods')
        .select('category')
        .not('category', 'is', null)
        .like('data_source', 'usda%');

    if (error || !data) return [];
    const categories = [...new Set(data.map(d => d.category))].filter(Boolean);
    return categories.sort();
}

export async function getRandomFoods(limit = 20): Promise<FoodItem[]> {
    const supabase = createClient();
    // Get only USDA foods for initial display
    const { count } = await supabase
        .from('foods')
        .select('*', { count: 'exact', head: true })
        .like('data_source', 'usda%');

    if (!count) return [];

    // Get random offset
    const offset = Math.floor(Math.random() * Math.max(0, count - limit));

    const { data, error } = await supabase
        .from('foods')
        .select('*')
        .like('data_source', 'usda%')
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

export async function saveMealPlan(entries: Omit<MealEntry, 'id' | 'created_at'>[]): Promise<boolean> {
    const supabase = createClient();
    const { error } = await supabase
        .from('meal_entries')
        .insert(entries);

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

export async function deleteMealEntriesByType(userId: string, date: string, type: string): Promise<boolean> {
    const supabase = createClient();
    const { error } = await supabase
        .from('meal_entries')
        .delete()
        .eq('user_id', userId)
        .eq('log_date', date)
        .eq('meal_type', type);

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
