"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, MoreHorizontal, Info, Heart, ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { getUserLocalDate } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import { getProfile, getMealEntries, deleteMealEntry } from "@/lib/supabase/database";
import { calculateHealthMetrics, calculateMacros, calculateProjectionWithExercise } from "@/lib/calculations";
import { MealEntry, UserProfile } from "@/types";

export default function TrackingPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [selectedDate, setSelectedDate] = useState(getUserLocalDate());
    const [meals, setMeals] = useState<MealEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<number | null>(null);
    const [waterGlasses, setWaterGlasses] = useState(0);

    // Generate week days - Fitia style with monday start
    const weekDays = useMemo(() => {
        const today = new Date();
        const days = [];
        const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

        // Start from monday of current week
        const currentDay = today.getDay();
        const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;

        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + mondayOffset + i);
            days.push({
                date: d.toISOString().split('T')[0],
                dayLabel: dayLabels[i],
                dayNumber: d.getDate(),
                isToday: d.toISOString().split('T')[0] === today.toISOString().split('T')[0]
            });
        }
        return days;
    }, []);

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
    const macroTargets = projection && profile ? calculateMacros(projection.daily_calories, profile.diet_type) : null;

    const mealsByType = {
        Desayuno: meals.filter(m => m.meal_type === "Desayuno"),
        Almuerzo: meals.filter(m => m.meal_type === "Almuerzo"),
        Cena: meals.filter(m => m.meal_type === "Cena"),
        Snack: meals.filter(m => m.meal_type === "Snack"),
    };

    const targetCalories = projection?.daily_calories || 1524;
    const minCalories = Math.round(targetCalories * 0.8);
    const waterTarget = profile ? Math.round(profile.weight_kg * 0.033 * 10) / 10 : 3.2;

    // SVG Circular progress calculation
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const caloriePercentage = Math.min((totals.calories / targetCalories) * 100, 100);
    const strokeDashoffset = circumference - (caloriePercentage / 100) * circumference;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* ========== CALENDAR HEADER - Fitia Style ========== */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
                <div className="flex items-center justify-between max-w-4xl mx-auto">
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                        <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>

                    <div className="flex items-center gap-2">
                        {weekDays.map((day) => {
                            const isSelected = selectedDate === day.date;

                            return (
                                <button
                                    key={day.date}
                                    onClick={() => setSelectedDate(day.date)}
                                    className={`
                                        flex flex-col items-center px-4 py-2 rounded-2xl min-w-[56px]
                                        transition-all duration-200
                                        ${isSelected
                                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 dark:shadow-purple-900/30'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                                        }
                                    `}
                                >
                                    <span className={`text-xs font-medium uppercase ${isSelected ? 'text-purple-200' : 'text-gray-500 dark:text-gray-500'}`}>
                                        {day.dayLabel}
                                    </span>
                                    <span className={`text-lg font-semibold mt-1 ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                        {day.dayNumber}
                                    </span>
                                    <div className={`
                                        w-1.5 h-1.5 rounded-full mt-2
                                        ${isSelected ? 'bg-white' : day.isToday ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}
                                    `} />
                                </button>
                            );
                        })}
                    </div>

                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                        <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
                {/* ========== CIRCULAR CALORIE WIDGET - Fitia Style ========== */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                    {/* Circular Progress */}
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <svg width="200" height="200" className="transform -rotate-90">
                                {/* Background circle */}
                                <circle
                                    cx="100"
                                    cy="100"
                                    r={radius}
                                    stroke="#F3F4F6"
                                    strokeWidth="12"
                                    fill="none"
                                    className="dark:stroke-gray-800"
                                />

                                {/* Progress circle */}
                                <circle
                                    cx="100"
                                    cy="100"
                                    r={radius}
                                    stroke="url(#purpleGradient)"
                                    strokeWidth="12"
                                    fill="none"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                    className="transition-all duration-700 ease-out"
                                />

                                <defs>
                                    <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#A855F7" />
                                        <stop offset="100%" stopColor="#7C3AED" />
                                    </linearGradient>
                                </defs>

                                {/* Range markers */}
                                <circle cx="30" cy="100" r="4" fill="#9CA3AF" />
                                <circle cx="170" cy="100" r="4" fill="#9CA3AF" />
                            </svg>

                            {/* Center text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <div className="text-center">
                                    <div className="text-4xl font-bold text-gray-900 dark:text-white">
                                        {totals.calories} <span className="text-2xl text-gray-400">/ {targetCalories}</span>
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1">kcal</div>
                                </div>
                            </div>

                            {/* Range labels */}
                            <div className="absolute bottom-4 left-0 right-0 flex justify-between px-4">
                                <span className="text-xs text-gray-400">{minCalories}</span>
                                <span className="text-xs text-gray-400">{targetCalories}</span>
                            </div>
                        </div>
                    </div>

                    {/* Macro Bars */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Proteínas */}
                        <div>
                            <div className="flex items-baseline justify-between mb-2">
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Proteínas</span>
                            </div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                {totals.protein_g} / {macroTargets?.protein_g || 95} g
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-purple-600 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min((totals.protein_g / (macroTargets?.protein_g || 95)) * 100, 100)}%` }}
                                />
                            </div>
                        </div>

                        {/* Carbs */}
                        <div>
                            <div className="flex items-baseline justify-between mb-2">
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Carbs Netos</span>
                            </div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                {totals.carbs_g} / {macroTargets?.carbs_g || 19} g
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-purple-600 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min((totals.carbs_g / (macroTargets?.carbs_g || 19)) * 100, 100)}%` }}
                                />
                            </div>
                        </div>

                        {/* Grasas */}
                        <div>
                            <div className="flex items-baseline justify-between mb-2">
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Grasas</span>
                            </div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                {totals.fat_g} / {macroTargets?.fat_g || 119} g
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-purple-600 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min((totals.fat_g / (macroTargets?.fat_g || 119)) * 100, 100)}%` }}
                                />
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
                        <div key={type} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{type}</h3>
                                    {typeMeals.length > 0 && (
                                        <p className="text-sm text-gray-500 mt-0.5">
                                            {typeCalories} kcal | {typeProtein} P | {typeCarbs} CN | {typeFat} G
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-purple-600 font-medium italic">SummerFit</span>
                                    <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                        <MoreHorizontal className="w-5 h-5 text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Food Items or Empty */}
                            {typeMeals.length === 0 ? (
                                <p className="text-sm text-gray-400 mb-4">Sin alimentos registrados</p>
                            ) : (
                                <div className="space-y-1 mb-4">
                                    {typeMeals.map(meal => (
                                        <motion.div
                                            key={meal.id}
                                            className="flex items-center gap-4 py-3 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                        >
                                            {/* Food Icon */}
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/20 flex items-center justify-center flex-shrink-0">
                                                <span className="text-xl">🍽️</span>
                                            </div>

                                            {/* Food Info */}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                    {meal.food_name}
                                                </h4>
                                                <p className="text-xs text-gray-500 truncate">
                                                    (peso crudo)
                                                </p>
                                            </div>

                                            {/* Stats */}
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {meal.grams} g
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {meal.calories} kcal
                                                </p>
                                            </div>

                                            {/* Checkbox/Delete */}
                                            <button
                                                onClick={() => meal.id && handleDelete(meal.id)}
                                                disabled={deleting === meal.id}
                                                className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex-shrink-0 flex items-center justify-center"
                                            >
                                                {deleting === meal.id && (
                                                    <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                                )}
                                            </button>
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            {/* Add Button */}
                            <button
                                onClick={() => router.push("/dashboard/foods")}
                                className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all flex items-center justify-center group"
                            >
                                <Plus className="w-5 h-5 text-gray-400 group-hover:text-purple-600" />
                            </button>
                        </div>
                    );
                })}

                {/* ========== ACTIVITY SECTION - Fitia Style ========== */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                                <Flame className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">Actividad</h3>
                                <p className="text-sm text-gray-500">NEAT — 0 kcal</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Heart className="w-5 h-5 text-red-400" fill="#f87171" />
                            <MoreHorizontal className="w-5 h-5 text-gray-400" />
                        </div>
                    </div>
                </div>

                {/* ========== WATER SECTION - Fitia Style ========== */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">💧</span>
                            <span className="font-semibold text-gray-900 dark:text-white">Agua</span>
                            <Info className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">{(waterGlasses * 0.275).toFixed(1)} / {waterTarget} L</span>
                            <MoreHorizontal className="w-5 h-5 text-gray-400" />
                        </div>
                    </div>

                    {/* Water Glasses Grid - Fitia Style (6 columns, 2 rows = 12 glasses) */}
                    <div className="grid grid-cols-5 gap-2 sm:gap-3">
                        {[...Array(10)].map((_, i) => {
                            const isFilled = i < waterGlasses;

                            return (
                                <motion.button
                                    key={i}
                                    onClick={() => setWaterGlasses(i < waterGlasses ? i : i + 1)}
                                    className="relative group"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <div className={`
                                        aspect-[3/4] rounded-t-lg rounded-b-sm border-2 transition-all overflow-hidden
                                        ${isFilled
                                            ? 'border-cyan-300 dark:border-cyan-600 bg-cyan-50 dark:bg-cyan-900/20'
                                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 group-hover:border-cyan-200'
                                        }
                                    `}>
                                        {/* Water fill */}
                                        <motion.div
                                            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-400 to-blue-300"
                                            initial={{ height: 0 }}
                                            animate={{ height: isFilled ? '45%' : 0 }}
                                            transition={{ duration: 0.3 }}
                                        />

                                        {/* Glass icon when empty */}
                                        {!isFilled && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <svg viewBox="0 0 24 32" className="w-8 h-10 text-gray-300 dark:text-gray-600">
                                                    <path
                                                        d="M5 4h14l-2 24H7L5 4z"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                </div>

                {/* Spacer */}
                <div className="h-8" />
            </div>
        </div>
    );
}
