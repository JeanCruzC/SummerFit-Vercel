"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Flame, Scale, Target, TrendingUp, UtensilsCrossed, Zap, Dumbbell, AlertTriangle, CheckCircle, Lightbulb, Brain, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, StatCard, ProgressBar, Segmented, Chip, Alert, RingProgress, Button } from "@/components/ui";
import { getUserLocalDate } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import { getProfile, getWeightHistory, getMealEntries, getDailyLogsRange } from "@/lib/supabase/database";
import { getActiveWorkoutPlan } from "@/lib/supabase/exercises";
import { calculateHealthMetrics, calculateMacros, calculateProjectionWithExercise, getDeficitWarnings, calculateBMI } from "@/lib/calculations";
import { getSupplementRecommendations } from "@/lib/supplements";
import { AdaptationEngine } from "@/lib/intelligence/adaptation_engine";
import { UserProfile, WorkoutPlan, DailyLog } from "@/types";
import { useLanguage } from "@/lib/i18n/context";

export default function DashboardPage() {
    const router = useRouter();
    const { t, lang } = useLanguage();
    const [userId, setUserId] = useState<string | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<"conservador" | "moderado" | "acelerado">("moderado");
    const [range, setRange] = useState("hoy");
    const [todayMeals, setTodayMeals] = useState<any[]>([]);
    const [weightHistory, setWeightHistory] = useState<{ recorded_at: string; weight_kg: number }[]>([]);
    const [historyLogs, setHistoryLogs] = useState<DailyLog[]>([]);
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
                    getWeightHistory(session.user.id, 30), // Fetch 30 days for chart/trends
                    getMealEntries(session.user.id, getUserLocalDate()),
                    getDailyLogsRange(
                        session.user.id,
                        getUserLocalDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), // Last 30 days for Month view
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
                setHistoryLogs(logs);
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

    // Check for Streak (after historyLogs is set)
    useEffect(() => {
        if (!userId || historyLogs.length === 0) return;

        const checkStreak = async () => {
            // 1. Calculate Streak
            const today = new Date();
            const dates = historyLogs.map(log => log.log_date.split('T')[0]).sort((a, b) => b.localeCompare(a));

            // Simple consecutive check
            let streak = 0;
            let currentCheckDate = new Date();

            // Check if today is logged
            const todayStr = currentCheckDate.toISOString().split('T')[0];
            const hasToday = dates.includes(todayStr);

            if (!hasToday) {
                // If not logged today, check yesterday to see if streak is alive
                currentCheckDate.setDate(currentCheckDate.getDate() - 1);
            }

            while (true) {
                const dateStr = currentCheckDate.toISOString().split('T')[0];
                if (dates.includes(dateStr)) {
                    streak++;
                    currentCheckDate.setDate(currentCheckDate.getDate() - 1);
                } else {
                    break;
                }
            }

            // 2. Trigger Rule: Milestone (3, 7, 14, 30...) AND Today Logged
            if (streak > 0 && hasToday && [3, 7, 14, 21, 30, 60, 90].includes(streak)) {
                const supabase = createClient();

                // 3. Check if already posted TODAY
                const { data: existing } = await supabase
                    .from("activity_feed")
                    .select("id")
                    .eq("user_id", userId)
                    .eq("type", "streak")
                    .gte("created_at", new Date().toISOString().split('T')[0]) // Created today
                    .maybeSingle();

                if (!existing) {
                    await supabase.from("activity_feed").insert({
                        user_id: userId,
                        type: 'streak',
                        content: `¡Racha en llamas! 🔥 He completado ${streak} días seguidos de actividad.`,
                        metadata: { streak_days: streak }
                    });
                    console.log("Streak posted:", streak);
                }
            }
        };

        checkStreak();
    }, [userId, historyLogs]);

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
        // Always use 'mode' from UI state (not profile.goal_speed) so it responds to toggle
        const result = calculateProjectionWithExercise(
            profile.weight_kg,
            profile.target_weight_kg,
            metrics.tdee,
            metrics.bmr,
            profile.goal,
            mode, // Use UI state directly
            activePlan?.estimated_calories_weekly || 0,
            profile.gender as 'M' | 'F'  // Pass gender for correct calorie floor
        );

        // Debug logging - remove after verification
        console.log('🔄 Projection recalculated:', {
            mode,
            tdee: metrics.tdee,
            daily_calories: result.daily_calories,
            weekly_rate: result.weekly_rate,
            weeks: result.weeks,
            target_date: result.target_date
        });

        return result;
    }, [profile, metrics, mode, activePlan]);

    const macros = useMemo(() => {
        if (!projection || !profile) return null;
        return calculateMacros(projection.daily_calories, profile.diet_type, profile);
    }, [projection, profile]);

    const todayTotals = useMemo(() => {
        return todayMeals.reduce((acc, m) => ({
            calories: acc.calories + (m.calories || 0),
            protein_g: acc.protein_g + (m.protein_g || 0),
            carbs_g: acc.carbs_g + (m.carbs_g || 0),
            fat_g: acc.fat_g + (m.fat_g || 0),
        }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
    }, [todayMeals]);

    // Derived state for time range aggregation
    const aggregatedMetrics = useMemo(() => {
        const days = range === 'hoy' ? 1 : range === 'semana' ? 7 : 30;
        const periodLabel = range === 'hoy' ? t('dates.today') : range === 'semana' ? t('dates.week') : t('dates.month');

        // Base calculations (always use these for targets/projections)
        const dailyTarget = projection?.daily_calories || 0;
        const dailyTDEE = projection?.effectiveTDEE || metrics?.tdee || 0;
        const plannedDailyDeficit = dailyTDEE - dailyTarget; // THIS is the correct deficit

        // Total targets for the period
        const targetCaloriesTotal = dailyTarget * days;
        const plannedDeficitTotal = plannedDailyDeficit * days;

        // ========== HOY ==========
        if (range === 'hoy') {
            const hasData = todayTotals.calories > 0;
            return {
                calories: todayTotals.calories,
                targetCalories: dailyTarget,
                protein: todayTotals.protein_g,
                targetProtein: macros?.protein_g || 0,
                carbs: todayTotals.carbs_g,
                targetCarbs: macros?.carbs_g || 0,
                fat: todayTotals.fat_g,
                targetFat: macros?.fat_g || 0,
                label: `${t('dashboard.target')} ${t('dates.today').toLowerCase()}`,
                subLabel: `Plan ${mode.charAt(0).toUpperCase() + mode.slice(1)}`,
                rateLabel: "Ritmo estimado",
                rateValue: projection?.weekly_rate || 0,
                deficit: plannedDailyDeficit, // CORRECT: This is the PLANNED deficit
                isProjected: !hasData,
                hasRealData: hasData
            };
        }

        // ========== SEMANA / MES ==========
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        cutoffDate.setHours(0, 0, 0, 0);

        const cutoffStr = getUserLocalDate(cutoffDate);
        const todayStr = getUserLocalDate();

        // Filter historical logs
        let validLogs = historyLogs.filter(l => l.log_date >= cutoffStr);

        // Include today's live data if not already in logs
        const todayLogExists = validLogs.some(l => l.log_date === todayStr);
        if (!todayLogExists && todayTotals.calories > 0 && profile) {
            validLogs = [...validLogs, {
                log_date: todayStr,
                calories_consumed: todayTotals.calories,
                protein_g: todayTotals.protein_g,
                carbs_g: todayTotals.carbs_g,
                fat_g: todayTotals.fat_g,
                calories_burned: 0,
                exercise_minutes: 0,
                user_id: profile.user_id
            }];
        }

        const hasData = validLogs.length > 0;

        // ---------- PROJECTED (No History) ----------
        if (!hasData) {
            return {
                calories: 0, // No data = No consumption
                targetCalories: targetCaloriesTotal,
                protein: 0,
                targetProtein: (macros?.protein_g || 0) * days,
                carbs: 0,
                targetCarbs: (macros?.carbs_g || 0) * days,
                fat: 0,
                targetFat: (macros?.fat_g || 0) * days,
                label: `Plan ${periodLabel}`,
                subLabel: `Proyección de ${days} días`,
                rateLabel: "Ritmo estimado",
                rateValue: projection?.weekly_rate || 0,
                deficit: plannedDeficitTotal, // CORRECT: Planned deficit for the period
                isProjected: true,
                hasRealData: false
            };
        }

        // ---------- REAL DATA (Has History) ----------
        const sums = validLogs.reduce((acc, log) => ({
            calories: acc.calories + log.calories_consumed,
            protein: acc.protein + log.protein_g,
            carbs: acc.carbs + log.carbs_g,
            fat: acc.fat + log.fat_g
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

        // Calculate Observed Rate from weight history
        let observedRate = projection?.weekly_rate || 0;
        const weightsInRange = weightHistory
            .filter(w => new Date(w.recorded_at) >= cutoffDate)
            .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

        if (weightsInRange.length >= 2) {
            const first = weightsInRange[0];
            const last = weightsInRange[weightsInRange.length - 1];
            const weeksDiff = (new Date(last.recorded_at).getTime() - new Date(first.recorded_at).getTime()) / (1000 * 60 * 60 * 24 * 7);
            if (weeksDiff > 0.1) {
                observedRate = Number(((first.weight_kg - last.weight_kg) / weeksDiff).toFixed(2));
            }
        }

        // Real deficit = TDEE total - Consumed total
        const realDeficit = (dailyTDEE * days) - sums.calories;

        return {
            calories: sums.calories,
            targetCalories: targetCaloriesTotal,
            protein: sums.protein,
            targetProtein: (macros?.protein_g || 0) * days,
            carbs: sums.carbs,
            targetCarbs: (macros?.carbs_g || 0) * days,
            fat: sums.fat,
            targetFat: (macros?.fat_g || 0) * days,
            label: `Total ${periodLabel}`,
            subLabel: `${validLogs.length} días registrados`,
            rateLabel: "Ritmo observado",
            rateValue: observedRate,
            deficit: realDeficit, // When we have data, show actual deficit achieved
            isProjected: false,
            hasRealData: true
        };
    }, [range, todayTotals, historyLogs, projection, mode, weightHistory, profile, macros, metrics]);

    const adherence = useMemo(() => {
        // Use last 7 days for adherence score
        const recentLogs = historyLogs.slice(-7);
        if (recentLogs.length === 0) return 0;
        const daysWithData = recentLogs.filter(l => l.calories_consumed > 0).length;
        // Normalize adherence to 7 days
        return Math.round((daysWithData / 7) * 100);
    }, [historyLogs]);

    const weeklyChartData = useMemo(() => {
        // Map last 7 days
        const data = [];
        const daysMap = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = getUserLocalDate(d); // YYYY-MM-DD
            const log = historyLogs.find(l => l.log_date === dateStr);
            data.push({
                d: daysMap[d.getDay()],
                kcal: log?.calories_consumed || 0
            });
        }
        return data;
    }, [historyLogs]);

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

    // Scientific deficit warnings (ACSM/ISSN/NIH based)
    const deficitWarnings = useMemo(() => {
        if (!profile || !projection) return [];
        const bmi = calculateBMI(profile.weight_kg, profile.height_cm);
        const hasStrengthTraining = !!activePlan; // Assume they have training if they have a plan
        return getDeficitWarnings(
            mode,
            projection.daily_calories,
            profile.gender as 'M' | 'F',
            bmi,
            hasStrengthTraining
        );
    }, [profile, projection, mode, activePlan]);

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
                    <h1 className="text-3xl font-bold">{t('nav.dashboard')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {lang === 'es' ? 'Tu resumen diario de calorías, macros y progreso.' : 'Your daily summary of calories, macros, and progress.'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => router.push("/dashboard/profile")}>
                        {t('common.edit')} {t('nav.profile')}
                    </Button>
                    <Button onClick={() => router.push("/dashboard/tracking")}>
                        <UtensilsCrossed className="h-4 w-4" /> {t('common.add')}
                    </Button>
                </div>
            </div>

            {/* Unified Smart Coach Insights */}
            {(deficitWarnings.length > 0 || projection.warnings.length > 0 || (adaptationAlerts && adaptationAlerts.triggers.length > 0)) && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden mb-6">
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-white dark:from-purple-900/20 dark:to-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        <h3 className="font-bold text-gray-900 dark:text-white">Smart Coach Insights</h3>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                            {deficitWarnings.length + projection.warnings.length + (adaptationAlerts?.triggers.length || 0)} tips
                        </span>
                    </div>

                    <div className="p-2 grid grid-cols-1 gap-1">
                        {/* 1. Deficit Warnings */}
                        {deficitWarnings.map((warning, i) => {
                            const isPositive = warning.includes('toleran mejor');
                            const isStrength = warning.includes('fuerza');
                            const isWarning = warning.includes('agresivo') || warning.includes('mínimo seguro');

                            return (
                                <div key={`def-${i}`} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors flex gap-3 items-start">
                                    <div className="flex-shrink-0 mt-0.5">
                                        {isPositive && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                                        {isStrength && <Dumbbell className="h-5 w-5 text-blue-500" />}
                                        {isWarning && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                                        {!isPositive && !isStrength && !isWarning && <Lightbulb className="h-5 w-5 text-purple-500" />}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                        {warning}
                                    </div>
                                </div>
                            );
                        })}

                        {/* 2. Projection Recommendations */}
                        {projection.warnings.map((w, i) => (
                            <div key={`proj-${i}`} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors flex gap-3 items-start">
                                <TrendingUp className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                    {w}
                                </div>
                            </div>
                        ))}

                        {/* 3. Adaptation Alerts */}
                        {adaptationAlerts && adaptationAlerts.triggers.map((t, i) => (
                            <div key={`adapt-${i}`} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors flex gap-3 items-start">
                                <Brain className="h-5 w-5 text-sky-500 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                    {t.recommendation}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
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
                                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">{t('dashboard.yourRoutine')}</div>
                                <h3 className="text-xl font-bold">{activePlan.name}</h3>
                                <p className="text-sm text-zinc-400">{activePlan.days_per_week} {t('dashboard.days')} / {t('dates.week').toLowerCase()}</p>
                            </div>
                        </div>
                        <Button
                            onClick={() => router.push(`/dashboard/workout-plan/${activePlan.id}`)}
                            className="bg-white text-zinc-900 hover:bg-zinc-100 border-none font-bold px-6"
                        >
                            {t('dashboard.viewRoutine')}
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
                        <h2 className="text-xl font-semibold">{aggregatedMetrics.label}</h2>
                        <p className="text-sm text-gray-500">
                            {aggregatedMetrics.subLabel}
                        </p>
                    </div>
                    <Segmented
                        options={[
                            { label: t('dates.today'), value: "hoy" },
                            { label: t('dates.week'), value: "semana" },
                            { label: t('dates.month'), value: "mes" },
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
                                <div className="text-sm text-gray-500 font-medium">
                                    {range === 'hoy' ? t('dashboard.dailySummary') : `${t('dashboard.goals')} ${range === 'semana' ? t('dates.week') : t('dates.month')}`}
                                </div>
                                <div className="text-4xl font-extrabold text-zinc-900 dark:text-white mt-1">
                                    {aggregatedMetrics.targetCalories}
                                    <span className="text-lg font-normal text-gray-500 ml-1">kcal</span>
                                </div>
                                {/* Only show consumption if we have real data */}
                                {aggregatedMetrics.hasRealData ? (
                                    <div className="text-sm text-gray-400 mt-1 font-medium">
                                        {range === 'hoy' ? t('dashboard.consumed') : t('dashboard.consumed')}:
                                        <span className={aggregatedMetrics.calories > aggregatedMetrics.targetCalories ? " text-red-500" : " text-green-500"}>
                                            {aggregatedMetrics.calories}
                                        </span> kcal
                                    </div>
                                ) : (
                                    <div className="text-xs text-gray-400 mt-1 italic">
                                        Projection - no data
                                    </div>
                                )}
                                {(projection.exercise_boost || 0) > 0 && range === 'hoy' && (
                                    <div className="text-xs font-semibold text-purple-600 mt-1 flex items-center gap-1">
                                        <Zap className="h-3 w-3" />
                                        +{(projection.exercise_boost || 0)} kcal {t('dashboard.caloriesBurned').toLowerCase()} (extra)
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-4">
                            {/* Card 1: Consumidas/Meta - changes based on data availability */}
                            <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700">
                                <div className="text-xs text-gray-500">
                                    {aggregatedMetrics.hasRealData ? (range === 'hoy' ? t('dashboard.consumed') : t('dashboard.consumed')) : t('dashboard.goals')}
                                </div>
                                <div className="text-lg font-semibold mt-1">
                                    {aggregatedMetrics.hasRealData ? aggregatedMetrics.calories : aggregatedMetrics.targetCalories}
                                </div>
                            </div>
                            {/* Card 2: Restantes - only show if has data, otherwise show TDEE */}
                            <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700">
                                <div className="text-xs text-gray-500">
                                    {aggregatedMetrics.hasRealData ? t('dashboard.remaining') : 'TDEE'}
                                </div>
                                <div className="text-lg font-semibold mt-1">
                                    {aggregatedMetrics.hasRealData
                                        ? Math.max(0, aggregatedMetrics.targetCalories - aggregatedMetrics.calories)
                                        : Math.round((projection.effectiveTDEE || metrics.tdee) * (range === 'hoy' ? 1 : range === 'semana' ? 7 : 30))
                                    }
                                </div>
                            </div>
                            {/* Card 3: Déficit - always show the PLANNED deficit */}
                            <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700">
                                <div className="text-xs text-gray-500">
                                    Déficit
                                </div>
                                <div className="text-lg font-semibold mt-1">
                                    {Math.round(aggregatedMetrics.deficit)}
                                </div>
                            </div>
                        </div>

                        <ProgressBar
                            value={aggregatedMetrics.hasRealData ? aggregatedMetrics.calories : 0}
                            max={aggregatedMetrics.targetCalories}
                            color="purple"
                        />

                        <div className="flex items-center gap-2 mt-4">
                            <Chip color="purple">Plan: {mode}</Chip>
                            <Chip color="gray">Actividad: {profile.activity_level}</Chip>
                            <Chip color="gray">Dieta: {profile.diet_type}</Chip>
                        </div>
                    </div>

                    {/* Right: Progress & Rate */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <div className="text-sm text-gray-500 mb-1">Velocidad de progreso</div>
                                <Segmented
                                    options={[
                                        { label: "Conservador", value: "conservador" },
                                        { label: "Moderado", value: "moderado" },
                                        { label: "Acelerado", value: "acelerado" },
                                    ]}
                                    value={mode}
                                    onChange={(v) => setMode(v as any)}
                                />
                            </div>
                        </div>

                        <div className="flex items-end justify-between mb-2">
                            <div>
                                <div className="text-sm text-gray-500 mb-1">{aggregatedMetrics.rateLabel}</div>
                                <div className="text-3xl font-bold">{aggregatedMetrics.rateValue} <span className="text-base font-normal text-gray-500">kg/sem</span></div>
                            </div>
                        </div>

                        {aggregatedMetrics.isProjected ? (
                            <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> Ritmo saludable y sostenible
                            </div>
                        ) : (
                            <div className="text-xs text-zinc-500 font-medium flex items-center gap-1">
                                <Scale className="h-3 w-3" /> Basado en tu historial de peso
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard icon={<Scale className="h-5 w-5" />} label={t('profile.weight')} value={`${profile.weight_kg} kg`} caption={`IMC: ${metrics.bmi} (${metrics.bmi_category})`} />
                <StatCard icon={<Target className="h-5 w-5" />} label={t('dashboard.target')} value={`${profile.target_weight_kg} kg`} caption={`Diff: ${Math.abs(profile.weight_kg - profile.target_weight_kg).toFixed(1)} kg`} />
                <StatCard icon={<Calendar className="h-5 w-5" />} label="Fecha objetivo" value={projection.target_date} caption={activePlan ? "📅 Meta acelerada" : `~${projection.weeks} ${t('dates.week').toLowerCase()}`} />
                <StatCard
                    icon={<Zap className="h-5 w-5" />}
                    label="TDEE"
                    value={`${(projection as any).effectiveTDEE || metrics.tdee} kcal`}
                    caption={activePlan ? `Base: ${metrics.tdee} + ${t('nav.exercises')}` : `TMB: ${metrics.bmr} kcal`}
                />
            </div>

            {/* Macros Card */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Macros ({range === 'hoy' ? t('dates.today') : 'prom'})</h3>
                    <span className="text-xs font-medium px-2 py-1 bg-purple-50 text-purple-700 rounded-lg border border-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
                        {profile.diet_type}
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-1">
                            <div className="text-sm text-gray-500">{t('nutrition.protein')}</div>
                            <div className="text-xs text-gray-400">{t('dashboard.goals')}: {macros.protein_g}g</div>
                        </div>
                        <div className="text-2xl font-semibold">{aggregatedMetrics.protein} g</div>
                        <div className="mt-2"><ProgressBar value={aggregatedMetrics.protein} max={macros.protein_g} color="purple" /></div>
                    </div>
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-1">
                            <div className="text-sm text-gray-500">{t('nutrition.carbs')}</div>
                            <div className="text-xs text-gray-400">{t('dashboard.goals')}: {macros.carbs_g}g</div>
                        </div>
                        <div className="text-2xl font-semibold">{aggregatedMetrics.carbs} g</div>
                        <div className="mt-2"><ProgressBar value={aggregatedMetrics.carbs} max={macros.carbs_g} color="purple" /></div>
                    </div>
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-1">
                            <div className="text-sm text-gray-500">{t('nutrition.fat')}</div>
                            <div className="text-xs text-gray-400">{t('dashboard.goals')}: {macros.fat_g}g</div>
                        </div>
                        <div className="text-2xl font-semibold">{aggregatedMetrics.fat} g</div>
                        <div className="mt-2"><ProgressBar value={aggregatedMetrics.fat} max={macros.fat_g} color="purple" /></div>
                    </div>
                </div>
            </Card>

            {/* Chart + Adherence */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                    <h3 className="text-lg font-semibold mb-4">{t('dashboard.weeklyProgress')}</h3>
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
                    <h3 className="text-lg font-semibold mb-4">Adherence {t('dates.week')}</h3>
                    <div className="flex flex-col items-center">
                        <div className="relative">
                            <RingProgress value={adherence} size={140} strokeWidth={12} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-bold">{adherence}%</span>
                                <span className="text-sm text-gray-500">{t('dates.week')}</span>
                            </div>
                        </div>
                        <Button className="mt-6 w-full" onClick={() => router.push("/dashboard/tracking")}>
                            <UtensilsCrossed className="h-4 w-4" /> {t('dashboard.logFood')}
                        </Button>
                    </div>
                </Card>
            </div >
        </motion.div >
    );
}
