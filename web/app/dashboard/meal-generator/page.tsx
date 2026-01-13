"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Target, Utensils, ChefHat } from "lucide-react";
import { Card, Button, Input } from "@/components/ui";
import { calculateBMR, calculateTDEE, calculateMacros, calculateTargetCalories, calculateProjection } from "@/lib/calculations";
import {
    generateDayMealPlan,
    generateWeeklyMealPlan,
    MealPlan,
    WeeklyMealPlan,
    SIMPLE_FOODS
} from "@/lib/mealGenerator";
import { createClient } from "@/lib/supabase/client";
import { getProfile, saveMealPlan } from "@/lib/supabase/database";
import { getUserLocalDate, formatDateDisplay } from "@/lib/date";
import { useRouter } from "next/navigation";
import { UserProfile } from "@/types";

export default function MealGeneratorPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);

    // User inputs
    const [targetCalories, setTargetCalories] = useState(2000);
    const [targetProtein, setTargetProtein] = useState(120);
    const [numMeals, setNumMeals] = useState<3 | 4 | 5>(4);
    const [dietType, setDietType] = useState<string>('balanced');
    const [tdee, setTdee] = useState(2000);

    // Generated plan
    const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
    const [weeklyPlan, setWeeklyPlan] = useState<WeeklyMealPlan | null>(null);
    const [mode, setMode] = useState<'daily' | 'weekly'>('daily');
    const [activeDay, setActiveDay] = useState(0);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const userProfile = await getProfile(session.user.id);
                    setProfile(userProfile);

                    // Calculate recommended calories based on profile
                    if (userProfile?.weight_kg && userProfile?.height_cm && userProfile?.age) {
                        // Fix 1: Pass 'M' | 'F' directly to calculateBMR
                        const bmr = calculateBMR(userProfile.weight_kg, userProfile.height_cm, userProfile.age, userProfile.gender);
                        const activityMap: Record<string, string> = {
                            'Sedentario': 'sedentario',
                            'Ligero': 'ligero',
                            'Moderado': 'moderado',
                            'Activo': 'activo',
                            'Muy activo': 'muy_activo'
                        };
                        const calculatedTdee = calculateTDEE(bmr, activityMap[userProfile.activity_level] as any || 'moderado');
                        setTdee(calculatedTdee);

                        // Fix 2: Use calculateTargetCalories + calculateMacros
                        const goalMap: Record<string, string> = {
                            'Definir': 'Definir',
                            'Mantener': 'Mantener',
                            'Volumen': 'Volumen'
                        };
                        const goal = goalMap[userProfile.goal] as 'Definir' | 'Mantener' | 'Volumen' || 'Mantener';
                        const mode = userProfile.goal_speed || 'moderado';

                        const targetCals = calculateTargetCalories(calculatedTdee, goal, mode as any, userProfile.gender);
                        const macros = calculateMacros(targetCals, userProfile.diet_type || 'Estándar');

                        setTargetCalories(macros.calories);
                        setTargetProtein(macros.protein_g);

                        // Set Diet Type from Profile (Source of Truth)
                        if (userProfile.diet_type) {
                            const dietMap: Record<string, string> = {
                                'Estándar': 'balanced',
                                'Keto': 'keto',
                                'Low-Carb': 'low_carb',
                                'Vegana': 'vegan',
                                'Vegetariana': 'vegetarian',
                                'Paleo': 'paleo',
                                'Mediterránea': 'mediterranean',
                                'Alta Proteína': 'high_protein',
                                'Diabéticos': 'diabetes_friendly'
                            };
                            const mappedType = dietMap[userProfile.diet_type] || 'balanced';
                            setDietType(mappedType);
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading profile:', error);
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, []);

    const handleGenerate = () => {
        setGenerating(true);
        setTimeout(() => {
            const conditions = dietType === 'diabetes_friendly' ? ['diabetes_type_2'] : [];

            if (mode === 'daily') {
                const plan = generateDayMealPlan(targetCalories, targetProtein, numMeals, undefined, dietType, conditions);
                setMealPlan(plan);
                setWeeklyPlan(null);
            } else {
                const plan = generateWeeklyMealPlan(targetCalories, targetProtein, numMeals, undefined, dietType, conditions);
                setWeeklyPlan(plan);
                setMealPlan(null);
                setActiveDay(0);
            }
            setGenerating(false);
        }, 500);
    };

    const getMealIcon = (type: string) => {
        switch (type) {
            case 'breakfast': return '🌅';
            case 'lunch': return '☀️';
            case 'dinner': return '🌙';
            case 'snack': return '🍎';
            default: return '🍽️';
        }
    };

    const getProgressColor = (current: number, target: number) => {
        const ratio = current / target;
        if (ratio < 0.9) return 'bg-yellow-500';
        if (ratio > 1.1) return 'bg-red-500';
        return 'bg-green-500';
    };

    const handleSave = async () => {
        if ((!mealPlan && !weeklyPlan) || !profile) return;
        setSaving(true);
        try {
            const entries: any[] = [];

            if (mode === 'daily' && mealPlan) {
                // Save Single Day (Today)
                const todayDate = getUserLocalDate();
                addEntriesForPlan(entries, mealPlan, todayDate);
            } else if (mode === 'weekly' && weeklyPlan) {
                // Save Week (Next 7 days starting today)
                const today = new Date();
                weeklyPlan.days.forEach((dayPlan, index) => {
                    const dateInfo = new Date(today);
                    dateInfo.setDate(today.getDate() + index);
                    const dateStr = getUserLocalDate(dateInfo);
                    addEntriesForPlan(entries, dayPlan, dateStr);
                });
            }

            await saveMealPlan(entries);
            router.push('/dashboard/tracking');
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const addEntriesForPlan = (entries: any[], plan: MealPlan, dateStr: string) => {
        if (!profile) return;
        for (const meal of plan.meals) {
            const dbMealType = meal.type_es;
            for (const item of meal.items) {
                entries.push({
                    user_id: profile.user_id,
                    log_date: dateStr,
                    meal_type: dbMealType,
                    food_name: item.food.name_es || item.food.name,
                    grams: item.portion_g,
                    calories: item.macros.kcal,
                    protein_g: item.macros.protein,
                    carbs_g: item.macros.carbs,
                    fat_g: item.macros.fat,
                });
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 pb-24">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-6"
                >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 text-white text-3xl mb-4">
                        <ChefHat className="h-8 w-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Generador de Comidas
                    </h1>
                    <p className="text-gray-500 mt-1">Plan diario con alimentos simples</p>
                </motion.div>

                {/* Configuration Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    {/* Goal Stats Card */}
                    {profile && (
                        <Card className="p-4 mb-4 bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg text-purple-600 dark:text-purple-300">
                                    <Target className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                        Meta: {calculateProjection(profile.weight_kg, profile.target_weight_kg, tdee, profile.goal as any, profile.goal_speed as any || 'moderado').target_date}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Llegarás en aprox. {calculateProjection(profile.weight_kg, profile.target_weight_kg, tdee, profile.goal as any, profile.goal_speed as any || 'moderado').weeks} semanas
                                    </p>
                                </div>
                            </div>
                        </Card>
                    )}

                    <Card className="p-5 mb-6">
                        <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Target className="h-5 w-5 text-purple-500" />
                            Tus Objetivos
                        </h2>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Calorías diarias</label>
                                <Input
                                    type="number"
                                    value={targetCalories}
                                    onChange={(e) => setTargetCalories(Number(e.target.value))}
                                    className="text-center text-lg font-semibold"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Proteína (g)</label>
                                <Input
                                    type="number"
                                    value={targetProtein}
                                    onChange={(e) => setTargetProtein(Number(e.target.value))}
                                    className="text-center text-lg font-semibold"
                                />
                            </div>
                        </div>

                        {/* Mode Selection */}
                        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-4">
                            <button
                                onClick={() => setMode('daily')}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${mode === 'daily' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                Diario (1 Día)
                            </button>
                            <button
                                onClick={() => setMode('weekly')}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${mode === 'weekly' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                Semanal (7 Días)
                            </button>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm text-gray-500 mb-2">Tipo de Dieta</label>
                            <select
                                value={dietType}
                                onChange={(e) => setDietType(e.target.value)}
                                className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                            >
                                <option value="balanced">Estándar (Balanceada)</option>
                                <option value="keto">Keto (Cetogénica)</option>
                                <option value="diabetes_friendly">Diabetes Friendly (Baja carga glucémica)</option>
                                <option value="vegan">Vegana (Plant-based)</option>
                                <option value="vegetarian">Vegetariana</option>
                                <option value="low_carb">Low-Carb</option>
                                <option value="mediterranean">Mediterránea</option>
                                <option value="high_protein">Alta Proteína</option>
                                <option value="paleo">Paleo</option>
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm text-gray-500 mb-2">Número de comidas</label>
                            <div className="flex gap-2">
                                {[3, 4, 5].map((n) => (
                                    <button
                                        key={n}
                                        onClick={() => setNumMeals(n as 3 | 4 | 5)}
                                        className={`flex-1 py-2 rounded-lg font-medium transition ${numMeals === n
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                                            }`}
                                    >
                                        {n} comidas
                                    </button>
                                ))}
                            </div>
                        </div>

                        <Button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="w-full py-3 text-lg bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                        >
                            {generating ? (
                                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                            ) : (
                                <Utensils className="h-5 w-5 mr-2" />
                            )}
                            {generating ? 'Generando...' : 'Generar Plan'}
                        </Button>

                        {/* Save Button */}
                        {(mealPlan || weeklyPlan) && (
                            <Button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full mt-3 py-3 text-lg bg-green-600 hover:bg-green-700 text-white"
                            >
                                {saving ? 'Guardando...' : (mode === 'weekly' ? 'Guardar Semana' : 'Guardar en Diario')}
                            </Button>
                        )}
                    </Card>
                </motion.div>

                {/* Generated Meal Plan */}
                <AnimatePresence mode="wait">
                    {mealPlan && (
                        <motion.div
                            key={mode === 'daily' ? mealPlan!.id : weeklyPlan!.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            {/* Weekly Tabs */}
                            {mode === 'weekly' && weeklyPlan && (
                                <div className="flex overflow-x-auto gap-2 mb-4 pb-2 no-scrollbar">
                                    {weeklyPlan.days.map((day, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveDay(idx)}
                                            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${activeDay === idx
                                                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                                                : 'bg-white text-gray-500 border border-gray-200'
                                                }`}
                                        >
                                            Día {idx + 1}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Stats Card - Shows either Daily or Weekly avg */}
                            <Card className="p-5 mb-4 bg-gradient-to-r from-orange-500 to-red-500 text-white">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-semibold">{mode === 'weekly' ? 'Promedio Diario' : 'Total del Día'}</h3>
                                    <button
                                        onClick={handleGenerate}
                                        className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                    </button>
                                </div>
                                {mode === 'weekly' && weeklyPlan ? (
                                    <div className="grid grid-cols-4 gap-3 text-center">
                                        <div>
                                            <div className="text-2xl font-bold">{weeklyPlan.week_totals.kcal}</div>
                                            <div className="text-xs opacity-80">🔥 kcal</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold">{weeklyPlan.week_totals.protein}</div>
                                            <div className="text-xs opacity-80">🥩 Prot</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold">{weeklyPlan.week_totals.carbs}</div>
                                            <div className="text-xs opacity-80">🍞 Carb</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold">{weeklyPlan.week_totals.fat}</div>
                                            <div className="text-xs opacity-80">🥑 Gras</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-4 gap-3 text-center">
                                        <div>
                                            <div className="text-2xl font-bold">{mealPlan!.totals.kcal}</div>
                                            <div className="text-xs opacity-80">🔥 kcal</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold">{Math.round(mealPlan!.totals.protein)}</div>
                                            <div className="text-xs opacity-80">🥩 Prot</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold">{Math.round(mealPlan!.totals.carbs)}</div>
                                            <div className="text-xs opacity-80">🍞 Carb</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold">{Math.round(mealPlan!.totals.fat)}</div>
                                            <div className="text-xs opacity-80">🥑 Gras</div>
                                        </div>
                                    </div>
                                )}
                            </Card>

                            {/* Render Daily Meals or Active Day of Week */}
                            {(mode === 'daily' ? mealPlan!.meals : weeklyPlan!.days[activeDay].meals).map((meal, idx) => (
                                <motion.div
                                    key={meal.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                >
                                    <Card className="p-4 mb-3">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">{getMealIcon(meal.type)}</span>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 dark:text-white">{meal.type_es}</h3>
                                                    <p className="text-xs text-gray-500">{meal.totals.kcal} kcal</p>
                                                </div>
                                            </div>
                                            <div className="text-right text-xs text-gray-500">
                                                <div>P: {Math.round(meal.totals.protein)}g</div>
                                                <div>C: {Math.round(meal.totals.carbs)}g | G: {Math.round(meal.totals.fat)}g</div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            {meal.items.map((item, itemIdx) => (
                                                <div
                                                    key={itemIdx}
                                                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl">{item.food.emoji}</span>
                                                        <div>
                                                            <div className="font-medium text-sm text-gray-900 dark:text-white">
                                                                {item.food.name_es}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {item.portion_g}g
                                                                {item.cooking_state && ` • ${item.cooking_state}`}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-semibold text-orange-600">{item.macros.kcal} kcal</div>
                                                        <div className="text-xs text-gray-500">
                                                            P:{item.macros.protein}g C:{item.macros.carbs}g G:{item.macros.fat}g
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}

                            {/* Shopping List */}
                            <Card className="p-4 bg-gray-50 dark:bg-gray-800/50">
                                <h4 className="text-sm font-medium text-gray-500 mb-2">🛒 Lista de compras ({(mode === 'weekly' ? 'Semana' : 'Día')})</h4>
                                <div className="flex flex-wrap gap-2">
                                    {Array.from(new Set(
                                        (mode === 'daily' ? mealPlan!.meals : weeklyPlan!.days.flatMap(d => d.meals))
                                            .flatMap(m => m.items.map(i => i.food))
                                    )).map((food, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-700 rounded-full text-xs"
                                        >
                                            {food.emoji} {food.name_es}
                                        </span>
                                    ))}
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Empty State */}
                {!mealPlan && !weeklyPlan && !generating && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12"
                    >
                        <div className="text-6xl mb-4">🍽️</div>
                        <p className="text-gray-500">
                            Configura tus objetivos y genera tu plan de comidas
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                            Solo alimentos simples: pollo, arroz, papa, huevos, etc.
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
