"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Info, Droplets, Scale } from "lucide-react";
import { motion } from "framer-motion";
import { Card, Select, Alert, ProgressBar } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { getProfile, upsertProfile } from "@/lib/supabase/database";
import { calculateHealthMetrics, calculateMacros, calculateProjectionWithExercise, calculateIdealWeightRange, calculateWaterIntake } from "@/lib/calculations";
import { DIET_MACROS, getMacroDistribution } from "@/lib/diets";
import { UserProfile, DietType } from "@/types";

export default function NutritionPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [mode, setMode] = useState<"conservador" | "moderado" | "acelerado">("moderado");
    const [loading, setLoading] = useState(true);
    const [weeklyExerciseCalories, setWeeklyExerciseCalories] = useState(0);

    useEffect(() => {
        const load = async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push("/login"); return; }

            const prof = await getProfile(session.user.id);
            setProfile(prof);
            if (prof?.goal_speed) {
                setMode(prof.goal_speed);
            }

            // Fetch weekly exercise calories from active workout plan
            const { data: activePlan } = await supabase
                .from('workout_plans')
                .select('weekly_calories_burned')
                .eq('user_id', session.user.id)
                .eq('is_active', true)
                .single();

            if (activePlan?.weekly_calories_burned) {
                setWeeklyExerciseCalories(activePlan.weekly_calories_burned);
            }

            setLoading(false);
        };
        load();
    }, [router]);

    const handleModeChange = async (newMode: "conservador" | "moderado" | "acelerado") => {
        setMode(newMode);
        if (profile) {
            const updatedProfile = { ...profile, goal_speed: newMode };
            setProfile(updatedProfile);
            await upsertProfile({ user_id: profile.user_id, goal_speed: newMode });
        }
    };

    const metrics = useMemo(() => profile ? calculateHealthMetrics(profile, mode) : null, [profile, mode]);

    // Two projections: Diet Only vs Diet + Exercise
    const projectionDietOnly = useMemo(() => profile && metrics ? calculateProjectionWithExercise(profile.weight_kg, profile.target_weight_kg, metrics.tdee, metrics.bmr, profile.goal, mode, 0) : null, [profile, metrics, mode]);
    const projection = useMemo(() => profile && metrics ? calculateProjectionWithExercise(profile.weight_kg, profile.target_weight_kg, metrics.tdee, metrics.bmr, profile.goal, mode, weeklyExerciseCalories) : null, [profile, metrics, mode, weeklyExerciseCalories]);

    const macros = useMemo(() => projection && profile ? calculateMacros(projection.daily_calories, profile.diet_type) : null, [projection, profile]);
    const idealWeight = useMemo(() => profile ? calculateIdealWeightRange(profile.height_cm) : null, [profile]);
    const waterIntake = useMemo(() => profile ? calculateWaterIntake(profile.weight_kg, profile.activity_level) : 2.5, [profile]);
    const macroDist = useMemo(() => profile ? getMacroDistribution(profile.diet_type) : null, [profile]);

    if (loading || !profile || !metrics || !projection || !projectionDietOnly || !macros) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Calculadora Nutricional</h1>
                <p className="text-gray-500 mt-1">Todos tus cálculos personalizados en un solo lugar.</p>
            </div>

            {projection.warnings.length > 0 && (
                <Alert type="warning">
                    {projection.warnings.map((w, i) => <p key={i}>{w}</p>)}
                </Alert>
            )}

            {/* Main Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="text-center">
                    <div className="text-sm text-gray-500">IMC</div>
                    <div className="text-3xl font-bold mt-1">{metrics.bmi}</div>
                    <div className="text-xs mt-1 text-purple-600 font-medium">{metrics.bmi_category}</div>
                </Card>
                <Card className="text-center">
                    <div className="text-sm text-gray-500">TMB</div>
                    <div className="text-3xl font-bold mt-1">{metrics.bmr}</div>
                    <div className="text-xs mt-1 text-gray-400">kcal/día en reposo</div>
                </Card>
                <Card className="text-center">
                    <div className="text-sm text-gray-500">TDEE</div>
                    <div className="text-3xl font-bold mt-1">{metrics.tdee}</div>
                    <div className="text-xs mt-1 text-gray-400">kcal/día total</div>
                </Card>
                <Card className="text-center">
                    <div className="text-sm text-gray-500">Objetivo</div>
                    <div className="text-3xl font-bold mt-1 text-purple-600">{projection.daily_calories}</div>
                    <div className="text-xs mt-1 text-gray-400">kcal/día</div>
                </Card>
            </div>

            {/* Mode Selector */}
            <Card>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold">Velocidad de progreso</h2>
                        <p className="text-sm text-gray-500">Ajusta según tu preferencia</p>
                    </div>
                    <div className="flex gap-2">
                        {(["conservador", "moderado", "acelerado"] as const).map(m => (
                            <button
                                key={m}
                                onClick={() => handleModeChange(m)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${mode === m ? "bg-purple-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600"}`}
                            >
                                {m.charAt(0).toUpperCase() + m.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Two Projections: Diet Only vs Diet + Exercise */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Diet Only */}
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">Solo Dieta</h3>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                                <div className="text-xs text-gray-500">Ritmo</div>
                                <div className="text-lg font-semibold">{projectionDietOnly.weekly_rate} kg/sem</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500">Semanas</div>
                                <div className="text-lg font-semibold">{projectionDietOnly.weeks}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500">Fecha</div>
                                <div className="text-lg font-semibold">{projectionDietOnly.target_date}</div>
                            </div>
                        </div>
                    </div>

                    {/* Diet + Exercise */}
                    <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-300 dark:border-purple-700">
                        <h3 className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-3 flex items-center gap-2">
                            Dieta + Ejercicio
                            {weeklyExerciseCalories > 0 && <span className="text-xs font-normal">({Math.round(weeklyExerciseCalories / 7)} kcal/día)</span>}
                        </h3>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                                <div className="text-xs text-gray-500">Ritmo</div>
                                <div className="text-lg font-semibold text-purple-600">{projection.weekly_rate} kg/sem</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500">Semanas</div>
                                <div className="text-lg font-semibold text-purple-600">{projection.weeks}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500">Fecha</div>
                                <div className="text-lg font-semibold text-purple-600">{projection.target_date}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-4 text-sm" style={{ color: projection.color }}>
                    {projection.risk_msg}
                </div>
            </Card>

            {/* Macros Distribution */}
            <Card>
                <h2 className="text-lg font-semibold mb-4">Distribución de Macros ({profile.diet_type})</h2>

                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                        <div className="text-4xl font-bold text-red-500">{macros.protein_g}g</div>
                        <div className="text-sm text-gray-500 mt-1">Proteína</div>
                        <div className="text-xs text-gray-400">{macroDist?.protein_pct}% de calorías</div>
                        <div className="mt-2"><ProgressBar value={macroDist?.protein_pct || 0} max={100} color="purple" /></div>
                    </div>
                    <div className="text-center">
                        <div className="text-4xl font-bold text-amber-500">{macros.carbs_g}g</div>
                        <div className="text-sm text-gray-500 mt-1">Carbohidratos</div>
                        <div className="text-xs text-gray-400">{macroDist?.carbs_pct}% de calorías</div>
                        <div className="mt-2"><ProgressBar value={macroDist?.carbs_pct || 0} max={100} color="amber" /></div>
                    </div>
                    <div className="text-center">
                        <div className="text-4xl font-bold text-green-500">{macros.fat_g}g</div>
                        <div className="text-sm text-gray-500 mt-1">Grasas</div>
                        <div className="text-xs text-gray-400">{macroDist?.fat_pct}% de calorías</div>
                        <div className="mt-2"><ProgressBar value={macroDist?.fat_pct || 0} max={100} color="green" /></div>
                    </div>
                </div>
            </Card>

            {/* Additional Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Droplets className="h-5 w-5 text-blue-500" /> Hidratación</h3>
                    <div className="text-3xl font-bold text-blue-500">{waterIntake} L</div>
                    <p className="text-sm text-gray-500 mt-1">Agua recomendada por día</p>
                </Card>
                <Card>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Scale className="h-5 w-5 text-amber-500" /> Peso Ideal</h3>
                    <div className="text-2xl font-bold">{idealWeight?.min} - {idealWeight?.max} kg</div>
                    <p className="text-sm text-gray-500 mt-1">Rango saludable para tu altura</p>
                </Card>
            </div>

            {/* Formulas Info */}
            <Card>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Info className="h-5 w-5" /> Fórmulas Utilizadas
                </h3>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                    <p><strong>TMB (Mifflin-St Jeor):</strong> La fórmula más precisa para calcular el metabolismo basal.</p>
                    <p><strong>TDEE:</strong> TMB × Factor de actividad ({profile.activity_level}).</p>
                    <p><strong>Déficit/Superávit:</strong> Basado en 7700 kcal ≈ 1 kg de grasa corporal.</p>
                    <p><strong>IMC:</strong> Peso(kg) / Altura(m)²</p>
                </div>
            </Card>
        </motion.div>
    );
}
