"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Heart, MoreHorizontal, Info, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { getUserLocalDate } from "@/lib/date";
import { Card, Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { getProfile, getMealEntries, deleteMealEntry } from "@/lib/supabase/database";
import { calculateHealthMetrics, calculateMacros, calculateProjectionWithExercise } from "@/lib/calculations";
import { MealEntry, UserProfile } from "@/types";

export default function TrackingPage() {
    const router = useRouter();
    const [userId, setUserId] = useState<string>("");
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [selectedDate, setSelectedDate] = useState(getUserLocalDate());
    const [meals, setMeals] = useState<MealEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<number | null>(null);
    const [waterGlasses, setWaterGlasses] = useState(0);

    // Generate week days
    const weekDays = useMemo(() => {
        const today = new Date();
        const days = [];
        const dayNames = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

        for (let i = -3; i <= 3; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            days.push({
                date: d.toISOString().split('T')[0],
                dayName: dayNames[d.getDay()],
                dayNumber: d.getDate(),
                isToday: i === 0
            });
        }
        return days;
    }, []);

    useEffect(() => {
        const load = async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push("/login"); return; }
            setUserId(session.user.id);

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

    const totals = meals.reduce((acc, m) => ({
        calories: acc.calories + (m.calories || 0),
        protein_g: acc.protein_g + (m.protein_g || 0),
        carbs_g: acc.carbs_g + (m.carbs_g || 0),
        fat_g: acc.fat_g + (m.fat_g || 0),
    }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

    const metrics = profile ? calculateHealthMetrics(profile, profile.goal_speed || "moderado") : null;
    const projection = profile && metrics ? calculateProjectionWithExercise(
        profile.weight_kg, profile.target_weight_kg, metrics.tdee, metrics.bmr,
        profile.goal, profile.goal_speed || "moderado", 0
    ) : null;
    const macroTargets = projection && profile ? calculateMacros(projection.daily_calories, profile.diet_type) : null;

    const mealsByType = {
        Desayuno: meals.filter(m => m.meal_type === "Desayuno"),
        Almuerzo: meals.filter(m => m.meal_type === "Almuerzo"),
        Cena: meals.filter(m => m.meal_type === "Cena"),
        Snack: meals.filter(m => m.meal_type === "Snack"),
    };

    const waterTarget = profile ? Math.round(profile.weight_kg * 0.033 * 10) / 10 : 3.0;
    const targetCalories = projection?.daily_calories || 1500;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 max-w-4xl mx-auto">

            {/* ========== WEEKLY CALENDAR - Fitia Style ========== */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-center">
                    {weekDays.map(day => (
                        <button
                            key={day.date}
                            onClick={() => setSelectedDate(day.date)}
                            className="flex flex-col items-center group"
                        >
                            <span className="text-xs font-medium text-gray-400 mb-1">{day.dayName}</span>
                            <div className={`
                                w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-all
                                ${selectedDate === day.date
                                    ? 'bg-purple-500 text-white'
                                    : day.isToday
                                        ? 'text-purple-500'
                                        : 'text-gray-700 dark:text-gray-300 group-hover:bg-gray-100 dark:group-hover:bg-gray-800'
                                }
                            `}>
                                {day.dayNumber}
                            </div>
                            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 ${selectedDate === day.date ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
                                }`} />
                        </button>
                    ))}
                </div>
            </div>

            {/* ========== MACRO SUMMARY CARD - Fitia Style ========== */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                {/* Big Calorie Display */}
                <div className="text-center mb-6">
                    <div className="text-5xl font-bold tracking-tight">
                        <span className={totals.calories > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600'}>
                            {totals.calories}
                        </span>
                        <span className="text-gray-300 dark:text-gray-600"> / {targetCalories}</span>
                    </div>
                    <div className="text-sm text-gray-400 mt-1">kcal</div>
                </div>

                {/* Progress Bar with Markers */}
                <div className="relative mx-auto max-w-lg mb-6">
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-purple-400 to-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min((totals.calories / targetCalories) * 100, 100)}%` }}
                        />
                    </div>
                    {/* Range Markers */}
                    <div className="flex justify-between text-xs text-gray-400 mt-2">
                        <span></span>
                        <span>{Math.round(targetCalories * 0.8)}</span>
                        <span>{targetCalories}</span>
                    </div>
                </div>

                {/* Macro Grid */}
                <div className="grid grid-cols-3 gap-4 text-center border-t border-gray-100 dark:border-gray-800 pt-4">
                    <div>
                        <div className="text-xs text-gray-400 uppercase tracking-wider">Proteínas</div>
                        <div className="text-base font-semibold mt-1">
                            <span className="text-gray-900 dark:text-white">{totals.protein_g}</span>
                            <span className="text-gray-400"> / {macroTargets?.protein_g || 100} g</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-400 uppercase tracking-wider">Carbs Netos</div>
                        <div className="text-base font-semibold mt-1">
                            <span className="text-gray-900 dark:text-white">{totals.carbs_g}</span>
                            <span className="text-gray-400"> / {macroTargets?.carbs_g || 50} g</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-400 uppercase tracking-wider">Grasas</div>
                        <div className="text-base font-semibold mt-1">
                            <span className="text-gray-900 dark:text-white">{totals.fat_g}</span>
                            <span className="text-gray-400"> / {macroTargets?.fat_g || 80} g</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ========== MEAL SECTIONS - Fitia Style ========== */}
            {(["Desayuno", "Almuerzo", "Cena", "Snack"] as const).map(type => {
                const typeMeals = mealsByType[type];
                const typeCalories = typeMeals.reduce((a, m) => a + (m.calories || 0), 0);
                const typeProtein = typeMeals.reduce((a, m) => a + (m.protein_g || 0), 0);
                const typeCarbs = typeMeals.reduce((a, m) => a + (m.carbs_g || 0), 0);
                const typeFat = typeMeals.reduce((a, m) => a + (m.fat_g || 0), 0);

                return (
                    <div key={type} className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{type}</h3>
                                {typeMeals.length > 0 && (
                                    <p className="text-sm text-gray-400 mt-0.5">
                                        {typeCalories} kcal | {typeProtein} P | {typeCarbs} CN | {typeFat} G
                                    </p>
                                )}
                            </div>
                            <span className="text-xs text-purple-400 italic font-medium">SummerFit</span>
                        </div>

                        {/* Food Items */}
                        {typeMeals.length === 0 ? (
                            <p className="text-gray-300 dark:text-gray-600 text-sm py-3">Sin alimentos registrados</p>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {typeMeals.map(meal => (
                                    <div key={meal.id} className="flex items-center justify-between py-3">
                                        <div className="flex items-center gap-3">
                                            {/* Food Icon */}
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/20 flex items-center justify-center">
                                                <span className="text-lg">🍽️</span>
                                            </div>
                                            {/* Food Info */}
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">{meal.food_name}</div>
                                                <div className="text-xs text-gray-400">(peso crudo)</div>
                                            </div>
                                        </div>
                                        {/* Right Side */}
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="text-sm text-gray-700 dark:text-gray-300">{meal.grams} g</div>
                                                <div className="text-xs text-gray-400">{meal.calories} kcal</div>
                                            </div>
                                            {/* Checkbox Circle */}
                                            <button
                                                onClick={() => meal.id && handleDelete(meal.id)}
                                                disabled={deleting === meal.id}
                                                className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-gray-700 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition flex items-center justify-center"
                                            >
                                                {deleting === meal.id && <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add Button */}
                        <button
                            onClick={() => router.push("/dashboard/foods")}
                            className="w-full mt-3 py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 hover:border-purple-300 hover:text-purple-500 transition flex items-center justify-center"
                        >
                            <Plus className="h-5 w-5" />
                        </button>
                    </div>
                );
            })}

            {/* ========== ACTIVITY SECTION - Fitia Style ========== */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Activity Icon */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-100 to-amber-50 dark:from-orange-900/30 dark:to-amber-800/20 flex items-center justify-center">
                            <span className="text-lg">🏃</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Actividad</h3>
                            <p className="text-sm text-gray-400">NEAT — 0 kcal</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Heart className="h-5 w-5 text-red-400" fill="#f87171" />
                        <MoreHorizontal className="h-5 w-5 text-gray-400" />
                    </div>
                </div>
            </div>

            {/* ========== WATER TRACKING - Fitia Style ========== */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">💧</span>
                        <span className="font-bold text-gray-900 dark:text-white">Agua</span>
                        <Info className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{(waterGlasses * 0.25).toFixed(1)} / {waterTarget} L</span>
                        <MoreHorizontal className="h-5 w-5 text-gray-400" />
                    </div>
                </div>

                {/* Water Glasses Grid - Fitia Style */}
                <div className="grid grid-cols-5 gap-3">
                    {[...Array(10)].map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setWaterGlasses(i < waterGlasses ? i : i + 1)}
                            className="group"
                        >
                            <div className={`
                                aspect-[3/4] rounded-lg border-2 transition-all flex flex-col justify-end overflow-hidden
                                ${i < waterGlasses
                                    ? 'border-blue-300 dark:border-blue-600'
                                    : 'border-gray-200 dark:border-gray-700 group-hover:border-blue-200'
                                }
                            `}>
                                {/* Water Level */}
                                <div
                                    className={`
                                        w-full transition-all duration-300 bg-gradient-to-t from-blue-400 to-blue-300
                                        ${i < waterGlasses ? 'opacity-100' : 'opacity-0'}
                                    `}
                                    style={{ height: '40%' }}
                                />
                                {/* Glass Icon when empty */}
                                {i >= waterGlasses && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <svg viewBox="0 0 24 32" className="w-6 h-8 text-gray-200 dark:text-gray-700">
                                            <path d="M6 4h12l-1.5 24h-9L6 4z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

        </motion.div>
    );
}
