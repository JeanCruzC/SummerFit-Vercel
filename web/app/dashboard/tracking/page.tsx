"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Activity, Droplets, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { getUserLocalDate } from "@/lib/date";
import { Card, Button, ProgressBar } from "@/components/ui";
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

    // Generate week days centered on today
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

            {/* Weekly Calendar Header */}
            <Card className="!p-3">
                <div className="flex justify-between items-center">
                    {weekDays.map(day => (
                        <button
                            key={day.date}
                            onClick={() => setSelectedDate(day.date)}
                            className={`flex flex-col items-center px-3 py-2 rounded-xl transition ${selectedDate === day.date
                                    ? 'bg-purple-500 text-white'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                        >
                            <span className="text-xs font-medium">{day.dayName}</span>
                            <span className={`text-lg font-bold ${day.isToday && selectedDate !== day.date ? 'text-purple-500' : ''}`}>
                                {day.dayNumber}
                            </span>
                            <span className={`w-1.5 h-1.5 rounded-full mt-1 ${selectedDate === day.date ? 'bg-white' : 'bg-gray-300 dark:bg-gray-600'
                                }`} />
                        </button>
                    ))}
                </div>
            </Card>

            {/* Macro Summary - Fitia Style */}
            <Card className="text-center !py-6">
                <div className="text-4xl font-bold">
                    <span className={totals.calories > 0 ? 'text-purple-600' : 'text-gray-400'}>{totals.calories}</span>
                    <span className="text-gray-400"> / {projection?.daily_calories || 1500}</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">kcal</div>

                {/* Progress Bar */}
                <div className="mt-4 mx-auto max-w-md">
                    <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="absolute h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all"
                            style={{ width: `${Math.min((totals.calories / (projection?.daily_calories || 1500)) * 100, 100)}%` }}
                        />
                        {/* Markers */}
                        <div className="absolute h-full w-0.5 bg-gray-400" style={{ left: '80%' }} />
                        <div className="absolute h-full w-0.5 bg-gray-400" style={{ left: '100%' }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span></span>
                        <span>{Math.round((projection?.daily_calories || 1500) * 0.8)}</span>
                        <span>{projection?.daily_calories || 1500}</span>
                    </div>
                </div>

                {/* Macro Grid */}
                <div className="grid grid-cols-3 gap-4 mt-6 text-center">
                    <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Proteínas</div>
                        <div className="text-lg font-semibold mt-1">
                            {totals.protein_g} / {macroTargets?.protein_g || 100} g
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Carbs Netos</div>
                        <div className="text-lg font-semibold mt-1">
                            {totals.carbs_g} / {macroTargets?.carbs_g || 50} g
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Grasas</div>
                        <div className="text-lg font-semibold mt-1">
                            {totals.fat_g} / {macroTargets?.fat_g || 80} g
                        </div>
                    </div>
                </div>
            </Card>

            {/* Meal Sections - Fitia Style */}
            {(["Desayuno", "Almuerzo", "Cena", "Snack"] as const).map(type => {
                const typeMeals = mealsByType[type];
                const typeCalories = typeMeals.reduce((a, m) => a + (m.calories || 0), 0);
                const typeProtein = typeMeals.reduce((a, m) => a + (m.protein_g || 0), 0);
                const typeCarbs = typeMeals.reduce((a, m) => a + (m.carbs_g || 0), 0);
                const typeFat = typeMeals.reduce((a, m) => a + (m.fat_g || 0), 0);

                return (
                    <Card key={type} className="!p-4">
                        {/* Meal Header */}
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-lg font-bold">{type}</h3>
                                {typeMeals.length > 0 && (
                                    <p className="text-xs text-gray-500">
                                        {typeCalories} kcal | {typeProtein} P | {typeCarbs} CN | {typeFat} G
                                    </p>
                                )}
                            </div>
                            <span className="text-purple-400 text-xs font-medium">SummerFit</span>
                        </div>

                        {/* Food Items */}
                        {typeMeals.length === 0 ? (
                            <p className="text-gray-400 text-sm py-2">Sin alimentos registrados</p>
                        ) : (
                            <div className="space-y-2 mb-3">
                                {typeMeals.map(meal => (
                                    <div key={meal.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-sm">
                                                🍽️
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">{meal.food_name}</div>
                                                <div className="text-xs text-gray-400">({meal.grams}g)</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <div className="text-sm font-medium">{meal.grams}g</div>
                                                <div className="text-xs text-gray-400">{meal.calories} kcal</div>
                                            </div>
                                            <button
                                                onClick={() => meal.id && handleDelete(meal.id)}
                                                disabled={deleting === meal.id}
                                                className="text-gray-300 hover:text-red-500 transition"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add Button */}
                        <button
                            onClick={() => router.push("/dashboard/foods")}
                            className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 hover:border-purple-300 hover:text-purple-500 transition flex items-center justify-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                    </Card>
                );
            })}

            {/* Activity Section */}
            <Card className="!p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <Activity className="h-5 w-5 text-orange-500" />
                        </div>
                        <div>
                            <h3 className="font-bold">Actividad</h3>
                            <p className="text-xs text-gray-500">NEAT — 0 kcal</p>
                        </div>
                    </div>
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition">
                        <Plus className="h-5 w-5 text-gray-400" />
                    </button>
                </div>
            </Card>

            {/* Water Tracking */}
            <Card className="!p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Droplets className="h-5 w-5 text-blue-500" />
                        <div>
                            <span className="font-bold">Agua</span>
                            <span className="text-gray-400 text-sm ml-2">ⓘ</span>
                        </div>
                    </div>
                    <span className="text-sm text-gray-500">{(waterGlasses * 0.25).toFixed(1)} / {waterTarget} L</span>
                </div>

                {/* Water Glasses Grid */}
                <div className="grid grid-cols-5 gap-2">
                    {[...Array(10)].map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setWaterGlasses(i < waterGlasses ? i : i + 1)}
                            className={`aspect-square rounded-lg border-2 transition flex items-center justify-center ${i < waterGlasses
                                    ? 'bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700'
                                    : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                                }`}
                        >
                            <svg viewBox="0 0 24 32" className="w-6 h-8">
                                {/* Glass outline */}
                                <path
                                    d="M4 4 L6 28 L18 28 L20 4 Z"
                                    fill="none"
                                    stroke={i < waterGlasses ? '#3b82f6' : '#d1d5db'}
                                    strokeWidth="2"
                                />
                                {/* Water fill */}
                                {i < waterGlasses && (
                                    <path
                                        d="M5.5 12 L6.5 26 L17.5 26 L18.5 12 Z"
                                        fill="#93c5fd"
                                    />
                                )}
                            </svg>
                        </button>
                    ))}
                </div>
            </Card>

        </motion.div>
    );
}
