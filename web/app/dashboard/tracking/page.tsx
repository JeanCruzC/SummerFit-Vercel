"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getUserLocalDate } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import { getProfile, getMealEntries, deleteMealEntry, deleteMealEntriesByType, addMealEntry } from "@/lib/supabase/database";
import { calculateHealthMetrics, calculateMacros, calculateProjectionWithExercise } from "@/lib/calculations";
import { MealEntry, UserProfile } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { FoodSearchInput } from "@/components/ui/FoodSearchInput";

export default function TrackingPage() {
    const router = useRouter();
    const { t, language } = useLanguage();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [selectedDate, setSelectedDate] = useState(getUserLocalDate());
    const [meals, setMeals] = useState<MealEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<number | null>(null);
    const [waterGlasses, setWaterGlasses] = useState(0);

    // Inline Add State
    const [addingToMeal, setAddingToMeal] = useState<string | null>(null); // "Desayuno" | "Almuerzo" etc
    const [selectedFood, setSelectedFood] = useState<any | null>(null);
    const [gramsInput, setGramsInput] = useState("100");
    const [saving, setSaving] = useState(false);

    const handleSelectFood = (food: any, mealType: string) => {
        setSelectedFood(food);
        setGramsInput(String(food.portion_g || 100));
        setAddingToMeal(mealType);
    };

    const handleConfirmAdd = async () => {
        if (!selectedFood || !addingToMeal) return;
        setSaving(true);

        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const grams = parseFloat(gramsInput) || 100;
        const factor = grams / 100;

        const entry = {
            user_id: session.user.id,
            log_date: selectedDate,
            meal_type: addingToMeal as 'Desayuno' | 'Almuerzo' | 'Cena' | 'Snack',
            food_name: selectedFood.name,
            emoji: selectedFood.emoji || "🍽️",
            grams: grams,
            calories: Math.round((selectedFood.kcal_per_100g || 0) * factor),
            protein_g: Math.round((selectedFood.protein_g_per_100g || 0) * factor * 10) / 10,
            carbs_g: Math.round((selectedFood.carbs_g_per_100g || 0) * factor * 10) / 10,
            fat_g: Math.round((selectedFood.fat_g_per_100g || 0) * factor * 10) / 10,
        };

        const savedEntry = await addMealEntry(entry);
        if (savedEntry && typeof savedEntry !== 'boolean') {
            setMeals(prev => [...prev, savedEntry as MealEntry]);
        }

        // Reset state
        setSelectedFood(null);
        setAddingToMeal(null);
        setGramsInput("100");
        setSaving(false);
    };

    const cancelAdd = () => {
        setSelectedFood(null);
        setAddingToMeal(null);
        setGramsInput("100");
    };

    // Week Days Logic
    const weekDays = useMemo(() => {
        const today = new Date();
        const days = [];
        const dayLabels = ['D', 'L', 'M', 'M', 'J', 'V', 'S']; // Sunday based index for display? Or custom.

        // Start from monday of current week
        const currentDay = today.getDay(); // 0 is Sunday
        // Adjust to Monday start: 0->6, 1->0, 2->1...
        const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;

        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + mondayOffset + i);
            days.push({
                date: d.toISOString().split('T')[0],
                dayLabel: dayLabels[d.getDay()],
                dayNumber: d.getDate(),
                isToday: d.toISOString().split('T')[0] === today.toISOString().split('T')[0]
            });
        }
        return days;
    }, []);

    const selectedDayObj = weekDays.find(d => d.date === selectedDate);
    const displayDate = selectedDayObj
        ? (selectedDayObj.isToday ? "Today" : `${selectedDayObj.dayLabel}, ${selectedDayObj.dayNumber}`)
        : selectedDate;

    useEffect(() => {
        const load = async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push("/login"); return; }

            const [prof, entries] = await Promise.all([
                getProfile(session.user.id),
                getMealEntries(session.user.id, selectedDate),
            ]);
            setProfile(prof);
            setMeals(entries);
            setLoading(false);
        };
        load();
    }, [router, selectedDate]);

    const handleDelete = async (id: number) => {
        setDeleting(id);
        await deleteMealEntry(id);
        setMeals(m => m.filter(e => e.id !== id));
        setDeleting(null);
    };

    const handleClearSection = async (type: string) => {
        if (!confirm(t('nutrition.tracking.confirmClear'))) return; // Simple confirmation
        const { data: { session } } = await createClient().auth.getSession();
        if (!session) return;

        await deleteMealEntriesByType(session.user.id, selectedDate, type);
        setMeals(m => m.filter(e => e.meal_type !== type));
    };

    const totals = meals.reduce((acc, m) => ({
        calories: acc.calories + (m.calories || 0),
        protein_g: acc.protein_g + (m.protein_g || 0),
        carbs_g: acc.carbs_g + (m.carbs_g || 0),
        fat_g: acc.fat_g + (m.fat_g || 0),
    }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

    const metrics = profile ? calculateHealthMetrics(profile, profile.goal_speed || "moderado") : null;
    const projection = profile && metrics ? calculateProjectionWithExercise(
        profile.weight_kg, profile.target_weight_kg, metrics.tdee, metrics.bmr,
        profile.goal, profile.goal_speed || "moderado", 0, profile.gender as 'M' | 'F'
    ) : null;
    const macroTargets = projection && profile ? calculateMacros(projection.daily_calories, profile.diet_type, profile) : null;

    const mealsByType = {
        Desayuno: meals.filter(m => m.meal_type === "Desayuno"),
        Almuerzo: meals.filter(m => m.meal_type === "Almuerzo"),
        Cena: meals.filter(m => m.meal_type === "Cena"),
        Snack: meals.filter(m => m.meal_type === "Snack"),
    };

    const targetCalories = projection?.daily_calories || 2000;
    const caloriesLeft = Math.max(0, targetCalories - totals.calories);
    const caloriesPercent = Math.min((totals.calories / targetCalories) * 100, 100);

    // Macros Math
    const proteinTarget = macroTargets?.protein_g || 150;
    const carbsTarget = macroTargets?.carbs_g || 200;
    const fatTarget = macroTargets?.fat_g || 70;

    const proteinLeft = Math.max(0, proteinTarget - totals.protein_g);
    const carbsLeft = Math.max(0, carbsTarget - totals.carbs_g);
    const fatLeft = Math.max(0, fatTarget - totals.fat_g);

    const proteinPercent = Math.min((totals.protein_g / proteinTarget) * 100, 100);
    const carbsPercent = Math.min((totals.carbs_g / carbsTarget) * 100, 100);
    const fatPercent = Math.min((totals.fat_g / fatTarget) * 100, 100);

    if (loading) return null;

    return (
        <div className="bg-background-light dark:bg-background-dark text-text-main dark:text-gray-100 font-display min-h-screen flex flex-col transition-colors duration-200">
            {/* Header / Top Bar is in layout, we just build the content */}

            <main className="flex-grow w-full max-w-[1000px] mx-auto px-4 sm:px-6 py-8 relative">

                {/* Date Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-text-main dark:text-white">{t('nutrition.tracking.dailySummary')}</h1>
                        <p className="text-text-secondary dark:text-gray-400 mt-1">{t('nutrition.tracking.trackProgress')}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-surface-light dark:bg-surface-dark p-1.5 rounded-full shadow-sm border border-border-light dark:border-purple-900/30 self-start sm:self-auto">
                        <button
                            onClick={() => {
                                const d = new Date(selectedDate);
                                d.setDate(d.getDate() - 1);
                                setSelectedDate(d.toISOString().split('T')[0]);
                            }}
                            className="size-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-text-secondary dark:text-gray-300"
                        >
                            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                        </button>
                        <div className="flex items-center gap-2 px-2">
                            <span className="material-symbols-outlined text-[18px] text-primary">calendar_today</span>
                            <span className="font-medium text-sm text-text-main dark:text-white whitespace-nowrap capitalize">
                                {new Date(selectedDate + 'T00:00:00').toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { weekday: 'long', day: 'numeric', month: 'short' })}
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                const d = new Date(selectedDate);
                                d.setDate(d.getDate() + 1);
                                setSelectedDate(d.toISOString().split('T')[0]);
                            }}
                            className="size-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-text-secondary dark:text-gray-300"
                        >
                            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                        </button>
                    </div>
                </div>

                {/* KPI Grid */}
                <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
                    <div className="md:col-span-1 bg-gradient-to-br from-purple-700 to-black text-white rounded-xl p-6 shadow-glow relative overflow-hidden group border border-purple-800/30">
                        <div className="absolute -right-6 -top-6 bg-purple-500/20 size-32 rounded-full blur-2xl group-hover:bg-purple-500/30 transition-all"></div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1 opacity-90">
                                    <span className="material-symbols-outlined text-[20px]">local_fire_department</span>
                                    <span className="text-sm font-medium">{t('nutrition.calories')}</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-bold tracking-tight">{Math.round(totals.calories)}</span>
                                    <span className="text-sm font-medium opacity-80">/ {Math.round(targetCalories)}</span>
                                </div>
                            </div>
                            <div className="mt-4">
                                <div className="flex justify-between text-xs font-medium mb-1.5 opacity-90">
                                    <span>{Math.round(caloriesPercent)}% {t('nutrition.tracking.consumed')}</span>
                                    <span>{Math.round(caloriesLeft)} {t('nutrition.tracking.left')}</span>
                                </div>
                                <div className="w-full bg-black/40 rounded-full h-2">
                                    <div className="bg-white h-2 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: `${caloriesPercent}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 shadow-sm border border-border-light dark:border-border-dark flex flex-col justify-between hover:border-primary/30 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                            <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 p-2 rounded-lg">
                                <span className="material-symbols-outlined text-[20px]">egg_alt</span>
                            </div>
                            <span className="text-xs font-bold text-text-secondary dark:text-gray-300 bg-gray-50 dark:bg-white/5 px-2 py-1 rounded">{Math.round(proteinPercent)}%</span>
                        </div>
                        <div>
                            <p className="text-text-secondary dark:text-gray-400 text-sm font-medium">{t('nutrition.tracking.protein')}</p>
                            <p className="text-xl font-bold text-text-main dark:text-white">{Math.round(proteinLeft)}g <span className="text-xs font-normal text-text-secondary dark:text-gray-400">{t('nutrition.tracking.left')}</span></p>
                            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mt-3">
                                <div className="bg-primary h-1.5 rounded-full shadow-glow-sm" style={{ width: `${proteinPercent}%` }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 shadow-sm border border-border-light dark:border-border-dark flex flex-col justify-between hover:border-primary/30 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                            <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 p-2 rounded-lg">
                                <span className="material-symbols-outlined text-[20px]">bakery_dining</span>
                            </div>
                            <span className="text-xs font-bold text-text-secondary dark:text-gray-300 bg-gray-50 dark:bg-white/5 px-2 py-1 rounded">{Math.round(carbsPercent)}%</span>
                        </div>
                        <div>
                            <p className="text-text-secondary dark:text-gray-400 text-sm font-medium">{t('nutrition.tracking.carbs')}</p>
                            <p className="text-xl font-bold text-text-main dark:text-white">{Math.round(carbsLeft)}g <span className="text-xs font-normal text-text-secondary dark:text-gray-400">{t('nutrition.tracking.left')}</span></p>
                            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mt-3">
                                <div className="bg-primary h-1.5 rounded-full shadow-glow-sm" style={{ width: `${carbsPercent}%` }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 shadow-sm border border-border-light dark:border-border-dark flex flex-col justify-between hover:border-primary/30 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                            <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 p-2 rounded-lg">
                                <span className="material-symbols-outlined text-[20px]">oil_barrel</span>
                            </div>
                            <span className="text-xs font-bold text-text-secondary dark:text-gray-300 bg-gray-50 dark:bg-white/5 px-2 py-1 rounded">{Math.round(fatPercent)}%</span>
                        </div>
                        <div>
                            <p className="text-text-secondary dark:text-gray-400 text-sm font-medium">{t('nutrition.tracking.fats')}</p>
                            <p className="text-xl font-bold text-text-main dark:text-white">{Math.round(fatLeft)}g <span className="text-xs font-normal text-text-secondary dark:text-gray-400">{t('nutrition.tracking.left')}</span></p>
                            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mt-3">
                                <div className="bg-primary h-1.5 rounded-full shadow-glow-sm" style={{ width: `${fatPercent}%` }}></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Meals Feed */}
                <div className="space-y-6">
                    {(["Desayuno", "Almuerzo", "Cena", "Snack"] as const).map((type, idx) => {
                        const typeMeals = mealsByType[type];
                        const typeCalories = typeMeals.reduce((a, m) => a + (m.calories || 0), 0);
                        const icons: Record<string, string> = { Desayuno: "wb_twilight", Almuerzo: "sunny", Cena: "bedtime", Snack: "cookie" };
                        const titles: Record<string, string> = {
                            Desayuno: t('nutrition.breakfast'),
                            Almuerzo: t('nutrition.lunch'),
                            Cena: t('nutrition.dinner'),
                            Snack: t('nutrition.snacks')
                        };

                        // Recommendations placeholder
                        const recs: Record<string, string> = {
                            Desayuno: "400-600 kcal",
                            Almuerzo: "600-800 kcal",
                            Cena: "500-700 kcal",
                            Snack: "150-300 kcal"
                        };

                        return (
                            <article key={type} className={`bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden ${typeMeals.length === 0 ? 'opacity-90' : ''}`}>
                                <div className="px-6 py-4 border-b border-border-light dark:border-border-dark bg-gray-50/50 dark:bg-gradient-to-r dark:from-purple-900/30 dark:to-transparent flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 p-2 rounded-lg">
                                            <span className="material-symbols-outlined">{icons[type]}</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-text-main dark:text-white">{titles[type]}</h3>
                                            <p className="text-xs text-text-secondary dark:text-gray-400 font-medium">{t('nutrition.tracking.recommended')}: {recs[type]}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-text-main dark:text-white bg-white dark:bg-purple-900/20 px-3 py-1 rounded-full border border-border-light dark:border-purple-800/20">
                                            {Math.round(typeCalories)} kcal
                                        </span>
                                        {typeMeals.length > 0 && (
                                            <button
                                                onClick={() => handleClearSection(type)}
                                                className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-gray-400 hover:text-red-500 transition-colors"
                                                title={t('nutrition.tracking.clearSection')}
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {typeMeals.length === 0 ? (
                                    <div className="p-8 flex flex-col items-center justify-center gap-3 text-center">
                                        <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-full mb-1">
                                            <span className="material-symbols-outlined text-text-secondary dark:text-gray-500 text-[32px]">no_meals</span>
                                        </div>
                                        <p className="text-text-secondary dark:text-gray-400 text-sm">{t('nutrition.tracking.noFoodLogged')}</p>
                                        <button
                                            onClick={() => router.push("/dashboard/foods")}
                                            className="mt-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors shadow-glow-sm flex items-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">add</span> {t('nutrition.tracking.addFood')}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border-light dark:divide-border-dark">
                                        {typeMeals.map(meal => (
                                            <div key={meal.id} className="group flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                <div className="text-text-secondary dark:text-purple-400 flex items-center justify-center shrink-0">
                                                    <span className="text-xl">{meal.emoji || "🍽️"}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-text-main dark:text-white font-medium truncate">{meal.food_name}</p>
                                                    <p className="text-xs text-text-secondary dark:text-gray-400">
                                                        {meal.grams}g • {meal.protein_g}P {meal.carbs_g}C {meal.fat_g}F
                                                    </p>
                                                </div>
                                                <div className="shrink-0 flex items-center gap-4">
                                                    <span className="text-sm font-semibold text-text-main dark:text-white w-16 text-right">
                                                        {Math.round(meal.calories || 0)} kcal
                                                    </span>
                                                    <button
                                                        onClick={() => meal.id && handleDelete(meal.id)}
                                                        disabled={deleting === meal.id}
                                                        className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        {deleting === meal.id ? (
                                                            <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                                        ) : (
                                                            <span className="material-symbols-outlined text-[20px]">delete</span>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Quick Add Button at bottom of list */}
                                        <div className="p-4 space-y-3">
                                            {/* Inline Search */}
                                            <FoodSearchInput
                                                onSelect={(food) => handleSelectFood(food, type)}
                                                placeholder={`${t('nutrition.tracking.searchFood')}...`}
                                            />

                                            {/* Quick Add Form (appears after selecting a food) */}
                                            {addingToMeal === type && selectedFood && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800"
                                                >
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <span className="text-2xl">{selectedFood.emoji || "🍽️"}</span>
                                                        <div className="flex-1">
                                                            <p className="font-medium text-gray-900 dark:text-white">{selectedFood.name}</p>
                                                            <p className="text-xs text-gray-500">{Math.round(selectedFood.kcal_per_100g)} kcal/100g</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 mb-3">
                                                        <input
                                                            type="number"
                                                            value={gramsInput}
                                                            onChange={(e) => setGramsInput(e.target.value)}
                                                            className="w-24 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-center font-medium"
                                                            min="1"
                                                        />
                                                        <span className="text-gray-500">gramos</span>
                                                        <div className="flex-1 text-right text-sm font-medium text-emerald-600">
                                                            ≈ {Math.round((selectedFood.kcal_per_100g || 0) * (parseFloat(gramsInput) || 100) / 100)} kcal
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={cancelAdd}
                                                            className="flex-1 py-2 px-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                                        >
                                                            Cancelar
                                                        </button>
                                                        <button
                                                            onClick={handleConfirmAdd}
                                                            disabled={saving}
                                                            className="flex-1 py-2 px-4 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                                                        >
                                                            {saving ? (
                                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                            ) : (
                                                                <>
                                                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                                                    Agregar
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>

                {/* Water Section (Restored in new style) */}
                <div className="mt-8 bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-500 p-2 rounded-lg">
                                <span className="material-symbols-outlined">water_drop</span>
                            </span>
                            <span className="font-bold text-text-main dark:text-white">{t('nutrition.tracking.hydration')}</span>
                        </div>
                        <span className="text-sm font-medium text-text-secondary dark:text-gray-400">{(waterGlasses * 0.25).toFixed(2)} / 3.00 L</span>
                    </div>

                    <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
                        {[...Array(10)].map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setWaterGlasses(i < waterGlasses ? i : i + 1)}
                                className={`
                                    h-12 rounded-lg border-2 transition-all flex items-center justify-center
                                    ${i < waterGlasses
                                        ? 'bg-blue-500 border-blue-600 text-white shadow-glow-sm'
                                        : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 hover:border-blue-400'
                                    }
                                `}
                            >
                                <span className="material-symbols-outlined text-[18px]">local_drink</span>
                            </button>
                        ))}
                    </div>
                </div>

            </main>
        </div>
    );
}
