"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Info, Droplets, Scale } from "lucide-react";
import { motion } from "framer-motion";
import { Card, Select, Alert, ProgressBar } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { getProfile, upsertProfile } from "@/lib/supabase/database";
import { calculateHealthMetrics, calculateMacros, calculateProjectionWithExercise, calculateIdealWeightRange, calculateWaterIntake } from "@/lib/calculations";
import { getMicronutrientTargets } from "@/lib/nutrition";
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
    const projectionDietOnly = useMemo(() => profile && metrics ? calculateProjectionWithExercise(profile.weight_kg, profile.target_weight_kg, metrics.tdee, metrics.bmr, profile.goal, mode, 0, profile.gender as 'M' | 'F') : null, [profile, metrics, mode]);
    const projection = useMemo(() => profile && metrics ? calculateProjectionWithExercise(profile.weight_kg, profile.target_weight_kg, metrics.tdee, metrics.bmr, profile.goal, mode, weeklyExerciseCalories, profile.gender as 'M' | 'F') : null, [profile, metrics, mode, weeklyExerciseCalories]);

    const macros = useMemo(() => projection && profile ? calculateMacros(projection.daily_calories, profile.diet_type, profile) : null, [projection, profile]);
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



            {/* Micronutrients (USDA Focus) */}
            <Card>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-500" />
                    Micronutrientes Clave (USDA 2025)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(() => {
                        const targets = profile ? getMicronutrientTargets(
                            // We construct a mock 'conditions' array based on profile/goal if needed
                            // In a real app we would have a 'conditions' field in profile.
                            // For now we can infer basic ones or pass empty if unknown.
                            // Using mode/goal as proxy or if we had a medical_conditions field.
                            // Since we don't have explicit conditions in UserProfile yet, we pass empty
                            // but we pass age and gender for seniors/gender specific logic.
                            [],
                            profile.gender as 'M' | 'F',
                            profile.age
                        ) : null;

                        if (!targets) return null;

                        // Helper to format key names for display
                        const displayMap: Record<string, { label: string, desc: string }> = {
                            "fibra_g_per_1000kcal": { label: "Fibra", desc: "Salud Digestiva" }, // Need to calc total
                            "vit_d_iu": { label: "Vitamina D", desc: "Salud Ósea" },
                            "calcio_mg": { label: "Calcio", desc: "Huesos Fuertes" },
                            "hierro_mg": { label: "Hierro", desc: "Transporte O2" },
                            "colina_mg": { label: "Colina", desc: "Cerebro/Hígado" },
                            "yodo_mg": { label: "Yodo", desc: "Tiroides" },
                            "folato_mcg": { label: "Folato", desc: "División Celular" }
                        };

                        // Select top 3 most relevant based on presence
                        // Priority: Pregnancy specifics > Senior specifics > General
                        const keysToShow = [];
                        if (targets.hierro_mg !== 18 && targets.hierro_mg !== 8) keysToShow.push('hierro_mg'); // Show if different from std
                        if (targets.colina_mg) keysToShow.push('colina_mg');
                        if (targets.yodo_mg) keysToShow.push('yodo_mg');

                        // Fill remaining slots with defaults
                        if (keysToShow.length < 3) keysToShow.push('vit_d_iu');
                        if (keysToShow.length < 3) keysToShow.push('calcio_mg');
                        if (keysToShow.length < 3) keysToShow.push('fibra_g_per_1000kcal');

                        return keysToShow.slice(0, 3).map(key => {
                            const val = targets[key];
                            const meta = displayMap[key] || { label: key, desc: 'Nutriente' };

                            // Format value
                            let displayVal = `${val}`;
                            if (key === 'fibra_g_per_1000kcal') {
                                // Calc total fiber based on cal target
                                const totalFiber = Math.round((projection.daily_calories / 1000) * val);
                                displayVal = `${totalFiber}g`;
                            } else if (key.endsWith('mg')) {
                                displayVal += ' mg';
                            } else if (key.endsWith('iu')) {
                                displayVal += ' IU';
                            } else if (key.endsWith('mcg')) {
                                displayVal += ' µg';
                            }

                            return (
                                <div key={key} className="bg-gray-50 p-3 rounded-lg text-center">
                                    <div className="text-sm text-gray-500">{meta.label}</div>
                                    <div className="text-xl font-bold text-gray-800">{displayVal}</div>
                                    <div className="text-xs text-gray-400">{meta.desc}</div>
                                </div>
                            );
                        });
                    })()}
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

            {/* Meal Generator CTA */}
            <Card className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-bold mb-2">¿No sabes qué comer hoy?</h3>
                        <p className="text-purple-100">Genera un plan de 1 día adaptado a tus macros y objetivos automáticamenete.</p>
                    </div>
                    <button
                        onClick={() => router.push('/dashboard/meal-generator')}
                        className="px-6 py-3 bg-white text-purple-600 font-bold rounded-xl hover:bg-gray-100 transition-colors whitespace-nowrap"
                    >
                        Generar Menú
                    </button>
                </div>
            </Card>


        </motion.div>
    );
}
