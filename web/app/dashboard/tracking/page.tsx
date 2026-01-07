"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { motion } from "framer-motion";
import { Card, Button, ProgressBar, Alert } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { getProfile, getMealEntries, deleteMealEntry, upsertDailyLog } from "@/lib/supabase/database";
import { calculateHealthMetrics, calculateMacros, calculateProjection } from "@/lib/calculations";
import { MealEntry, UserProfile } from "@/types";

export default function TrackingPage() {
    const router = useRouter();
    const [userId, setUserId] = useState<string>("");
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [meals, setMeals] = useState<MealEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<number | null>(null);

    useEffect(() => {
        const load = async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push("/login"); return; }
            setUserId(session.user.id);

            const [prof, entries] = await Promise.all([
                getProfile(session.user.id),
                getMealEntries(session.user.id, date),
            ]);
            setProfile(prof);
            setMeals(entries);
            setLoading(false);
        };
        load();
    }, [router, date]);

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

    // Calculate targets
    const metrics = profile ? calculateHealthMetrics(profile, "moderado") : null;
    const projection = profile && metrics ? calculateProjection(profile.weight_kg, profile.target_weight_kg, metrics.tdee, profile.goal, "moderado") : null;
    const macroTargets = projection && profile ? calculateMacros(projection.daily_calories, profile.diet_type) : null;

    const mealsByType = {
        Desayuno: meals.filter(m => m.meal_type === "Desayuno"),
        Almuerzo: meals.filter(m => m.meal_type === "Almuerzo"),
        Cena: meals.filter(m => m.meal_type === "Cena"),
        Snack: meals.filter(m => m.meal_type === "Snack"),
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Diario de Comidas</h1>
                    <p className="text-gray-500 mt-1">Registra lo que comes cada día.</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                    />
                    <Button onClick={() => router.push("/dashboard/foods")}>
                        <Plus className="h-4 w-4" /> Agregar
                    </Button>
                </div>
            </div>

            {/* Summary Card */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Resumen del día</h2>
                    <div className="text-2xl font-bold text-purple-600">
                        {totals.calories} / {projection?.daily_calories || 2000} kcal
                    </div>
                </div>

                <ProgressBar value={totals.calories} max={projection?.daily_calories || 2000} />

                <div className="mt-6 grid grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-gray-500">Proteína</div>
                        <div className="text-xl font-semibold mt-1">{totals.protein_g}g</div>
                        <div className="text-xs text-gray-400">/ {macroTargets?.protein_g || 150}g</div>
                        <div className="mt-2"><ProgressBar value={totals.protein_g} max={macroTargets?.protein_g || 150} /></div>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-gray-500">Carbohidratos</div>
                        <div className="text-xl font-semibold mt-1">{totals.carbs_g}g</div>
                        <div className="text-xs text-gray-400">/ {macroTargets?.carbs_g || 250}g</div>
                        <div className="mt-2"><ProgressBar value={totals.carbs_g} max={macroTargets?.carbs_g || 250} /></div>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-gray-500">Grasas</div>
                        <div className="text-xl font-semibold mt-1">{totals.fat_g}g</div>
                        <div className="text-xs text-gray-400">/ {macroTargets?.fat_g || 65}g</div>
                        <div className="mt-2"><ProgressBar value={totals.fat_g} max={macroTargets?.fat_g || 65} /></div>
                    </div>
                </div>
            </Card>

            {/* Meals by type */}
            {(["Desayuno", "Almuerzo", "Cena", "Snack"] as const).map(type => (
                <Card key={type}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <UtensilsCrossed className="h-5 w-5 text-purple-500" />
                            {type}
                        </h3>
                        <span className="text-sm text-gray-500">
                            {mealsByType[type].reduce((a, m) => a + (m.calories || 0), 0)} kcal
                        </span>
                    </div>

                    {mealsByType[type].length === 0 ? (
                        <p className="text-gray-400 text-sm">No hay alimentos registrados.</p>
                    ) : (
                        <div className="space-y-2">
                            {mealsByType[type].map(meal => (
                                <div key={meal.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                    <div>
                                        <div className="font-medium">{meal.food_name}</div>
                                        <div className="text-xs text-gray-500">
                                            {meal.grams}g · {meal.protein_g}P · {meal.carbs_g}C · {meal.fat_g}G
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold text-purple-600">{meal.calories} kcal</span>
                                        <button
                                            onClick={() => meal.id && handleDelete(meal.id)}
                                            disabled={deleting === meal.id}
                                            className="text-red-500 hover:text-red-700 transition"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            ))}

            {meals.length === 0 && (
                <Alert type="info">
                    <Calendar className="h-5 w-5 inline mr-2" />
                    No tienes alimentos registrados para este día.
                    <Button variant="ghost" className="ml-2" onClick={() => router.push("/dashboard/foods")}>
                        Agregar ahora
                    </Button>
                </Alert>
            )}
        </motion.div>
    );
}
