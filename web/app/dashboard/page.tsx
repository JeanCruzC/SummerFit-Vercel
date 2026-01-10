"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Flame, Scale, Target, TrendingUp, UtensilsCrossed, Zap, Dumbbell } from "lucide-react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, StatCard, ProgressBar, Segmented, Chip, Alert, RingProgress, Button } from "@/components/ui";
import { getUserLocalDate } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import { getProfile, getWeightHistory, getMealEntries, getDailyLogsRange } from "@/lib/supabase/database";
import { getActiveWorkoutPlan } from "@/lib/supabase/exercises";
import { calculateHealthMetrics, calculateMacros, calculateProjectionWithExercise } from "@/lib/calculations";
import { getSupplementRecommendations } from "@/lib/supplements";
import { AdaptationEngine } from "@/lib/intelligence/adaptation_engine";
import { UserProfile, WorkoutPlan } from "@/types";

export default function DashboardPage() {
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<"conservador" | "moderado" | "acelerado">("moderado");
    const [range, setRange] = useState("hoy");
    const [todayMeals, setTodayMeals] = useState<any[]>([]);
    const [weightHistory, setWeightHistory] = useState<{ recorded_at: string; weight_kg: number }[]>([]);
    const [weekLogs, setWeekLogs] = useState<any[]>([]);
    const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();

                if (!session) {
                    router.push("/login");
                    return;
                }

                setUserId(session.user.id);

                const [profileData, weights, meals, logs, plan] = await Promise.all([
                    getProfile(session.user.id),
                    getWeightHistory(session.user.id, 14),
                    getMealEntries(session.user.id, getUserLocalDate()),
                    getDailyLogsRange(
                        session.user.id,
                        getUserLocalDate(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)), // Last 14 days
                        getUserLocalDate()
                    ),
                    getActiveWorkoutPlan(session.user.id),
                ]);

                // Check if onboarding is completed
                if (!profileData?.onboarding_completed) {
                    router.push("/onboarding");
                    return;
                }

                setProfile(profileData || getDefaultProfile(session.user.id));
                if (profileData?.goal_speed) {
                    setMode(profileData.goal_speed);
                }
                setWeightHistory(weights);
                setTodayMeals(meals);
                setWeekLogs(logs);
                setActivePlan(plan);
            } catch (error) {
                console.error("Failed to load dashboard data:", error);
                setError("No pudimos cargar tu información. Por favor intenta de nuevo.");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [router]);

    const getDefaultProfile = (uid: string): UserProfile => ({
        user_id: uid,
        gender: "M",
        age: 28,
        height_cm: 175,
        weight_kg: 78,
        target_weight_kg: 72,
        goal: "Definir",
        activity_level: "Moderado",
        diet_type: "Estándar",
    });

    const metrics = useMemo(() => {
        if (!profile) return null;
        return calculateHealthMetrics(profile, mode);
    }, [profile, mode]);

    const projection = useMemo(() => {
        if (!profile || !metrics) return null;
        return calculateProjectionWithExercise(
            profile.weight_kg,
            profile.target_weight_kg,
            metrics.tdee,
            metrics.bmr,
            profile.goal,
            profile.goal_speed || mode,
            activePlan?.estimated_calories_weekly || 0
        );
    }, [profile, metrics, mode, activePlan]);

    const macros = useMemo(() => {
        if (!projection || !profile) return null;
        return calculateMacros(projection.daily_calories, profile.diet_type);
    }, [projection, profile]);

    const todayTotals = useMemo(() => {
        return todayMeals.reduce((acc, m) => ({
            calories: acc.calories + (m.calories || 0),
            protein_g: acc.protein_g + (m.protein_g || 0),
            carbs_g: acc.carbs_g + (m.carbs_g || 0),
            fat_g: acc.fat_g + (m.fat_g || 0),
        }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
    }, [todayMeals]);

    const adherence = useMemo(() => {
        if (weekLogs.length === 0) return 0;
        const daysWithData = weekLogs.filter(l => l.calories_consumed > 0).length;
        return Math.round((daysWithData / 7) * 100);
    }, [weekLogs]);

    const weeklyChartData = useMemo(() => {
        const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
        return days.map((d, i) => ({
            d,
            kcal: weekLogs[i]?.calories_consumed || 0,
        }));
    }, [weekLogs]);

    // Phase 4: Adaptation Engine - Real-time weight progress alerts
    const adaptationAlerts = useMemo(() => {
        if (!profile || weightHistory.length < 2) return null;

        const formattedHistory = weightHistory.map(w => ({
            date: w.recorded_at,
            weight: w.weight_kg
        })).reverse(); // oldest first

        return AdaptationEngine.generateAdaptationPlan(
            profile,
            formattedHistory,
            [] // equipment array - empty for now
        );
    }, [profile, weightHistory]);

    if (loading || !profile || !metrics || !projection || !macros) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
                <div className="text-red-500 mb-4 text-4xl">⚠️</div>
                <h3 className="text-lg font-bold mb-2">Algo salió mal</h3>
                <p className="text-gray-500 mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>Reintentar</Button>
            </div>
        );
    }

    const remaining = projection.daily_calories - todayTotals.calories;

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Tu resumen diario de calorías, macros y progreso.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => router.push("/dashboard/profile")}>
                        Editar perfil
                    </Button>
                    <Button onClick={() => router.push("/dashboard/tracking")}>
                        <UtensilsCrossed className="h-4 w-4" /> Registrar
                    </Button>
                </div>
            </div>

            {/* Warnings */}
            {projection.warnings.length > 0 && (
                <Alert type="info">
                    <div className="font-semibold mb-1">💡 Recomendaciones</div>
                    {projection.warnings.map((w, i) => <p key={i}>{w}</p>)}
                </Alert>
            )}

            {/* Adaptation Alerts - Real-time weight progress feedback */}
            {adaptationAlerts && adaptationAlerts.triggers.length > 0 && (
                <Alert type={adaptationAlerts.priority === 'high' ? 'warning' : 'info'}>
                    <div className="font-semibold mb-2">🧠 Coach Inteligente</div>
                    <p className="text-sm mb-2">{adaptationAlerts.summary}</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                        {adaptationAlerts.triggers.map((t, i) => (
                            <li key={i}>{t.recommendation}</li>
                        ))}
                    </ul>
                </Alert>
            )}

            {/* Active Routine Widget */}
            {activePlan && (
                <Card className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white border-none relative overflow-hidden">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                                <Dumbbell className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">RUTINA ACTIVA</div>
                                <h3 className="text-xl font-bold">{activePlan.name}</h3>
                                <p className="text-sm text-zinc-400">{activePlan.days_per_week} días / semana</p>
                            </div>
                        </div>
                        <Button
                            onClick={() => router.push(`/dashboard/workout-plan/${activePlan.id}`)}
                            className="bg-white text-zinc-900 hover:bg-zinc-100 border-none font-bold px-6"
                        >
                            Ver Rutina
                        </Button>
                    </div>
                    {/* Abstract bg decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-32 pointer-events-none"></div>
                </Card>
            )}

            {/* Main Goal Card */}
            <Card>
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-semibold">Objetivo de hoy</h2>
                        <p className="text-sm text-gray-500">
                            Calorías restantes · Plan {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </p>
                    </div>
                    <Segmented
                        options={[
                            { label: "Hoy", value: "hoy" },
                            { label: "Semana", value: "semana" },
                            { label: "Mes", value: "mes" },
                        ]}
                        value={range}
                        onChange={setRange}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Calories */}
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 grid place-items-center">
                                <Flame className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <div className="text-sm text-gray-500">Objetivo diario</div>
                                <div className="text-4xl font-bold">{projection.daily_calories} <span className="text-lg font-normal text-gray-500">kcal</span></div>
                                {(projection.exercise_boost || 0) > 0 && (
                                    <div className="text-xs font-semibold text-purple-600 mt-1 flex items-center gap-1">
                                        <Zap className="h-3 w-3" />
                                        +{(projection.exercise_boost || 0)} kcal quemadas (extra)
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700">
                                <div className="text-xs text-gray-500">Consumidas</div>
                                <div className="text-lg font-semibold mt-1">{todayTotals.calories}</div>
                            </div>
                            <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700">
                                <div className="text-xs text-gray-500">Restantes</div>
                                <div className="text-lg font-semibold mt-1">{remaining}</div>
                            </div>
                            <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700">
                                <div className="text-xs text-gray-500">Déficit</div>
                                <div className="text-lg font-semibold mt-1">-{metrics.deficit_or_surplus}</div>
                            </div>
                        </div>

                        <ProgressBar value={todayTotals.calories} max={projection.daily_calories} />
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Chip color="purple">Plan: {mode}</Chip>
                            <Chip>Actividad: {profile.activity_level}</Chip>
                            <Chip>Dieta: {profile.diet_type}</Chip>
                        </div>
                    </div>

                    {/* Right: Mode selector */}
                    <div className="space-y-4">
                        <div className="text-sm text-gray-500">Velocidad de progreso</div>
                        <Segmented
                            options={[
                                { label: "Conservador", value: "conservador" },
                                { label: "Moderado", value: "moderado" },
                                { label: "Acelerado", value: "acelerado" },
                            ]}
                            value={mode}
                            onChange={(v) => setMode(v as any)}
                        />
                        <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Ritmo estimado</span>
                                <span className="text-lg font-semibold">{projection.weekly_rate} kg/sem</span>
                            </div>
                            <div className="mt-2 text-xs" style={{ color: projection.color }}>{projection.risk_msg}</div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard icon={<Scale className="h-5 w-5" />} label="Peso actual" value={`${profile.weight_kg} kg`} caption={`IMC: ${metrics.bmi} (${metrics.bmi_category})`} />
                <StatCard icon={<Target className="h-5 w-5" />} label="Meta" value={`${profile.target_weight_kg} kg`} caption={`Faltan ${Math.abs(profile.weight_kg - profile.target_weight_kg).toFixed(1)} kg`} />
                <StatCard icon={<Calendar className="h-5 w-5" />} label="Fecha objetivo" value={projection.target_date} caption={activePlan ? "📅 Meta acelerada con ejercicio" : `~${projection.weeks} semanas`} />
                <StatCard
                    icon={<Zap className="h-5 w-5" />}
                    label="TDEE"
                    value={`${(projection as any).effectiveTDEE || metrics.tdee} kcal`}
                    caption={activePlan ? `Base: ${metrics.tdee} + Ejercicio` : `TMB: ${metrics.bmr} kcal`}
                />
            </div>

            {/* Macros Card */}
            <Card>
                <h3 className="text-lg font-semibold mb-4">Macros de hoy</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-gray-500">Proteína</div>
                        <div className="text-2xl font-semibold mt-1">{todayTotals.protein_g} / {macros.protein_g} g</div>
                        <div className="mt-3"><ProgressBar value={todayTotals.protein_g} max={macros.protein_g} /></div>
                    </div>
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-gray-500">Carbohidratos</div>
                        <div className="text-2xl font-semibold mt-1">{todayTotals.carbs_g} / {macros.carbs_g} g</div>
                        <div className="mt-3"><ProgressBar value={todayTotals.carbs_g} max={macros.carbs_g} /></div>
                    </div>
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-gray-500">Grasas</div>
                        <div className="text-2xl font-semibold mt-1">{todayTotals.fat_g} / {macros.fat_g} g</div>
                        <div className="mt-3"><ProgressBar value={todayTotals.fat_g} max={macros.fat_g} /></div>
                    </div>
                </div>
            </Card>

            {/* Chart + Adherence */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                    <h3 className="text-lg font-semibold mb-4">Progreso semanal</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={weeklyChartData}>
                                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                                <XAxis dataKey="d" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Line type="monotone" dataKey="kcal" stroke="#a855f7" strokeWidth={2} dot={{ fill: "#a855f7" }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card>
                    <h3 className="text-lg font-semibold mb-4">Adherencia</h3>
                    <div className="flex flex-col items-center">
                        <div className="relative">
                            <RingProgress value={adherence} size={140} strokeWidth={12} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-bold">{adherence}%</span>
                                <span className="text-sm text-gray-500">esta semana</span>
                            </div>
                        </div>
                        <Button className="mt-6 w-full" onClick={() => router.push("/dashboard/tracking")}>
                            <UtensilsCrossed className="h-4 w-4" /> Registrar comida
                        </Button>
                    </div>
                </Card>
            </div>
        </motion.div>
    );
}
